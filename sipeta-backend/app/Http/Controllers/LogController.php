<?php
// app/Http/Controllers/LogController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LogController extends Controller
{
    // ─── 1. Riwayat Data Kasus ────────────────────────────────────────────────
    // GET /api/logs/kasus?search=&aksi=&penyakit_id=&wilayah_id=&from=&to=&per_page=
    public function riwayatKasus(Request $request)
    {
        $query = DB::table('kasus_log AS kl')
            ->leftJoin('kasus AS k', 'k.id', '=', 'kl.kasus_id')
            ->leftJoin('penyakit AS p', 'p.id', '=', 'k.penyakit_id')
            ->leftJoin('wilayah AS w', 'w.id', '=', 'k.wilayah_id')
            ->leftJoin('users AS u', 'u.id', '=', 'kl.user_id')
            ->leftJoin('roles AS r', 'r.id', '=', 'u.role_id')
            ->selectRaw("
                kl.id,
                kl.aksi,
                kl.timestamp,
                kl.keterangan,
                k.id           AS kasus_id,
                k.tanggal_kasus,
                k.umur,
                k.jenis_kelamin,
                k.status       AS status_kasus,
                p.nama_penyakit,
                p.kode_icd,
                w.nama_wilayah,
                u.name         AS nama_user,
                r.name         AS role_user,
                kl.data_before,
                kl.data_after
            ");

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('p.nama_penyakit', 'ilike', "%$s%")
                    ->orWhere('p.kode_icd', 'ilike', "%$s%")
                    ->orWhere('w.nama_wilayah', 'ilike', "%$s%")
                    ->orWhere('u.name', 'ilike', "%$s%");
            });
        }
        if ($request->filled('aksi'))
            $query->where('kl.aksi', $request->aksi);
        if ($request->filled('penyakit_id'))
            $query->where('k.penyakit_id', $request->penyakit_id);
        if ($request->filled('wilayah_id'))
            $query->where('k.wilayah_id', $request->wilayah_id);
        if ($request->filled('from'))
            $query->where('kl.timestamp', '>=', $request->from . ' 00:00:00');
        if ($request->filled('to'))
            $query->where('kl.timestamp', '<=', $request->to . ' 23:59:59');

        $query->orderByDesc('kl.timestamp');
        $data = $query->paginate($request->input('per_page', 15));

        return response()->json($data);
    }

    // ─── 2. Riwayat Aktivitas Admin ───────────────────────────────────────────
    // GET /api/logs/aktivitas?search=&modul=&from=&to=&user_id=&per_page=
    public function riwayatAktivitas(Request $request)
    {
        $query = DB::table('activity_log AS al')
            ->leftJoin('users AS u', 'u.id', '=', 'al.user_id')
            ->leftJoin('roles AS r', 'r.id', '=', 'u.role_id')
            ->selectRaw("
                al.id,
                al.aktivitas,
                al.modul,
                al.deskripsi,
                al.ip_address,
                al.timestamp,
                u.name    AS nama_user,
                u.email,
                r.name    AS role_user
            ");

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('u.name', 'ilike', "%$s%")
                    ->orWhere('al.aktivitas', 'ilike', "%$s%")
                    ->orWhere('al.deskripsi', 'ilike', "%$s%");
            });
        }
        if ($request->filled('modul'))
            $query->where('al.modul', $request->modul);
        if ($request->filled('user_id'))
            $query->where('al.user_id', $request->user_id);
        if ($request->filled('from'))
            $query->where('al.timestamp', '>=', $request->from . ' 00:00:00');
        if ($request->filled('to'))
            $query->where('al.timestamp', '<=', $request->to . ' 23:59:59');

        $query->orderByDesc('al.timestamp');
        $data = $query->paginate($request->input('per_page', 15));

        return response()->json($data);
    }

    // ─── 3. Riwayat Import & Export ───────────────────────────────────────────
    // GET /api/logs/file?search=&tipe_aksi=&status=&from=&to=&per_page=
    public function riwayatFile(Request $request)
    {
        $query = DB::table('file_import AS fi')
            ->leftJoin('users AS u', 'u.id', '=', 'fi.uploaded_by')
            ->leftJoin('roles AS r', 'r.id', '=', 'u.role_id')
            ->selectRaw("
                fi.id,
                fi.nama_file,
                fi.nama_asli,
                fi.jenis_file,
                fi.tipe_aksi,
                fi.jumlah_data,
                fi.status,
                fi.keterangan,
                fi.ukuran_file,
                fi.tanggal_upload,
                u.name  AS nama_user,
                r.name  AS role_user
            ");

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('fi.nama_file', 'ilike', "%$s%")
                    ->orWhere('u.name', 'ilike', "%$s%");
            });
        }
        if ($request->filled('tipe_aksi'))
            $query->where('fi.tipe_aksi', $request->tipe_aksi);
        if ($request->filled('status'))
            $query->where('fi.status', $request->status);
        if ($request->filled('from'))
            $query->where('fi.tanggal_upload', '>=', $request->from . ' 00:00:00');
        if ($request->filled('to'))
            $query->where('fi.tanggal_upload', '<=', $request->to . ' 23:59:59');

        $query->orderByDesc('fi.tanggal_upload');
        $data = $query->paginate($request->input('per_page', 15));

        return response()->json($data);
    }

    // ─── 4. Summary stats (untuk cards header) ───────────────────────────────
    // GET /api/logs/summary
    public function summary()
{
    try {
        $today = date('Y-m-d');
        $startOfMonth = date('Y-m-01');
        $endOfMonth = date('Y-m-t');
        
        // Hanya query dari kasus_log dulu
        $kasusHariIni = DB::table('kasus_log')
            ->whereDate('timestamp', $today)
            ->count();
        
        $tambahBulanIni = DB::table('kasus_log')
            ->whereDate('timestamp', '>=', $startOfMonth)
            ->whereDate('timestamp', '<=', $endOfMonth)
            ->where('aksi', 'Tambah')
            ->count();
        
        $editBulanIni = DB::table('kasus_log')
            ->whereDate('timestamp', '>=', $startOfMonth)
            ->whereDate('timestamp', '<=', $endOfMonth)
            ->where('aksi', 'Edit')
            ->count();
        
        $hapusBulanIni = DB::table('kasus_log')
            ->whereDate('timestamp', '>=', $startOfMonth)
            ->whereDate('timestamp', '<=', $endOfMonth)
            ->where('aksi', 'Hapus')
            ->count();
        
        // Sementara beri nilai 0 untuk yang lain
        return response()->json([
            'kasus_hari_ini' => $kasusHariIni,
            'aktivitas_hari_ini' => $kasusHariIni,
            'import_hari_ini' => 1,
            'export_hari_ini' => 1,
            'tambah_bulan_ini' => $tambahBulanIni,
            'edit_bulan_ini' => $editBulanIni,
            'hapus_bulan_ini' => $hapusBulanIni,
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}
}