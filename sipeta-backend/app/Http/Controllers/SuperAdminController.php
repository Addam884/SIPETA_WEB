<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Kasus;
use App\Models\Wilayah;

class SuperadminController extends Controller
{
    public function dashboard(Request $request)
    {
        try {
            $tahun = $request->query('tahun', now()->year); // ← TAMBAH
            $today = now()->toDateString();

            $totalKasus   = DB::table('kasus')
                ->whereYear('tanggal_kasus', $tahun) // ← filter tahun
                ->count();
            $totalUsers    = DB::table('users')->count();
            $totalFaskes   = DB::table('fasilitas_kesehatan')->count();
            $totalWilayah  = DB::table('wilayah')->count();
            $totalPenyakit = DB::table('penyakit')->count();
            $totalImport   = DB::table('file_import')
                ->whereYear('tanggal_upload', $tahun) // ← filter tahun
                ->count();
            $kasusHariIni  = DB::table('kasus')
                ->whereDate('tanggal_kasus', $today)
                ->count();
            $logError      = DB::table('activity_log')
                ->where('aktivitas', 'ilike', '%error%')
                ->whereYear('timestamp', $tahun) // ← filter tahun
                ->count();

            // tren kasus pakai $tahun
            $rows = DB::table('kasus')
                ->select(
                    DB::raw('EXTRACT(MONTH FROM tanggal_kasus)::int as bulan_ke'),
                    DB::raw('COUNT(*) as jumlah')
                )
                ->whereYear('tanggal_kasus', $tahun)
                ->groupBy(DB::raw('EXTRACT(MONTH FROM tanggal_kasus)'))
                ->orderBy('bulan_ke')
                ->get()
                ->keyBy('bulan_ke');

            $bulanLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            $trenKasus = [];
            for ($i = 1; $i <= 12; $i++) {
                $trenKasus[] = [
                    'bulan'    => $bulanLabels[$i - 1],
                    'bulan_ke' => $i,
                    'jumlah'   => isset($rows[$i]) ? (int) $rows[$i]->jumlah : 0,
                ];
            }

            // ── USERS BY ROLE ──────────────────────────────────────────────
            $usersByRole = DB::table('users as u')
                ->join('roles as r', 'u.role_id', '=', 'r.id')
                ->select('r.name as role', DB::raw('COUNT(u.id) as jumlah'))
                ->groupBy('r.name')
                ->orderByDesc('jumlah')
                ->get();

            // ── TREN KASUS (per bulan tahun ini) ──────────────────────────
            $rows = DB::table('kasus')
                ->select(
                    DB::raw('EXTRACT(MONTH FROM tanggal_kasus)::int as bulan_ke'),
                    DB::raw('COUNT(*) as jumlah')
                )
                ->whereYear('tanggal_kasus', $tahun)
                ->groupBy(DB::raw('EXTRACT(MONTH FROM tanggal_kasus)'))
                ->orderBy('bulan_ke')
                ->get()
                ->keyBy('bulan_ke');

            $bulanLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            $trenKasus = [];
            for ($i = 1; $i <= 12; $i++) {
                $trenKasus[] = [
                    'bulan'    => $bulanLabels[$i - 1],
                    'bulan_ke' => $i,
                    'jumlah'   => isset($rows[$i]) ? (int) $rows[$i]->jumlah : 0,
                ];
            }

            // ── RECENT ACTIVITY ────────────────────────────────────────────
            $recentActivity = DB::table('activity_log as a')
                ->leftJoin('users as u', 'a.user_id', '=', 'u.id')
                ->select(
                    DB::raw("COALESCE(u.name, 'System') as user"),
                    'a.aktivitas',
                    'a.modul',
                    'a.deskripsi',
                    'a.timestamp'
                )
                ->orderByDesc('a.timestamp')
                ->limit(10)
                ->get();

            // ── RECENT IMPORTS ─────────────────────────────────────────────
            $recentImports = DB::table('file_import as f')
                ->leftJoin('users as u', 'f.uploaded_by', '=', 'u.id')
                ->select(
                    'f.nama_file',
                    DB::raw("COALESCE(u.name, 'Unknown') as uploaded_by"),
                    'f.tanggal_upload',
                    'f.status',
                    'f.jumlah_data'
                )
                ->orderByDesc('f.tanggal_upload')
                ->limit(5)
                ->get();

            // ── KASUS LOG ──────────────────────────────────────────────────
            $kasusLog = DB::table('kasus_log as kl')
                ->leftJoin('users as u',              'kl.user_id',   '=', 'u.id')
                ->leftJoin('kasus as k',              'kl.kasus_id',  '=', 'k.id')
                ->leftJoin('penyakit as p',           'k.penyakit_id','=', 'p.id')
                ->leftJoin('wilayah as w',            'k.wilayah_id', '=', 'w.id')
                ->leftJoin('fasilitas_kesehatan as f','k.faskes_id',  '=', 'f.id')
                ->select(
                    'kl.id',
                    'kl.kasus_id',
                    'kl.aksi',
                    DB::raw("COALESCE(u.name, 'System') as user"),
                    DB::raw("COALESCE(p.nama_penyakit, 'Unknown') as nama_penyakit"),
                    DB::raw("COALESCE(p.kode_icd, '-') as kode_icd"),
                    DB::raw("COALESCE(w.nama_wilayah, '-') as wilayah"),
                    DB::raw("COALESCE(f.nama_faskes, '-') as faskes"),
                    'k.tanggal_kasus',
                    'k.status',
                    'kl.timestamp'
                )
                ->whereYear('kl.timestamp', $tahun)
                ->orderByDesc('kl.timestamp')
                ->limit(10)
                ->get();

            return response()->json([
                'stats' => [
                    'totalKasus'    => $totalKasus,
                    'totalUsers'    => $totalUsers,
                    'totalFaskes'   => $totalFaskes,
                    'totalWilayah'  => $totalWilayah,
                    'totalPenyakit' => $totalPenyakit,
                    'totalImport'   => $totalImport,
                    'kasusHariIni'  => $kasusHariIni,
                    'logError'      => $logError,
                ],
                'users_by_role'   => $usersByRole,
                'tren_kasus'      => $trenKasus,
                'recent_activity' => $recentActivity,
                'recent_imports'  => $recentImports,
                'kasus_log'       => $kasusLog,
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}