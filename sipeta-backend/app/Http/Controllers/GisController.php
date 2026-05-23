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
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class GisController extends Controller
{
    public function __construct(protected KMeansService $kmeans)
    {
    }

    // ─── 1. NEW: GeoJSON dengan default clustering (total semua penyakit) ───
    // GET /api/gis/geojson/default-clustering?periode=2024-01
    public function defaultClusteringGeoJson(Request $request)
    {
        $periode = $request->input('periode', now()->format('Y-m'));

        $wilayahList = DB::table('wilayah')
            ->selectRaw("id, nama_wilayah, level, ST_AsGeoJSON(geom)::json AS geojson")
            ->whereNotNull('geom')
            ->get();

        $kasusPerWilayah = DB::table('kasus')
            ->selectRaw('wilayah_id, COUNT(*) as total_kasus')
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('wilayah_id')
            ->get()
            ->pluck('total_kasus', 'wilayah_id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        if (empty($kasusPerWilayah)) {
            return $this->generateEmptyGeoJson($wilayahList);
        }

        $k = 3;
        $result = $this->kmeans->run($kasusPerWilayah, $k);
        $dbi = $this->kmeans->daviesBouldin($kasusPerWilayah, $result['assignments'], $result['centroids']);

        $periodeDate = $periode . '-01';

        HasilClustering::whereNull('penyakit_id')
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->delete();

        foreach ($result['assignments'] as $wilayahId => $clusterId) {
            HasilClustering::create([
                'wilayah_id' => $wilayahId,
                'penyakit_id' => null,
                'periode' => $periodeDate,
                'cluster_id' => $clusterId,
                'jumlah_kasus' => $kasusPerWilayah[$wilayahId],
                'centroid' => $result['centroids'][$clusterId],
            ]);
        }

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

    // ─── 2. MODIFIED: GeoJSON wilayah + warna cluster ────────────────────────
    // GET /api/gis/geojson?penyakit_id=&periode=2024-01
    public function geojson(Request $request)
    {
        $penyakitId = $request->input('penyakit_id');
        $periode = $request->input('periode', now()->format('Y-m'));

        $wilayahList = DB::table('wilayah')
            ->selectRaw("id, nama_wilayah, level, ST_AsGeoJSON(geom)::json AS geojson")
            ->whereNotNull('geom')
            ->get();

        if (!$penyakitId) {
            return $this->defaultClusteringGeoJson($request);
        }

        $clusterMap = HasilClustering::query()
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->where('penyakit_id', $penyakitId)
            ->get()
            ->keyBy('wilayah_id');

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
        $clusteringInfo = null;

        if ($clusterMap->isEmpty() && !empty($kasusPerWilayah)) {
            $k = 3;
            $result = $this->kmeans->run($kasusPerWilayah, $k);
            $dbi = $this->kmeans->daviesBouldin($kasusPerWilayah, $result['assignments'], $result['centroids']);

            $periodeDate = $periode . '-01';
            foreach ($result['assignments'] as $wilayahId => $clusterId) {
                HasilClustering::updateOrCreate(
                    ['wilayah_id' => $wilayahId, 'penyakit_id' => $penyakitId, 'periode' => $periodeDate],
                    ['cluster_id' => $clusterId, 'jumlah_kasus' => $kasusPerWilayah[$wilayahId], 'centroid' => $result['centroids'][$clusterId]]
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
        } elseif (!$clusterMap->isEmpty()) {
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

        return response()->json(['type' => 'FeatureCollection', 'features' => $features]);
    }

    // ─── 3. Jalankan K-Means default clustering ───────────────────────────────
    public function runDefaultClustering(Request $request)
    {
        $request->validate(['periode' => 'required|date_format:Y-m', 'k' => 'integer|min:2|max:5']);

        $periode = $request->periode;
        $k = $request->input('k', 3);

        $rows = DB::table('kasus')
            ->selectRaw('wilayah_id, COUNT(*) AS jumlah_kasus')
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('wilayah_id')
            ->get()
            ->pluck('jumlah_kasus', 'wilayah_id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        if (empty($rows)) {
            return response()->json(['message' => 'Tidak ada data kasus untuk periode tersebut'], 404);
        }

        $result = $this->kmeans->run($rows, $k);
        $dbi = $this->kmeans->daviesBouldin($rows, $result['assignments'], $result['centroids']);

        HasilClustering::whereNull('penyakit_id')
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->delete();

        $periodeDate = $periode . '-01';
        foreach ($result['assignments'] as $wilayahId => $clusterId) {
            HasilClustering::create([
                'wilayah_id' => $wilayahId,
                'penyakit_id' => null,
                'periode' => $periodeDate,
                'cluster_id' => $clusterId,
                'jumlah_kasus' => $rows[$wilayahId],
                'centroid' => $result['centroids'][$clusterId],
            ]);
        }

        return response()->json([
            'message' => "Default clustering selesai: {$result['iterations']} iterasi",
            'k' => $k,
            'total_wilayah' => count($result['assignments']),
            'centroids' => $result['centroids'],
            'davies_bouldin' => round($dbi, 4),
            'summary' => [
                'Rendah' => count(array_filter($result['assignments'], fn($v) => $v === 0)),
                'Sedang' => count(array_filter($result['assignments'], fn($v) => $v === 1)),
                'Tinggi' => count(array_filter($result['assignments'], fn($v) => $v === 2)),
            ],
        ]);
    }

    // ─── 4. Hasil default clustering ─────────────────────────────────────────
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
                'wilayah_id' => $h->wilayah_id,
                'nama_wilayah' => $h->wilayah?->nama_wilayah,
                'penyakit' => 'Semua Penyakit',
                'jumlah_kasus' => $h->jumlah_kasus,
                'cluster_id' => $h->cluster_id,
                'cluster_label' => ['Rendah', 'Sedang', 'Tinggi'][$h->cluster_id] ?? '-',
                'centroid' => round($h->centroid, 2),
            ]);

        return response()->json($hasil);
    }

    // ─── 5. Jalankan K-Means untuk penyakit spesifik ─────────────────────────
    public function runClustering(Request $request)
    {
        $request->validate([
            'penyakit_id' => 'required|exists:penyakit,id',
            'periode' => 'required|date_format:Y-m',
            'k' => 'integer|min:2|max:5',
        ]);

        $penyakitId = $request->penyakit_id;
        $periode = $request->periode;
        $k = $request->input('k', 3);

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
            return response()->json(['message' => 'Tidak ada data kasus untuk periode dan penyakit tersebut'], 404);
        }

        $result = $this->kmeans->run($rows, $k);
        $dbi = $this->kmeans->daviesBouldin($rows, $result['assignments'], $result['centroids']);

        HasilClustering::where('penyakit_id', $penyakitId)
            ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
            ->delete();

        $periodeDate = $periode . '-01';
        foreach ($result['assignments'] as $wilayahId => $clusterId) {
            HasilClustering::create([
                'wilayah_id' => $wilayahId,
                'penyakit_id' => $penyakitId,
                'periode' => $periodeDate,
                'cluster_id' => $clusterId,
                'jumlah_kasus' => $rows[$wilayahId],
                'centroid' => $result['centroids'][$clusterId],
            ]);
        }

        return response()->json([
            'message' => "Clustering selesai: {$result['iterations']} iterasi",
            'k' => $k,
            'total_wilayah' => count($result['assignments']),
            'centroids' => $result['centroids'],
            'davies_bouldin' => round($dbi, 4),
            'summary' => [
                'Rendah' => count(array_filter($result['assignments'], fn($v) => $v === 0)),
                'Sedang' => count(array_filter($result['assignments'], fn($v) => $v === 1)),
                'Tinggi' => count(array_filter($result['assignments'], fn($v) => $v === 2)),
            ],
        ]);
    }

    // ─── 7. Hasil clustering dengan filter penyakit ───────────────────────────
    public function clusteringResult(Request $request)
    {
        $penyakitId = $request->input('penyakit_id');
        $periode = $request->input('periode', now()->format('Y-m'));

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
                'wilayah_id' => $h->wilayah_id,
                'nama_wilayah' => $h->wilayah?->nama_wilayah,
                'penyakit' => $h->penyakit?->nama_penyakit ?? 'Semua Penyakit',
                'jumlah_kasus' => $h->jumlah_kasus,
                'cluster_id' => $h->cluster_id,
                'cluster_label' => ['Rendah', 'Sedang', 'Tinggi'][$h->cluster_id] ?? '-',
                'centroid' => round($h->centroid, 2),
            ]);

        return response()->json($hasil);
    }

    // ─── 8. Faskes ────────────────────────────────────────────────────────────
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
            'type' => 'Feature',
            'geometry' => ['type' => 'Point', 'coordinates' => [$f->longitude, $f->latitude]],
            'properties' => [
                'id' => $f->id,
                'nama_faskes' => $f->nama_faskes,
                'wilayah_id' => $f->wilayah_id,
                'nama_wilayah' => $f->nama_wilayah,
            ],
        ]);

        return response()->json(['type' => 'FeatureCollection', 'features' => $features]);
    }

    // ─── 9. Faskes Detail ─────────────────────────────────────────────────────
    public function faskesDetail(Request $request, int $id)
    {
        $periode = $request->input('periode', now()->format('Y-m'));

        $faskes = DB::table('fasilitas_kesehatan AS f')
            ->selectRaw("f.id, f.nama_faskes, w.nama_wilayah, ST_X(f.geom) AS longitude, ST_Y(f.geom) AS latitude, f.wilayah_id")
            ->leftJoin('wilayah AS w', 'w.id', '=', 'f.wilayah_id')
            ->where('f.id', $id)
            ->first();

        if (!$faskes)
            return response()->json(['message' => 'Faskes tidak ditemukan'], 404);

        $populasi = DB::table('populasi')->where('wilayah_id', $faskes->wilayah_id)->orderByDesc('tahun')->value('jumlah') ?? 0;
        $totalKasus = Kasus::where('faskes_id', $id)->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])->count();
        $kasusByPenyakit = DB::table('kasus AS k')
            ->join('penyakit AS p', 'p.id', '=', 'k.penyakit_id')
            ->selectRaw("p.nama_penyakit, p.kode_icd, COUNT(*) as total")
            ->where('k.faskes_id', $id)
            ->whereRaw("TO_CHAR(k.tanggal_kasus, 'YYYY-MM') = ?", [$periode])
            ->groupBy('p.id', 'p.nama_penyakit', 'p.kode_icd')
            ->orderByDesc('total')
            ->get();

        $ir = $populasi > 0 ? round(($totalKasus / $populasi) * 10000, 2) : 0;
        $meninggal = Kasus::where('faskes_id', $id)->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode])->where('status', 'Meninggal')->count();
        $cfr = $totalKasus > 0 ? round(($meninggal / $totalKasus) * 100, 2) : 0;
        $prevalence = $populasi > 0 ? round(($totalKasus / $populasi) * 10000, 2) : 0;

        return response()->json([
            'id' => $faskes->id,
            'nama_faskes' => $faskes->nama_faskes,
            'nama_wilayah' => $faskes->nama_wilayah,
            'latitude' => $faskes->latitude,
            'longitude' => $faskes->longitude,
            'populasi' => $populasi,
            'total_kasus' => $totalKasus,
            'ir' => $ir,
            'cfr' => $cfr,
            'prevalence' => $prevalence,
            'kasus_by_penyakit' => $kasusByPenyakit,
        ]);
    }

    // ─── 10. Trend ───────────────────────────────────────────────────────────
    public function trend(Request $request)
    {
        $tahun = $request->input('tahun', now()->year);
        $penyakitId = $request->input('penyakit_id');
        $wilayahId = $request->input('wilayah_id');

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
            ->when($wilayahId, fn($q) => $q->where('k.wilayah_id', $wilayahId))
            ->groupByRaw("bulan_label, bulan_num, p.nama_penyakit")
            ->orderBy('bulan_num')
            ->get();

        $bulanLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $byPenyakit = [];
        foreach ($rows as $row) {
            $byPenyakit[$row->nama_penyakit][$row->bulan_num] = (int) $row->total;
        }

        $datasets = [];
        $palette = ['#185FA5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        $i = 0;
        foreach ($byPenyakit as $nama => $bulanData) {
            $data = [];
            for ($m = 1; $m <= 12; $m++) {
                $data[] = $bulanData[$m] ?? 0;
            }
            $datasets[] = [
                'label' => $nama,
                'data' => $data,
                'backgroundColor' => $palette[$i % count($palette)],
            ];
            $i++;
        }

        return response()->json(['labels' => $bulanLabels, 'datasets' => $datasets, 'tahun' => $tahun]);
    }

    // ─── 11. Epidemiologi ─────────────────────────────────────────────────────
    public function epidemiologi(Request $request)
    {
        $query = Kasus::with(['penyakit', 'wilayah', 'faskes'])->latest('tanggal_kasus');

        if ($request->filled('wilayah_id'))
            $query->where('wilayah_id', $request->wilayah_id);
        if ($request->filled('penyakit_id'))
            $query->where('penyakit_id', $request->penyakit_id);
        if ($request->filled('faskes_id'))
            $query->where('faskes_id', $request->faskes_id);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('penyakit', fn($q) => $q->where('nama_penyakit', 'ilike', "%$s%"));
        }
        if ($request->filled('periode')) {
            $periode = $request->periode;
            $query->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$periode]);
        }

        $data = $query->paginate($request->input('per_page', 10));
        $data->getCollection()->transform(fn($item) => [
            'id' => $item->id,
            'penyakit' => $item->penyakit?->nama_penyakit,
            'kode_icd' => $item->penyakit?->kode_icd,
            'tanggal' => $item->tanggal_kasus,
            'status' => $item->status,
            'usia' => $item->umur,
            'jk' => $item->jenis_kelamin,
            'kecamatan' => $item->wilayah?->nama_wilayah,
            'faskes' => $item->faskes?->nama_faskes,
        ]);

        return response()->json($data);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ─── 12. EXPORT EXCEL ────────────────────────────────────────────────────
    // GET /api/gis/export-excel
    // Query params:
    //   wilayah_id     (optional)
    //   faskes_id      (optional)
    //   penyakit_id    (optional)
    //   periode_awal   (required, format: Y-m)
    //   periode_akhir  (required, format: Y-m)
    //   sheets[]       (optional, values: epidemiologi | clustering | trend)
    // ════════════════════════════════════════════════════════════════════════

    public function exportExcel(Request $request)
    {
        $request->validate([
            'periode_awal' => 'required|date_format:Y-m',
            'periode_akhir' => 'required|date_format:Y-m',
        ]);

        $wilayahId = $request->input('wilayah_id');
        $faskesId = $request->input('faskes_id');
        $penyakitId = $request->input('penyakit_id');
        $periodeAwal = $request->input('periode_awal');
        $periodeAkhir = $request->input('periode_akhir');
        $sheets = $request->input('sheets', ['epidemiologi']);

        // Pastikan $sheets adalah array
        if (is_string($sheets)) {
            $sheets = [$sheets];
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0); // hapus sheet default kosong

        $sheetIndex = 0;

        // ── Sheet 1: Epidemiologi ─────────────────────────────────────────────
        if (in_array('epidemiologi', $sheets)) {
            $ws = $spreadsheet->createSheet($sheetIndex++);
            $ws->setTitle('Data Epidemiologi');
            $this->fillSheetEpidemiologi($ws, $wilayahId, $faskesId, $penyakitId, $periodeAwal, $periodeAkhir);
        }

        // ── Sheet 2: Clustering ───────────────────────────────────────────────
        if (in_array('clustering', $sheets)) {
            $ws = $spreadsheet->createSheet($sheetIndex++);
            $ws->setTitle('Hasil Clustering');
            $this->fillSheetClustering($ws, $wilayahId, $penyakitId, $periodeAwal, $periodeAkhir);
        }

        // ── Sheet 3: Trend ────────────────────────────────────────────────────
        if (in_array('trend', $sheets)) {
            $ws = $spreadsheet->createSheet($sheetIndex++);
            $ws->setTitle('Tren Penyakit');
            $this->fillSheetTrend($ws, $wilayahId, $penyakitId, $periodeAwal, $periodeAkhir);
        }

        // Jika tidak ada sheet yang valid, tambahkan satu sheet kosong
        if ($sheetIndex === 0) {
            $ws = $spreadsheet->createSheet(0);
            $ws->setTitle('Tidak Ada Data');
        }

        $spreadsheet->setActiveSheetIndex(0);

        // ── Stream response sebagai file download ─────────────────────────────
        $namaFile = 'GIS_Export_' . $periodeAwal . '_sd_' . $periodeAkhir . '.xlsx';

        $writer = new Xlsx($spreadsheet);
        $tempPath = tempnam(sys_get_temp_dir(), 'gis_export_');
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $namaFile . '"',
        ])->deleteFileAfterSend(true);
    }

    // ─── Helper: Fill Sheet Epidemiologi ─────────────────────────────────────
    private function fillSheetEpidemiologi($ws, $wilayahId, $faskesId, $penyakitId, $periodeAwal, $periodeAkhir)
    {
        // ── Judul ─────────────────────────────────────────────────────────────
        $ws->setCellValue('A1', 'DATA EPIDEMIOLOGI GIS');
        $ws->mergeCells('A1:I1');
        $ws->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '185FA5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension(1)->setRowHeight(32);

        // Sub-judul info filter
        $filterInfo = 'Periode: ' . $periodeAwal . ' s/d ' . $periodeAkhir;
        if ($wilayahId) {
            $namaWilayah = DB::table('wilayah')->where('id', $wilayahId)->value('nama_wilayah');
            $filterInfo .= ' | Wilayah: ' . ($namaWilayah ?? $wilayahId);
        }
        if ($faskesId) {
            $namaFaskes = DB::table('fasilitas_kesehatan')->where('id', $faskesId)->value('nama_faskes');
            $filterInfo .= ' | Faskes: ' . ($namaFaskes ?? $faskesId);
        }
        if ($penyakitId) {
            $namaPenyakit = DB::table('penyakit')->where('id', $penyakitId)->value('nama_penyakit');
            $filterInfo .= ' | Penyakit: ' . ($namaPenyakit ?? $penyakitId);
        }

        $ws->setCellValue('A2', $filterInfo);
        $ws->mergeCells('A2:I2');
        $ws->getStyle('A2')->applyFromArray([
            'font' => ['italic' => true, 'size' => 10, 'color' => ['rgb' => '64748B']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0F7FF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getRowDimension(2)->setRowHeight(20);

        $ws->setCellValue('A3', 'Diekspor pada: ' . now()->format('d/m/Y H:i'));
        $ws->mergeCells('A3:I3');
        $ws->getStyle('A3')->applyFromArray([
            'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '94A3B8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);

        // ── Header tabel ──────────────────────────────────────────────────────
        $headers = ['#', 'Nama Penyakit', 'Kode ICD', 'Tanggal Kasus', 'Status', 'Usia (Tahun)', 'Jenis Kelamin', 'Wilayah/Kecamatan', 'Fasilitas Kesehatan'];
        $headerRow = 5;
        foreach ($headers as $col => $header) {
            $cell = chr(65 + $col) . $headerRow;
            $ws->setCellValue($cell, $header);
        }

        $ws->getStyle("A{$headerRow}:I{$headerRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'FFFFFF']]],
        ]);
        $ws->getRowDimension($headerRow)->setRowHeight(24);

        // ── Data ──────────────────────────────────────────────────────────────
        $query = Kasus::with(['penyakit', 'wilayah', 'faskes'])->latest('tanggal_kasus');

        if ($wilayahId)
            $query->where('wilayah_id', $wilayahId);
        if ($faskesId)
            $query->where('faskes_id', $faskesId);
        if ($penyakitId)
            $query->where('penyakit_id', $penyakitId);

        // Filter rentang waktu
        $query->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') >= ?", [$periodeAwal])
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') <= ?", [$periodeAkhir]);

        $dataRows = $query->get();
        $rowNum = $headerRow + 1;
        $no = 1;

        // Warna status
        $statusColors = [
            'Dirawat' => ['bg' => 'DBEAFE', 'font' => '1D4ED8'],
            'Sembuh' => ['bg' => 'DCFCE7', 'font' => '166534'],
            'Meninggal' => ['bg' => 'FEE2E2', 'font' => '991B1B'],
            'Inactive' => ['bg' => 'F3F4F6', 'font' => '374151'],
        ];

        foreach ($dataRows as $row) {
            $isEven = ($no % 2 === 0);
            $bgBase = $isEven ? 'F8FAFC' : 'FFFFFF';

            $ws->setCellValue("A{$rowNum}", $no);
            $ws->setCellValue("B{$rowNum}", $row->penyakit?->nama_penyakit ?? '-');
            $ws->setCellValue("C{$rowNum}", $row->penyakit?->kode_icd ?? '-');
            $ws->setCellValue("D{$rowNum}", $row->tanggal_kasus ? date('d/m/Y', strtotime($row->tanggal_kasus)) : '-');
            $ws->setCellValue("E{$rowNum}", $row->status ?? '-');
            $ws->setCellValue("F{$rowNum}", $row->umur ?? '-');
            $ws->setCellValue("G{$rowNum}", $row->jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan');
            $ws->setCellValue("H{$rowNum}", $row->wilayah?->nama_wilayah ?? '-');
            $ws->setCellValue("I{$rowNum}", $row->faskes?->nama_faskes ?? '-');

            // Style baris
            $ws->getStyle("A{$rowNum}:I{$rowNum}")->applyFromArray([
                'font' => ['size' => 10],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bgBase]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);

            // Warna cell status
            $status = $row->status ?? 'Inactive';
            $sc = $statusColors[$status] ?? $statusColors['Inactive'];
            $ws->getStyle("E{$rowNum}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => $sc['font']]],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $sc['bg']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            // Center beberapa kolom
            $ws->getStyle("A{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("C{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("D{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("F{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("G{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $ws->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
            $no++;
        }

        // Summary total
        $rowNum++;
        $ws->setCellValue("A{$rowNum}", 'Total Kasus');
        $ws->setCellValue("B{$rowNum}", count($dataRows));
        $ws->getStyle("A{$rowNum}:B{$rowNum}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '185FA5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // ── Lebar kolom ───────────────────────────────────────────────────────
        $ws->getColumnDimension('A')->setWidth(5);
        $ws->getColumnDimension('B')->setWidth(24);
        $ws->getColumnDimension('C')->setWidth(12);
        $ws->getColumnDimension('D')->setWidth(14);
        $ws->getColumnDimension('E')->setWidth(12);
        $ws->getColumnDimension('F')->setWidth(14);
        $ws->getColumnDimension('G')->setWidth(14);
        $ws->getColumnDimension('H')->setWidth(22);
        $ws->getColumnDimension('I')->setWidth(28);
    }

    // ─── Helper: Fill Sheet Clustering ───────────────────────────────────────
    private function fillSheetClustering($ws, $wilayahId, $penyakitId, $periodeAwal, $periodeAkhir)
    {
        // ── Judul ─────────────────────────────────────────────────────────────
        $ws->setCellValue('A1', 'HASIL CLUSTERING WILAYAH');
        $ws->mergeCells('A1:G1');
        $ws->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension(1)->setRowHeight(32);

        $filterInfo = 'Periode: ' . $periodeAwal . ' s/d ' . $periodeAkhir;
        if ($penyakitId) {
            $namaPenyakit = DB::table('penyakit')->where('id', $penyakitId)->value('nama_penyakit');
            $filterInfo .= ' | Penyakit: ' . ($namaPenyakit ?? $penyakitId);
        } else {
            $filterInfo .= ' | Penyakit: Semua Penyakit';
        }

        $ws->setCellValue('A2', $filterInfo);
        $ws->mergeCells('A2:G2');
        $ws->getStyle('A2')->applyFromArray([
            'font' => ['italic' => true, 'size' => 10, 'color' => ['rgb' => '64748B']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0F4FF']],
        ]);
        $ws->getRowDimension(2)->setRowHeight(20);

        // ── Header ────────────────────────────────────────────────────────────
        $headers = ['#', 'Wilayah/Kecamatan', 'Penyakit', 'Jumlah Kasus', 'Cluster ID', 'Status Risiko', 'Centroid'];
        $headerRow = 4;
        foreach ($headers as $col => $header) {
            $ws->setCellValue(chr(65 + $col) . $headerRow, $header);
        }

        $ws->getStyle("A{$headerRow}:G{$headerRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '185FA5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'FFFFFF']]],
        ]);
        $ws->getRowDimension($headerRow)->setRowHeight(24);

        // ── Data clustering per periode ───────────────────────────────────────
        // Ambil semua periode dalam rentang
        $periodeList = [];
        $current = \Carbon\Carbon::createFromFormat('Y-m', $periodeAwal)->startOfMonth();
        $end = \Carbon\Carbon::createFromFormat('Y-m', $periodeAkhir)->startOfMonth();
        while ($current->lte($end)) {
            $periodeList[] = $current->format('Y-m');
            $current->addMonth();
        }

        $clusterColors = [
            0 => ['bg' => 'DCFCE7', 'font' => '166534', 'label' => 'Rendah'],
            1 => ['bg' => 'FEF9C3', 'font' => '854D0E', 'label' => 'Sedang'],
            2 => ['bg' => 'FEE2E2', 'font' => '991B1B', 'label' => 'Tinggi'],
        ];

        $rowNum = $headerRow + 1;
        $no = 1;

        foreach ($periodeList as $periode) {
            $query = HasilClustering::with(['wilayah', 'penyakit'])
                ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode]);

            if ($penyakitId) {
                $query->where('penyakit_id', $penyakitId);
            } else {
                $query->whereNull('penyakit_id');
            }

            if ($wilayahId)
                $query->where('wilayah_id', $wilayahId);

            $hasil = $query->orderBy('cluster_id', 'desc')->orderBy('jumlah_kasus', 'desc')->get();

            // Baris sub-header periode
            $ws->setCellValue("A{$rowNum}", $periode);
            $ws->mergeCells("A{$rowNum}:G{$rowNum}");
            $ws->getStyle("A{$rowNum}")->applyFromArray([
                'font' => ['bold' => true, 'italic' => true, 'size' => 10, 'color' => ['rgb' => '185FA5']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'EFF6FF']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
            ]);
            $rowNum++;

            foreach ($hasil as $h) {
                $cId = $h->cluster_id;
                $cc = $clusterColors[$cId] ?? ['bg' => 'F3F4F6', 'font' => '374151', 'label' => '-'];
                $isEven = ($no % 2 === 0);
                $bgBase = $isEven ? 'F8FAFC' : 'FFFFFF';

                $ws->setCellValue("A{$rowNum}", $no);
                $ws->setCellValue("B{$rowNum}", $h->wilayah?->nama_wilayah ?? '-');
                $ws->setCellValue("C{$rowNum}", $h->penyakit?->nama_penyakit ?? 'Semua Penyakit');
                $ws->setCellValue("D{$rowNum}", $h->jumlah_kasus);
                $ws->setCellValue("E{$rowNum}", $cId);
                $ws->setCellValue("F{$rowNum}", $cc['label']);
                $ws->setCellValue("G{$rowNum}", round($h->centroid, 2));

                $ws->getStyle("A{$rowNum}:G{$rowNum}")->applyFromArray([
                    'font' => ['size' => 10],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bgBase]],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // Warna status risiko
                $ws->getStyle("F{$rowNum}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => $cc['font']]],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $cc['bg']]],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                $ws->getStyle("A{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $ws->getStyle("D{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $ws->getStyle("E{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $ws->getStyle("G{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $ws->getRowDimension($rowNum)->setRowHeight(20);

                $rowNum++;
                $no++;
            }
        }

        // ── Lebar kolom ───────────────────────────────────────────────────────
        $ws->getColumnDimension('A')->setWidth(5);
        $ws->getColumnDimension('B')->setWidth(24);
        $ws->getColumnDimension('C')->setWidth(24);
        $ws->getColumnDimension('D')->setWidth(14);
        $ws->getColumnDimension('E')->setWidth(12);
        $ws->getColumnDimension('F')->setWidth(14);
        $ws->getColumnDimension('G')->setWidth(12);
    }

    // ─── Helper: Fill Sheet Trend ─────────────────────────────────────────────
    private function fillSheetTrend($ws, $wilayahId, $penyakitId, $periodeAwal, $periodeAkhir)
    {
        // ── Judul ─────────────────────────────────────────────────────────────
        $ws->setCellValue('A1', 'TREN PENYAKIT PER BULAN');
        $ws->mergeCells('A1:N1');
        $ws->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F4C81']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension(1)->setRowHeight(32);

        $filterInfo = 'Periode: ' . $periodeAwal . ' s/d ' . $periodeAkhir;
        if ($wilayahId) {
            $namaWilayah = DB::table('wilayah')->where('id', $wilayahId)->value('nama_wilayah');
            $filterInfo .= ' | Wilayah: ' . ($namaWilayah ?? $wilayahId);
        }
        if ($penyakitId) {
            $namaPenyakit = DB::table('penyakit')->where('id', $penyakitId)->value('nama_penyakit');
            $filterInfo .= ' | Penyakit: ' . ($namaPenyakit ?? $penyakitId);
        }

        $ws->setCellValue('A2', $filterInfo);
        $ws->mergeCells('A2:N2');
        $ws->getStyle('A2')->applyFromArray([
            'font' => ['italic' => true, 'size' => 10, 'color' => ['rgb' => '64748B']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0F7FF']],
        ]);
        $ws->getRowDimension(2)->setRowHeight(20);

        // ── Ambil tahun yang terlibat dalam range ─────────────────────────────
        $tahunAwal = (int) substr($periodeAwal, 0, 4);
        $tahunAkhir = (int) substr($periodeAkhir, 0, 4);
        $bulanLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        // ── Header baris: Penyakit | Jan | Feb | ... | Des | Total ───────────
        $headerRow = 4;
        $ws->setCellValue("A{$headerRow}", 'Penyakit');
        $ws->setCellValue("B{$headerRow}", 'Tahun');
        foreach ($bulanLabels as $i => $bl) {
            $ws->setCellValue(chr(67 + $i) . $headerRow, $bl);
        }
        $ws->setCellValue("O{$headerRow}", 'Total');

        $ws->getStyle("A{$headerRow}:O{$headerRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '185FA5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'FFFFFF']]],
        ]);
        $ws->getRowDimension($headerRow)->setRowHeight(24);

        // ── Query data trend ──────────────────────────────────────────────────
        $rows = DB::table('kasus AS k')
            ->join('penyakit AS p', 'p.id', '=', 'k.penyakit_id')
            ->selectRaw("
                p.nama_penyakit,
                EXTRACT(YEAR FROM k.tanggal_kasus)::int AS tahun,
                EXTRACT(MONTH FROM k.tanggal_kasus)::int AS bulan,
                COUNT(*) AS total
            ")
            ->whereRaw("EXTRACT(YEAR FROM k.tanggal_kasus) BETWEEN ? AND ?", [$tahunAwal, $tahunAkhir])
            ->whereRaw("TO_CHAR(k.tanggal_kasus, 'YYYY-MM') >= ?", [$periodeAwal])
            ->whereRaw("TO_CHAR(k.tanggal_kasus, 'YYYY-MM') <= ?", [$periodeAkhir])
            ->when($penyakitId, fn($q) => $q->where('k.penyakit_id', $penyakitId))
            ->when($wilayahId, fn($q) => $q->where('k.wilayah_id', $wilayahId))
            ->groupByRaw("p.nama_penyakit, tahun, bulan")
            ->orderBy('p.nama_penyakit')
            ->orderBy('tahun')
            ->orderBy('bulan')
            ->get();

        // Susun data per penyakit-tahun
        $byPenyakitTahun = [];
        foreach ($rows as $row) {
            $key = $row->nama_penyakit . '||' . $row->tahun;
            $byPenyakitTahun[$key][$row->bulan] = (int) $row->total;
        }

        $palette = ['185FA5', '16A34A', 'D97706', 'DC2626', '7C3AED', '0891B2', 'DB2777'];
        $rowNum = $headerRow + 1;
        $no = 0;

        foreach ($byPenyakitTahun as $key => $bulanData) {
            [$namaPenyakit, $tahun] = explode('||', $key);
            $isEven = ($no % 2 === 0);
            $bgBase = $isEven ? 'F8FAFC' : 'FFFFFF';
            $colorIdx = $no % count($palette);

            $ws->setCellValue("A{$rowNum}", $namaPenyakit);
            $ws->setCellValue("B{$rowNum}", $tahun);

            $totalRow = 0;
            for ($m = 1; $m <= 12; $m++) {
                $val = $bulanData[$m] ?? 0;
                $ws->setCellValue(chr(67 + ($m - 1)) . $rowNum, $val);
                $totalRow += $val;
            }
            $ws->setCellValue("O{$rowNum}", $totalRow);

            $ws->getStyle("A{$rowNum}:O{$rowNum}")->applyFromArray([
                'font' => ['size' => 10],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bgBase]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);

            // Nama penyakit dengan warna
            $ws->getStyle("A{$rowNum}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => $palette[$colorIdx]]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
            ]);

            // Total bolder
            $ws->getStyle("O{$rowNum}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '185FA5']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            $ws->getStyle("B{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            for ($m = 1; $m <= 12; $m++) {
                $ws->getStyle(chr(67 + ($m - 1)) . $rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
            $ws->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
            $no++;
        }

        // ── Lebar kolom ───────────────────────────────────────────────────────
        $ws->getColumnDimension('A')->setWidth(28);
        $ws->getColumnDimension('B')->setWidth(8);
        for ($i = 0; $i < 12; $i++) {
            $ws->getColumnDimension(chr(67 + $i))->setWidth(7);
        }
        $ws->getColumnDimension('O')->setWidth(9);
    }
}