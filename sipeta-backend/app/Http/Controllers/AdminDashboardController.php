<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Kasus;
use App\Models\HasilClustering;

class AdminDashboardController extends Controller
{
    // STATISTIK DASHBOARD (TAHUN) 
    public function statistik(Request $request)
    {
        $tahun = $request->input('tahun', now()->year);

        $base = fn() =>
        Kasus::whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun]);

        $penyakitTerbanyak = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("penyakit.nama_penyakit, penyakit.kode_icd, COUNT(*) as total")
            ->whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun])
            ->groupBy('penyakit.id', 'penyakit.nama_penyakit', 'penyakit.kode_icd')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $kasusByPenyakit = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("penyakit.id, penyakit.nama_penyakit, COUNT(*) as total")
            ->whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun])
            ->groupBy('penyakit.id', 'penyakit.nama_penyakit')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'tahun' => $tahun,
            'total_kasus' => $base()->count(),
            'total_dirawat' => $base()->where('status', 'Dirawat')->count(),
            'total_sembuh' => $base()->where('status', 'Sembuh')->count(),
            'total_meninggal' => $base()->where('status', 'Meninggal')->count(),
            'penyakit_terbanyak' => $penyakitTerbanyak,
            'kasus_by_penyakit' => $kasusByPenyakit,
        ]);
    }

    // TREND PENYAKIT (FIXED BUG BULAN)
    public function trendPenyakit(Request $request)
    {
        $tahun = $request->input('tahun', now()->year);
        $penyakitId = $request->input('penyakit_id');

        $data = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("
                EXTRACT(MONTH FROM tanggal_kasus) as bulan_angka,
                LOWER(REPLACE(penyakit.nama_penyakit, ' ', '_')) as key_penyakit,
                COUNT(*) as total
            ")
            ->whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun])
            ->when($penyakitId && $penyakitId !== 'all', function ($query) use ($penyakitId) {
                return $query->where('kasus.penyakit_id', $penyakitId);
            })
            ->groupBy('bulan_angka', 'key_penyakit')
            ->get();

        $bulanMap = [
            1 => 'Jan',
            2 => 'Feb',
            3 => 'Mar',
            4 => 'Apr',
            5 => 'May',
            6 => 'Jun',
            7 => 'Jul',
            8 => 'Aug',
            9 => 'Sep',
            10 => 'Oct',
            11 => 'Nov',
            12 => 'Dec'
        ];

        $months = [];
        foreach ($bulanMap as $num => $text) {
            $months[$num] = ['month' => $text];
        }

        foreach ($data as $item) {
            $bNum = (int)$item->bulan_angka;
            if (isset($months[$bNum])) {
                $months[$bNum][$item->key_penyakit] = (int)$item->total;
            }
        }

        return response()->json(array_values($months));
    }

    // ─── DISTRIBUSI WILAYAH 
    public function distribusiWilayah(Request $request)
    {
        $tahun = $request->input('tahun', now()->year);

        $data = DB::table('kasus')
            ->join('wilayah', 'kasus.wilayah_id', '=', 'wilayah.id')
            ->selectRaw('wilayah.nama_wilayah as wilayah, COUNT(*) as kasus')
            ->whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun])
            ->groupBy('wilayah.nama_wilayah')
            ->orderByDesc('kasus')
            ->limit(4)
            ->get();

        return response()->json($data);
    }

    // ─── EARLY WARNING (FIXED BUG FILTER TAHUN) 
public function earlyWarning(Request $request)
{
    $tahun = $request->input('tahun', now()->year);

    // ambil bulan terbaru di tahun tsb
    $periode = DB::table('hasil_clustering')
        ->selectRaw("TO_CHAR(MAX(periode), 'YYYY-MM') as periode")
        ->whereYear('periode', $tahun)
        ->value('periode');

    if (!$periode) {
        return response()->json([]);
    }

    // ambil langsung dari hasil clustering GIS
    $data = HasilClustering::with(['wilayah', 'penyakit'])
        ->whereRaw("TO_CHAR(periode, 'YYYY-MM') = ?", [$periode])
        ->whereNotNull('penyakit_id')   
        ->whereIn('cluster_id', [1, 2])
        ->orderByDesc('cluster_id')
        ->orderByDesc('jumlah_kasus')
        ->limit(10)
        ->get()
        ->map(function ($item) use ($periode) {

            $level = match ($item->cluster_id) {
                2 => 'danger',
                1 => 'warning',
                default => 'safe'
            };

            $status = match ($item->cluster_id) {
                2 => 'Zona Merah',
                1 => 'Zona Kuning',
                default => 'Zona Hijau'
            };

            return [
                'penyakit' => $item->penyakit?->nama_penyakit,
                'wilayah' => $item->wilayah?->nama_wilayah ?? '-',
                'kode_gis' => $item->wilayah?->kode_gis ?? '-',
                'periode' => $periode,
                'total' => $item->jumlah_kasus,
                'cluster_id' => $item->cluster_id,
                'status' => $status,
                'level' => $level,
            ];
        });

    return response()->json($data);
}

    // AMBIL DAFTAR TAHUN UNTUK FILTER 
    public function listTahun()
    {
        $tahun = Kasus::selectRaw("EXTRACT(YEAR FROM tanggal_kasus) as tahun")
            ->distinct()
            ->orderBy('tahun', 'desc')
            ->pluck('tahun');

        if ($tahun->isEmpty()) {
            $tahun = [now()->year];
        }

        return response()->json($tahun);
    }
}
