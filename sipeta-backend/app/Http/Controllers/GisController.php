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

    // ─── 1. GeoJSON wilayah + warna cluster ───────────────────────────────────
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

        // Ambil hasil clustering untuk periode & penyakit tsb
        $clusterMap = HasilClustering::query()
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->when($penyakitId, fn($q) => $q->where('penyakit_id', $penyakitId))
            ->get()
            ->keyBy('wilayah_id');

        $features = $wilayahList->map(function ($w) use ($clusterMap) {
    $cluster = $clusterMap->get($w->id);
    $cId     = $cluster?->cluster_id ?? null;
    $colors  = [0 => '#86efac', 1 => '#fde68a', 2 => '#fca5a5'];

    return [
        'type' => 'Feature',
        'geometry' => json_decode($w->geojson), // 🔥 FIX DI SINI
        'properties' => [
            'id'            => $w->id,
            'nama_wilayah'  => $w->nama_wilayah,
            'jumlah_kasus'  => $cluster?->jumlah_kasus ?? 0,
            'cluster_id'    => $cId,
            'cluster_label' => $cId !== null ? ['Rendah','Sedang','Tinggi'][$cId] : 'Belum diproses',
            'cluster_color' => $cId !== null ? $colors[$cId] : '#e5e7eb',
            'centroid'      => $cluster?->centroid,
        ],
    ];
});

        return response()->json([
            'type'     => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    // ─── 2. Titik fasilitas kesehatan (GeoJSON Point) ─────────────────────────
    // GET /api/gis/faskes
    public function faskes(Request $request)
    {
        $faskesRows = DB::table('fasilitas_kesehatan')
            ->selectRaw("
                f.id, f.nama_faskes, f.wilayah_id, w.nama_wilayah,
                ST_X(f.geom) AS longitude,
                ST_Y(f.geom) AS latitude
            ")
            ->from('fasilitas_kesehatan AS f')
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

    // ─── 3. Detail faskes (klik marker di map) ────────────────────────────────
    // GET /api/gis/faskes/{id}/detail?periode=2024-01
    public function faskesDetail(Request $request, int $id)
    {
        $periode = $request->input('periode', now()->format('Y-m'));

        $faskes = DB::table('fasilitas_kesehatan AS f')
            ->selectRaw("f.id, f.nama_faskes, w.nama_wilayah, ST_X(f.geom) AS longitude, ST_Y(f.geom) AS latitude, f.wilayah_id")
            ->leftJoin('wilayah AS w', 'w.id', '=', 'f.wilayah_id')
            ->where('f.id', $id)
            ->first();

        if (!$faskes) return response()->json(['message' => 'Faskes tidak ditemukan'], 404);

        // Populasi wilayah
        $populasi = DB::table('populasi')
            ->where('wilayah_id', $faskes->wilayah_id)
            ->orderByDesc('tahun')
            ->value('jumlah') ?? 0;

        // Total kasus bulan ini di wilayah faskes
        $totalKasus = Kasus::where('faskes_id', $id)
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->count();

        // Kasus per penyakit di faskes ini bulan ini
        $kasusByPenyakit = DB::table('kasus AS k')
            ->join('penyakit AS p', 'p.id', '=', 'k.penyakit_id')
            ->selectRaw("p.nama_penyakit, p.kode_icd, COUNT(*) as total")
            ->where('k.faskes_id', $id)
            ->whereRaw("TO_CHAR(k.tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('p.id', 'p.nama_penyakit', 'p.kode_icd')
            ->orderByDesc('total')
            ->get();

        // IR = (total_kasus / populasi) * 10.000
        $ir = $populasi > 0 ? round(($totalKasus / $populasi) * 10000, 2) : 0;

        // CFR (critical fatality rate)
        $meninggal = Kasus::where('faskes_id', $id)
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->where('status', 'Meninggal')
            ->count();
        $cfr = $totalKasus > 0 ? round(($meninggal / $totalKasus) * 100, 2) : 0;

        // Prevalence per 10.000
        $prevalence = $populasi > 0 ? round(($totalKasus / $populasi) * 10000, 2) : 0;

        return response()->json([
            'id'              => $faskes->id,
            'nama_faskes'     => $faskes->nama_faskes,
            'nama_wilayah'    => $faskes->nama_wilayah,
            'latitude'        => $faskes->latitude,
            'longitude'       => $faskes->longitude,
            'populasi'        => $populasi,
            'total_kasus'     => $totalKasus,
            'ir'              => $ir,
            'cfr'             => $cfr,
            'prevalence'      => $prevalence,
            'kasus_by_penyakit' => $kasusByPenyakit,
        ]);
    }

    // ─── 4. Jalankan K-Means & simpan hasilnya ────────────────────────────────
    // POST /api/gis/clustering/run
    // Body: { penyakit_id: 1, periode: "2024-01", k: 3 }
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

    // ─── 5. Hasil clustering (tabel + summary) ────────────────────────────────
    // GET /api/gis/clustering/result?penyakit_id=&periode=
    public function clusteringResult(Request $request)
    {
        $penyakitId = $request->input('penyakit_id');
        $periode    = $request->input('periode', now()->format('Y-m'));

        $hasil = HasilClustering::with(['wilayah', 'penyakit'])
            ->when($penyakitId, fn($q) => $q->where('penyakit_id', $penyakitId))
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->orderBy('cluster_id', 'desc')
            ->orderBy('jumlah_kasus', 'desc')
            ->get()
            ->map(fn($h) => [
                'wilayah_id'    => $h->wilayah_id,
                'nama_wilayah'  => $h->wilayah?->nama_wilayah,
                'penyakit'      => $h->penyakit?->nama_penyakit,
                'jumlah_kasus'  => $h->jumlah_kasus,
                'cluster_id'    => $h->cluster_id,
                'cluster_label' => ['Rendah','Sedang','Tinggi'][$h->cluster_id] ?? '-',
                'centroid'      => round($h->centroid, 2),
            ]);

        return response()->json($hasil);
    }

    // ─── 6. Trend penyakit per bulan (grafik batang) ─────────────────────────
    // GET /api/gis/trend?penyakit_id=&wilayah_id=&tahun=2024
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

        // Susun data per bulan [1..12] untuk semua penyakit
        $bulanLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

        // Group by penyakit
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

    // ─── 7. Epidemiologi tabel (sama seperti kasus biasa, tapi untuk GIS view) ─
    // GET /api/gis/epidemiologi?wilayah_id=&penyakit_id=&per_page=10
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