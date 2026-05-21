<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Kasus;

class AdminDashboardController extends Controller
{
    // ─── STATISTIK DASHBOARD (TAHUN) ─────────────────────────────
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
        ->selectRaw("penyakit.id, penyakit.nama_penyakit, COUNT(*) as total") // 🌟 Tambahkan penyakit.id di sini
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

    // ─── TREND PENYAKIT ─────────────────────────────
    
    public function trendPenyakit(Request $request)
    {
        $tahun = $request->input('tahun', now()->year);
        $penyakitId = $request->input('penyakit_id'); // Ambil parameter filter penyakit jika ada

        $data = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("
                TO_CHAR(tanggal_kasus, 'Mon') as bulan,
                LOWER(REPLACE(penyakit.nama_penyakit, ' ', '_')) as key_penyakit,
                COUNT(*) as total
            ")
            ->whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun])
            // 🌟 Kondisi Dinamis: Jika penyakit_id dipilih (bukan 'all' atau kosong), saring datanya
            ->when($penyakitId && $penyakitId !== 'all', function ($query) use ($penyakitId) {
                return $query->where('kasus.penyakit_id', $penyakitId);
            })
            ->groupBy('bulan', 'key_penyakit')
            ->orderByRaw("MIN(tanggal_kasus)")
            ->get();

       
        $bulanTemplate = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $months = [];

        foreach ($bulanTemplate as $b) {
            $months[$b] = ['month' => $b];
        }

        foreach ($data as $item) {
            $bulan = $item->bulan;
            if (isset($months[$bulan])) {
                $months[$bulan][$item->key_penyakit] = $item->total;
            }
        }

        return response()->json(array_values($months));
    }

    // ─── DISTRIBUSI WILAYAH ─────────────────────────────
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

        $maxKasus = $data->max('kasus') ?: 1;

        return $data->map(function ($item) use ($maxKasus) {
            return [
                'wilayah' => $item->wilayah,
                'kasus' => $item->kasus,
                'persen' => round(($item->kasus / $maxKasus) * 100),
            ];
        });
    }

    // ─── EARLY WARNING ─────────────────────────────
    public function earlyWarning(Request $request)
    {
        $tahun = $request->input('tahun', now()->year);

        $data = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->join('wilayah', 'kasus.wilayah_id', '=', 'wilayah.id')
            ->selectRaw("
                penyakit.nama_penyakit,
                wilayah.nama_wilayah,
                penyakit.threshold_ews,
                COUNT(kasus.id) as total_kasus
            ")
            // 🌟 PERBAIKAN: Masukkan variabel $tahun ke dalam bindings query
            ->whereRaw("EXTRACT(YEAR FROM tanggal_kasus) = ?", [$tahun]) 
            ->groupBy(
                'penyakit.id',
                'penyakit.nama_penyakit',
                'penyakit.threshold_ews',
                'wilayah.id',
                'wilayah.nama_wilayah'
            )
            ->havingRaw('COUNT(kasus.id) >= penyakit.threshold_ews')
            ->orderByDesc('total_kasus')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $level = "warning";
                if ($item->total_kasus >= ($item->threshold_ews * 2)) {
                    $level = "danger";
                }
                return [
                    'penyakit' => $item->nama_penyakit,
                    'wilayah' => $item->nama_wilayah,
                    'total' => $item->total_kasus,
                    'level' => $level,
                ];
            });

        return response()->json($data);
    }



    // ─── AMBIL DAFTAR TAHUN UNTUK FILTER ──────────────────────────────────────
    public function listTahun()
    {
        // Mengambil tahun unik dari tanggal_kasus untuk drop-down di frontend
        $tahun = Kasus::selectRaw("EXTRACT(YEAR FROM tanggal_kasus) as tahun")
            ->distinct()
            ->orderBy('tahun', 'desc')
            ->pluck('tahun');

        // Jika database masih kosong, berikan tahun sekarang sebagai default
        if ($tahun->isEmpty()) {
            $tahun = [now()->year];
        }

        return response()->json($tahun);
    }
}