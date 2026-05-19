<?php

namespace App\Http\Controllers;

use App\Models\Kasus;
use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserDashboardController extends Controller
{
    // ─── STATS SUMMARY ────────────────────────────────────────────────────────
    // ─── STATS SUMMARY ────────────────────────────────────────────────────────
    public function statsSummary(Request $request)
    {
        try {
            $tahun      = $request->query('tahun');
            $bulan      = $request->query('bulan');
            $penyakitId = $request->query('penyakit_id');

            $baseQuery = fn() => DB::table('kasus')
                ->when($tahun,      fn($q) => $q->whereYear('tanggal_kasus', $tahun))
                ->when($bulan,      fn($q) => $q->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan]))
                ->when($penyakitId, fn($q) => $q->where('penyakit_id', $penyakitId));

            $totalKasus   = $baseQuery()->count();
            $totalWilayah = Wilayah::count();

            $penyakitDominan = $baseQuery()
                ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
                ->select('penyakit.nama_penyakit', DB::raw('COUNT(*) as total'))
                ->groupBy('penyakit.nama_penyakit')
                ->orderByDesc('total')
                ->first();

            return response()->json([
                'total_kasus'             => $totalKasus,
                'total_wilayah'           => $totalWilayah,
                'penyakit_dominan'        => $penyakitDominan->nama_penyakit ?? null,
                'jumlah_penyakit_dominan' => $penyakitDominan->total ?? 0,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ─── STATISTIK ────────────────────────────────────────────────────────────
    public function statistik(Request $request)
    {
        $bulan      = $request->input('bulan', now()->format('Y-m'));
        $tahun      = $request->input('tahun', now()->year);
        $penyakitId = $request->input('penyakit_id');

        $filterBase = fn($q) => $q
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan])
            ->when($penyakitId, fn($q2) => $q2->where('kasus.penyakit_id', $penyakitId));

        $penyakitTerbanyak = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("penyakit.id, penyakit.nama_penyakit, penyakit.kode_icd, COUNT(*) as total")
            ->tap($filterBase)
            ->groupBy('penyakit.id', 'penyakit.nama_penyakit', 'penyakit.kode_icd')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $faskesTerbanyak = DB::table('kasus')
            ->join('fasilitas_kesehatan', 'kasus.faskes_id', '=', 'fasilitas_kesehatan.id')
            ->selectRaw("fasilitas_kesehatan.nama_faskes, COUNT(*) as total")
            ->whereNotNull('kasus.faskes_id')
            ->tap($filterBase)
            ->groupBy('fasilitas_kesehatan.id', 'fasilitas_kesehatan.nama_faskes')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $kasusByPenyakit = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("penyakit.id, penyakit.nama_penyakit, COUNT(*) as total")
            ->tap($filterBase)
            ->groupBy('penyakit.id', 'penyakit.nama_penyakit')
            ->orderByDesc('total')
            ->get();

        $base = fn() => Kasus::whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan])
            ->when($penyakitId, fn($q) => $q->where('penyakit_id', $penyakitId));

        return response()->json([
            'bulan'              => $bulan,
            'tahun'              => $tahun,
            'total_kasus'        => $base()->count(),
            'total_dirawat'      => $base()->where('status', 'Dirawat')->count(),
            'total_sembuh'       => $base()->where('status', 'Sembuh')->count(),
            'total_meninggal'    => $base()->where('status', 'Meninggal')->count(),
            'penyakit_terbanyak' => $penyakitTerbanyak,
            'faskes_terbanyak'   => $faskesTerbanyak,
            'kasus_by_penyakit'  => $kasusByPenyakit,
        ]);
    }

    // ─── TREN BULANAN ─────────────────────────────────────────────────────────
    public function trenBulanan(Request $request)
    {
        $tahun      = $request->query('tahun', now()->year);
        $penyakitId = $request->query('penyakit_id');

        $rows = DB::table('kasus')
            ->select(
                DB::raw('EXTRACT(MONTH FROM tanggal_kasus)::int as bulan'),
                DB::raw('COUNT(*) as jumlah_kasus')
            )
            ->whereYear('tanggal_kasus', $tahun)
            ->when($penyakitId, fn($q) => $q->where('penyakit_id', $penyakitId))
            ->groupBy(DB::raw('EXTRACT(MONTH FROM tanggal_kasus)'))
            ->orderBy('bulan')
            ->get()
            ->keyBy('bulan');

        $labels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        $data   = [];
        for ($i = 1; $i <= 12; $i++) {
            $data[] = [
                'bulan'        => $labels[$i - 1],
                'jumlah_kasus' => isset($rows[$i]) ? (int) $rows[$i]->jumlah_kasus : 0,
            ];
        }

        return response()->json([
            'status' => 'success',
            'tahun'  => (int) $tahun,
            'data'   => $data,
        ]);
    }

    // ─── STATS FASKES ─────────────────────────────────────────────────────────
    public function statsFaskes(Request $request)
    {
        $tahun      = $request->query('tahun');
        $bulan      = $request->query('bulan');
        $penyakitId = $request->query('penyakit_id');
        $limit      = (int) $request->query('limit', 5);

        $data = DB::table('kasus as k')
            ->join('fasilitas_kesehatan as f', 'k.faskes_id', '=', 'f.id')
            ->select('f.id', 'f.nama_faskes', DB::raw('COUNT(k.id) as jumlah_kasus'))
            ->whereNotNull('k.faskes_id')
            ->when($tahun,      fn($q) => $q->whereYear('k.tanggal_kasus', $tahun))
            ->when($bulan,      fn($q) => $q->whereRaw("TO_CHAR(k.tanggal_kasus, 'YYYY-MM') = ?", [$bulan]))
            ->when($penyakitId, fn($q) => $q->where('k.penyakit_id', $penyakitId))
            ->groupBy('f.id', 'f.nama_faskes')
            ->orderByDesc('jumlah_kasus')
            ->limit($limit)
            ->get();

        $total = DB::table('kasus')
            ->whereNotNull('faskes_id')
            ->when($tahun,      fn($q) => $q->whereYear('tanggal_kasus', $tahun))
            ->when($bulan,      fn($q) => $q->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan]))
            ->when($penyakitId, fn($q) => $q->where('penyakit_id', $penyakitId))
            ->count();

        $result = $data->map(fn($item) => [
            'id'           => $item->id,
            'nama_faskes'  => $item->nama_faskes,
            'jumlah_kasus' => (int) $item->jumlah_kasus,
            'persentase'   => $total > 0
                ? round(($item->jumlah_kasus / $total) * 100, 1)
                : 0,
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => $result,
        ]);
    }
}