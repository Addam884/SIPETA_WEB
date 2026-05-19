<?php
// app/Http/Controllers/GisController.php
namespace App\Http\Controllers;

use App\Models\HasilClustering;
use App\Models\Kasus;
use App\Models\Faskes;
use App\Models\Populasi;
use App\Services\KMeansService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GisController extends Controller
{
    public function __construct(protected KMeansService $kmeans) {}

    // ─── 1. NEW: GeoJSON dengan default clustering (total semua penyakit) ───
    // GET /api/gis/geojson/default-clustering?periode=2024-01
    public function defaultClusteringGeoJson(Request $request)
    {
        $periode = $request->input('periode', now()->format('Y-m'));

        // Ambil semua wilayah dengan geometry
        $wilayahList = DB::table('wilayah')
            ->selectRaw("id, nama_wilayah, level, ST_AsGeoJSON(geom)::json AS geojson")
            ->whereNotNull('geom')
            ->get();

        // Hitung total kasus per wilayah untuk SEMUA penyakit di periode ini
        $kasusPerWilayah = DB::table('kasus')
            ->selectRaw('wilayah_id, COUNT(*) as total_kasus')
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('wilayah_id')
            ->get()
            ->pluck('total_kasus', 'wilayah_id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        if (empty($kasusPerWilayah)) {
            // Jika tidak ada data, kembalikan GeoJSON tanpa clustering
            return $this->generateEmptyGeoJson($wilayahList);
        }

        // Jalankan K-Means untuk total kasus (semua penyakit)
        $k = 3; // default
        $result = $this->kmeans->run($kasusPerWilayah, $k);
        $dbi = $this->kmeans->daviesBouldin($kasusPerWilayah, $result['assignments'], $result['centroids']);

        // Simpan hasil clustering default (penyakit_id = NULL untuk default)
        $periodeDate = $periode . '-01';
        
        // Hapus hasil clustering default lama
        HasilClustering::whereNull('penyakit_id')
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->delete();

        // Simpan hasil baru dengan penyakit_id = NULL
        foreach ($result['assignments'] as $wilayahId => $clusterId) {
            HasilClustering::create([
                'wilayah_id'   => $wilayahId,
                'penyakit_id'  => null, // NULL menandakan default clustering
                'periode'      => $periodeDate,
                'cluster_id'   => $clusterId,
                'jumlah_kasus' => $kasusPerWilayah[$wilayahId],
                'centroid'     => $result['centroids'][$clusterId],
            ]);
        }

        // Buat GeoJSON dengan warna cluster
        $clusterMap = HasilClustering::whereNull('penyakit_id')
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->get()
            ->keyBy('wilayah_id');

        $features = $this->buildGeoJsonFeatures($wilayahList, $clusterMap, $kasusPerWilayah);

        return response()->json([
            'geojson' => [
                'type' => 'FeatureCollection',
                'features' => $features,
            ],
            'k' => $k,
            'davies_bouldin' => round($dbi, 4),
            'summary' => [
                'Rendah' => count(array_filter($result['assignments'], fn($v) => $v === 0)),
                'Sedang' => count(array_filter($result['assignments'], fn($v) => $v === 1)),
                'Tinggi' => count(array_filter($result['assignments'], fn($v) => $v === 2)),
            ],
        ]);
    }

    // ─── 2. MODIFIED: GeoJSON wilayah + warna cluster (dengan penyakit optional) ──
    // GET /api/gis/geojson?penyakit_id=&periode=2024-01
    public function geojson(Request $request)
    {
        $penyakitId = $request->input('penyakit_id');
        $periode    = $request->input('periode', now()->format('Y-m'));

        // Ambil semua wilayah dengan geometry
        $wilayahList = DB::table('wilayah')
            ->selectRaw("id, nama_wilayah, level, ST_AsGeoJSON(geom)::json AS geojson")
            ->whereNotNull('geom')
            ->get();

        // Jika tidak ada penyakit_id, gunakan default clustering
        if (!$penyakitId) {
            return $this->defaultClusteringGeoJson($request);
        }

        // Ambil hasil clustering untuk periode & penyakit tsb
        $clusterMap = HasilClustering::query()
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->where('penyakit_id', $penyakitId)
            ->get()
            ->keyBy('wilayah_id');

        // Hitung kasus per wilayah untuk penyakit spesifik
        $kasusPerWilayah = DB::table('kasus')
            ->selectRaw('wilayah_id, COUNT(*) as total_kasus')
            ->where('penyakit_id', $penyakitId)
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('wilayah_id')
            ->get()
            ->pluck('total_kasus', 'wilayah_id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $features = $this->buildGeoJsonFeatures($wilayahList, $clusterMap, $kasusPerWilayah);

        // Jika clustering belum ada untuk penyakit ini, jalankan otomatis
        $clusteringInfo = null;
        if ($clusterMap->isEmpty() && !empty($kasusPerWilayah)) {
            // Jalankan clustering otomatis
            $k = 3;
            $result = $this->kmeans->run($kasusPerWilayah, $k);
            $dbi = $this->kmeans->daviesBouldin($kasusPerWilayah, $result['assignments'], $result['centroids']);
            
            $periodeDate = $periode . '-01';
            
            // Simpan hasil
            foreach ($result['assignments'] as $wilayahId => $clusterId) {
                HasilClustering::updateOrCreate(
                    [
                        'wilayah_id' => $wilayahId,
                        'penyakit_id' => $penyakitId,
                        'periode' => $periodeDate,
                    ],
                    [
                        'cluster_id' => $clusterId,
                        'jumlah_kasus' => $kasusPerWilayah[$wilayahId],
                        'centroid' => $result['centroids'][$clusterId],
                    ]
                );
            }
            
            $clusteringInfo = [
                'k' => $k,
                'davies_bouldin' => round($dbi, 4),
                'summary' => [
                    'Rendah' => count(array_filter($result['assignments'], fn($v) => $v === 0)),
                    'Sedang' => count(array_filter($result['assignments'], fn($v) => $v === 1)),
                    'Tinggi' => count(array_filter($result['assignments'], fn($v) => $v === 2)),
                ],
            ];
        } else if (!$clusterMap->isEmpty()) {
            // Ambil info clustering dari data yang ada
            $clusters = HasilClustering::where('penyakit_id', $penyakitId)
                ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
                ->get();
            
            $clusteringInfo = [
                'k' => 3,
                'davies_bouldin' => null,
                'summary' => [
                    'Rendah' => $clusters->where('cluster_id', 0)->count(),
                    'Sedang' => $clusters->where('cluster_id', 1)->count(),
                    'Tinggi' => $clusters->where('cluster_id', 2)->count(),
                ],
            ];
        }

        return response()->json([
            'geojson' => [
                'type' => 'FeatureCollection',
                'features' => $features,
            ],
            'clustering_info' => $clusteringInfo,
        ]);
    }

    // ─── Helper: Build GeoJSON Features ──────────────────────────────────────
    private function buildGeoJsonFeatures($wilayahList, $clusterMap, $kasusPerWilayah)
    {
        $colors = [0 => '#86efac', 1 => '#fde68a', 2 => '#fca5a5'];
        
        return $wilayahList->map(function ($w) use ($clusterMap, $kasusPerWilayah, $colors) {
            $cluster = $clusterMap->get($w->id);
            $cId = $cluster?->cluster_id ?? null;
            $jumlahKasus = $kasusPerWilayah[$w->id] ?? 0;
            
            return [
                'type' => 'Feature',
                'geometry' => json_decode($w->geojson),
                'properties' => [
                    'id' => $w->id,
                    'wilayah_id' => $w->id,
                    'nama_wilayah' => $w->nama_wilayah,
                    'nama_faskes' => null,
                    'jumlah_kasus' => $jumlahKasus,
                    'cluster_id' => $cId,
                    'cluster_label' => $cId !== null ? ['Rendah', 'Sedang', 'Tinggi'][$cId] : 'Belum diproses',
                    'cluster_color' => $cId !== null ? $colors[$cId] : '#e5e7eb',
                    'centroid' => $cluster?->centroid,
                ],
            ];
        })->toArray();
    }

    // ─── Helper: Generate Empty GeoJson ──────────────────────────────────────
    private function generateEmptyGeoJson($wilayahList)
    {
        $features = $wilayahList->map(function ($w) {
            return [
                'type' => 'Feature',
                'geometry' => json_decode($w->geojson),
                'properties' => [
                    'id' => $w->id,
                    'wilayah_id' => $w->id,
                    'nama_wilayah' => $w->nama_wilayah,
                    'nama_faskes' => null,
                    'jumlah_kasus' => 0,
                    'cluster_id' => null,
                    'cluster_label' => 'Tidak ada data',
                    'cluster_color' => '#e5e7eb',
                    'centroid' => null,
                ],
            ];
        })->toArray();

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    // ─── 3. NEW: Jalankan K-Means untuk default clustering ────────────────────
    // POST /api/gis/clustering/run-default
    public function runDefaultClustering(Request $request)
    {
        $request->validate([
            'periode' => 'required|date_format:Y-m',
            'k'       => 'integer|min:2|max:5',
        ]);

        $periode = $request->periode;
        $k       = $request->input('k', 3);

        // Ambil total kasus per wilayah untuk semua penyakit
        $rows = DB::table('kasus')
            ->selectRaw('wilayah_id, COUNT(*) AS jumlah_kasus')
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('wilayah_id')
            ->get()
            ->pluck('jumlah_kasus', 'wilayah_id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        if (empty($rows)) {
            return response()->json([
                'message' => 'Tidak ada data kasus untuk periode tersebut',
            ], 404);
        }

        // Jalankan K-Means
        $result = $this->kmeans->run($rows, $k);
        $dbi    = $this->kmeans->daviesBouldin($rows, $result['assignments'], $result['centroids']);

        // Hapus hasil clustering default lama (penyakit_id = NULL)
        HasilClustering::whereNull('penyakit_id')
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->delete();

        // Simpan hasil baru
        $periodeDate = $periode . '-01';
        foreach ($result['assignments'] as $wilayahId => $clusterId) {
            HasilClustering::create([
                'wilayah_id'   => $wilayahId,
                'penyakit_id'  => null,
                'periode'      => $periodeDate,
                'cluster_id'   => $clusterId,
                'jumlah_kasus' => $rows[$wilayahId],
                'centroid'     => $result['centroids'][$clusterId],
            ]);
        }

        return response()->json([
            'message'        => "Default clustering selesai: {$result['iterations']} iterasi",
            'k'              => $k,
            'total_wilayah'  => count($result['assignments']),
            'centroids'      => $result['centroids'],
            'davies_bouldin' => round($dbi, 4),
            'summary'        => [
                'Rendah'  => count(array_filter($result['assignments'], fn($v) => $v === 0)),
                'Sedang'  => count(array_filter($result['assignments'], fn($v) => $v === 1)),
                'Tinggi'  => count(array_filter($result['assignments'], fn($v) => $v === 2)),
            ],
        ]);
    }

    // ─── 4. NEW: Hasil default clustering ────────────────────────────────────
    // GET /api/gis/clustering/result-default?periode=
    public function defaultClusteringResult(Request $request)
    {
        $periode = $request->input('periode', now()->format('Y-m'));

        $hasil = HasilClustering::with(['wilayah'])
            ->whereNull('penyakit_id')
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->orderBy('cluster_id', 'desc')
            ->orderBy('jumlah_kasus', 'desc')
            ->get()
            ->map(fn($h) => [
                'wilayah_id'    => $h->wilayah_id,
                'nama_wilayah'  => $h->wilayah?->nama_wilayah,
                'penyakit'      => 'Semua Penyakit',
                'jumlah_kasus'  => $h->jumlah_kasus,
                'cluster_id'    => $h->cluster_id,
                'cluster_label' => ['Rendah', 'Sedang', 'Tinggi'][$h->cluster_id] ?? '-',
                'centroid'      => round($h->centroid, 2),
            ]);

        return response()->json($hasil);
    }

    // ─── 5. MODIFIED: Jalankan K-Means untuk penyakit spesifik ────────────────
    // POST /api/gis/clustering/run
    public function runClustering(Request $request)
    {
        $request->validate([
            'penyakit_id' => 'required|exists:penyakit,id',
            'periode'     => 'required|date_format:Y-m',
            'k'           => 'integer|min:2|max:5',
        ]);

        $penyakitId = $request->penyakit_id;
        $periode    = $request->periode;
        $k          = $request->input('k', 3);

        // Ambil jumlah kasus per wilayah untuk periode & penyakit
        $rows = DB::table('kasus')
            ->selectRaw('wilayah_id, COUNT(*) AS jumlah_kasus')
            ->where('penyakit_id', $penyakitId)
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('wilayah_id')
            ->get()
            ->pluck('jumlah_kasus', 'wilayah_id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        if (empty($rows)) {
            return response()->json([
                'message' => 'Tidak ada data kasus untuk periode dan penyakit tersebut',
            ], 404);
        }

        // Jalankan K-Means
        $result = $this->kmeans->run($rows, $k);
        $dbi    = $this->kmeans->daviesBouldin($rows, $result['assignments'], $result['centroids']);

        // Hapus hasil clustering lama untuk periode + penyakit ini
        HasilClustering::where('penyakit_id', $penyakitId)
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->delete();

        // Simpan hasil baru
        $periodeDate = $periode . '-01';
        foreach ($result['assignments'] as $wilayahId => $clusterId) {
            HasilClustering::create([
                'wilayah_id'   => $wilayahId,
                'penyakit_id'  => $penyakitId,
                'periode'      => $periodeDate,
                'cluster_id'   => $clusterId,
                'jumlah_kasus' => $rows[$wilayahId],
                'centroid'     => $result['centroids'][$clusterId],
            ]);
        }

        return response()->json([
            'message'        => "Clustering selesai: {$result['iterations']} iterasi",
            'k'              => $k,
            'total_wilayah'  => count($result['assignments']),
            'centroids'      => $result['centroids'],
            'davies_bouldin' => round($dbi, 4),
            'summary'        => [
                'Rendah'  => count(array_filter($result['assignments'], fn($v) => $v === 0)),
                'Sedang'  => count(array_filter($result['assignments'], fn($v) => $v === 1)),
                'Tinggi'  => count(array_filter($result['assignments'], fn($v) => $v === 2)),
            ],
        ]);
    }

    // ─── 7. MODIFIED: Hasil clustering dengan filter penyakit ─────────────────
    // GET /api/gis/clustering/result?penyakit_id=&periode=
    public function clusteringResult(Request $request)
    {
        $penyakitId = $request->input('penyakit_id');
        $periode    = $request->input('periode', now()->format('Y-m'));

        $query = HasilClustering::with(['wilayah', 'penyakit'])
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode]);
        
        if ($penyakitId) {
            $query->where('penyakit_id', $penyakitId);
        } else {
            $query->whereNull('penyakit_id');
        }
        
        $hasil = $query->orderBy('cluster_id', 'desc')
            ->orderBy('jumlah_kasus', 'desc')
            ->get()
            ->map(fn($h) => [
                'wilayah_id'    => $h->wilayah_id,
                'nama_wilayah'  => $h->wilayah?->nama_wilayah,
                'penyakit'      => $h->penyakit?->nama_penyakit ?? 'Semua Penyakit',
                'jumlah_kasus'  => $h->jumlah_kasus,
                'cluster_id'    => $h->cluster_id,
                'cluster_label' => ['Rendah','Sedang','Tinggi'][$h->cluster_id] ?? '-',
                'centroid'      => round($h->centroid, 2),
            ]);

        return response()->json($hasil);
    }

    // ─── 8. Sisanya tetap sama (faskes, detail, trend, epidemiologi) ──────────
    
    // GET /api/gis/faskes
    public function faskes(Request $request)
    {
        $faskesRows = DB::table('fasilitas_kesehatan AS f')
            ->selectRaw("
                f.id, f.nama_faskes, f.wilayah_id, w.nama_wilayah,
                ST_X(f.geom) AS longitude,
                ST_Y(f.geom) AS latitude
            ")
            ->leftJoin('wilayah AS w', 'w.id', '=', 'f.wilayah_id')
            ->whereNotNull('f.geom')
            ->get();

        $features = $faskesRows->map(fn($f) => [
            'type'       => 'Feature',
            'geometry'   => ['type' => 'Point', 'coordinates' => [$f->longitude, $f->latitude]],
            'properties' => [
                'id'           => $f->id,
                'nama_faskes'  => $f->nama_faskes,
                'wilayah_id'   => $f->wilayah_id,
                'nama_wilayah' => $f->nama_wilayah,
            ],
        ]);

        return response()->json(['type' => 'FeatureCollection', 'features' => $features]);
    }

    // GET /api/gis/faskes/{id}/detail
    public function faskesDetail(Request $request, int $id)
    {
        $periode = $request->input('periode', now()->format('Y-m'));

        $faskes = DB::table('fasilitas_kesehatan AS f')
            ->selectRaw("f.id, f.nama_faskes, w.nama_wilayah, ST_X(f.geom) AS longitude, ST_Y(f.geom) AS latitude, f.wilayah_id")
            ->leftJoin('wilayah AS w', 'w.id', '=', 'f.wilayah_id')
            ->where('f.id', $id)
            ->first();

        if (!$faskes) return response()->json(['message' => 'Faskes tidak ditemukan'], 404);

        $populasi = DB::table('populasi')
            ->where('wilayah_id', $faskes->wilayah_id)
            ->orderByDesc('tahun')
            ->value('jumlah') ?? 0;

        $totalKasus = Kasus::where('faskes_id', $id)
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->count();

        $kasusByPenyakit = DB::table('kasus AS k')
            ->join('penyakit AS p', 'p.id', '=', 'k.penyakit_id')
            ->selectRaw("p.nama_penyakit, p.kode_icd, COUNT(*) as total")
            ->where('k.faskes_id', $id)
            ->whereRaw("TO_CHAR(k.tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('p.id', 'p.nama_penyakit', 'p.kode_icd')
            ->orderByDesc('total')
            ->get();

        $ir = $populasi > 0 ? round(($totalKasus / $populasi) * 10000, 2) : 0;
        $meninggal = Kasus::where('faskes_id', $id)
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->where('status', 'Meninggal')
            ->count();
        $cfr = $totalKasus > 0 ? round(($meninggal / $totalKasus) * 100, 2) : 0;
        $prevalence = $populasi > 0 ? round(($totalKasus / $populasi) * 10000, 2) : 0;

        return response()->json([
            'id'                => $faskes->id,
            'nama_faskes'       => $faskes->nama_faskes,
            'nama_wilayah'      => $faskes->nama_wilayah,
            'latitude'          => $faskes->latitude,
            'longitude'         => $faskes->longitude,
            'populasi'          => $populasi,
            'total_kasus'       => $totalKasus,
            'ir'                => $ir,
            'cfr'               => $cfr,
            'prevalence'        => $prevalence,
            'kasus_by_penyakit' => $kasusByPenyakit,
        ]);
    }

    // GET /api/gis/trend
    public function trend(Request $request)
    {
        $tahun      = $request->input('tahun', now()->year);
        $penyakitId = $request->input('penyakit_id');
        $wilayahId  = $request->input('wilayah_id');

        $rows = DB::table('kasus AS k')
            ->join('penyakit AS p', 'p.id', '=', 'k.penyakit_id')
            ->selectRaw("
                TO_CHAR(k.tanggal_kasus, 'Mon') AS bulan_label,
                EXTRACT(MONTH FROM k.tanggal_kasus)::int AS bulan_num,
                p.nama_penyakit,
                COUNT(*) AS total
            ")
            ->whereRaw("EXTRACT(YEAR FROM k.tanggal_kasus) = ?", [$tahun])
            ->when($penyakitId, fn($q) => $q->where('k.penyakit_id', $penyakitId))
            ->when($wilayahId,  fn($q) => $q->where('k.wilayah_id',  $wilayahId))
            ->groupByRaw("bulan_label, bulan_num, p.nama_penyakit")
            ->orderBy('bulan_num')
            ->get();

        $bulanLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        $byPenyakit = [];
        foreach ($rows as $row) {
            $byPenyakit[$row->nama_penyakit][$row->bulan_num] = (int) $row->total;
        }

        $datasets = [];
        $palette  = ['#185FA5','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
        $i = 0;
        foreach ($byPenyakit as $nama => $bulanData) {
            $data = [];
            for ($m = 1; $m <= 12; $m++) {
                $data[] = $bulanData[$m] ?? 0;
            }
            $datasets[] = [
                'label'           => $nama,
                'data'            => $data,
                'backgroundColor' => $palette[$i % count($palette)],
            ];
            $i++;
        }

        return response()->json([
            'labels'   => $bulanLabels,
            'datasets' => $datasets,
            'tahun'    => $tahun,
        ]);
    }

    // GET /api/gis/epidemiologi
    public function epidemiologi(Request $request)
    {
        $query = Kasus::with(['penyakit', 'wilayah', 'faskes'])
            ->latest('tanggal_kasus');

        if ($request->filled('wilayah_id'))  $query->where('wilayah_id', $request->wilayah_id);
        if ($request->filled('penyakit_id')) $query->where('penyakit_id', $request->penyakit_id);
        if ($request->filled('faskes_id'))   $query->where('faskes_id', $request->faskes_id);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('penyakit', fn($q) => $q->where('nama_penyakit', 'ilike', "%$s%"));
        }

        $data = $query->paginate($request->input('per_page', 10));
        $data->getCollection()->transform(fn($item) => [
            'id'        => $item->id,
            'penyakit'  => $item->penyakit?->nama_penyakit,
            'kode_icd'  => $item->penyakit?->kode_icd,
            'tanggal'   => $item->tanggal_kasus,
            'status'    => $item->status,
            'usia'      => $item->umur,
            'jk'        => $item->jenis_kelamin,
            'kecamatan' => $item->wilayah?->nama_wilayah,
            'faskes'    => $item->faskes?->nama_faskes,
        ]);

        return response()->json($data);
    }
}