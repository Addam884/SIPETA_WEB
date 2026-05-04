<?php

namespace App\Http\Controllers;

use App\Models\Kasus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class KasusController extends Controller
{
    // ─── GET ALL (pagination + filter + search) ────────────────────────────────
    public function index(Request $request)
    {
        $query = Kasus::with(['penyakit', 'wilayah', 'faskes'])
            ->latest('tanggal_kasus');

        if ($request->filled('penyakit_id')) {
            $query->where('penyakit_id', $request->penyakit_id);
        }
        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas(
                    'penyakit',
                    fn($q2) =>
                    $q2->where('nama_penyakit', 'ilike', "%{$search}%")
                        ->orWhere('kode_icd', 'ilike', "%{$search}%")
                )->orWhereHas(
                        'wilayah',
                        fn($q2) =>
                        $q2->where('nama_wilayah', 'ilike', "%{$search}%")
                    );
            });
        }

        $perPage = $request->input('per_page', 10);
        $data = $query->paginate($perPage);

        $data->getCollection()->transform(fn($item) => [
            'id' => $item->id,
            'penyakit_id' => $item->penyakit_id,
            'wilayah_id' => $item->wilayah_id,
            'faskes_id' => $item->faskes_id,
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

    // ─── STORE single ──────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'penyakit_id' => 'required|exists:penyakit,id',
            'wilayah_id' => 'required|exists:wilayah,id',
            'tanggal_kasus' => 'required|date',
            'umur' => 'required|integer|min:0|max:150',
            'jenis_kelamin' => 'required|in:L,P',
            'status' => 'required|in:Dirawat,Sembuh,Meninggal,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $faskesId = $request->faskes_id;
        if (empty($faskesId) && !empty($request->wilayah_id)) {
            $defaultFaskes = \App\Models\Faskes::where('wilayah_id', $request->wilayah_id)->first();
            $faskesId = $defaultFaskes?->id;
        }

        $kasus = Kasus::create([
            'penyakit_id' => $request->penyakit_id,
            'wilayah_id' => $request->wilayah_id,
            'faskes_id' => $request->faskes_id ?? null,
            'tanggal_kasus' => $request->tanggal_kasus,
            'umur' => $request->umur,
            'jenis_kelamin' => $request->jenis_kelamin,
            'status' => $request->status,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Data berhasil ditambahkan',
            'data' => $kasus->load(['penyakit', 'wilayah']),
        ], 201);
    }

    // ─── SHOW ──────────────────────────────────────────────────────────────────
    public function show($id)
    {
        return response()->json(
            Kasus::with(['penyakit', 'wilayah', 'faskes'])->findOrFail($id)
        );
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $kasus = Kasus::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'penyakit_id' => 'required|exists:penyakit,id',
            'wilayah_id' => 'required|exists:wilayah,id',
            'tanggal_kasus' => 'required|date',
            'umur' => 'required|integer|min:0|max:150',
            'jenis_kelamin' => 'required|in:L,P',
            'status' => 'required|in:Dirawat,Sembuh,Meninggal,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $faskesId = $request->faskes_id;
        if (empty($faskesId) && !empty($request->wilayah_id)) {
            $defaultFaskes = \App\Models\Faskes::where('wilayah_id', $request->wilayah_id)->first();
            $faskesId = $defaultFaskes?->id;
        }

        $kasus->update([
            'penyakit_id' => $request->penyakit_id,
            'wilayah_id' => $request->wilayah_id,
            'faskes_id' => $request->faskes_id ?? $kasus->faskes_id,
            'tanggal_kasus' => $request->tanggal_kasus,
            'umur' => $request->umur,
            'jenis_kelamin' => $request->jenis_kelamin,
            'status' => $request->status,
        ]);

        return response()->json([
            'message' => 'Data berhasil diupdate',
            'data' => $kasus->fresh(['penyakit', 'wilayah']),
        ]);
    }

    // ─── DELETE single ─────────────────────────────────────────────────────────
    public function destroy($id)
    {
        Kasus::findOrFail($id)->delete();
        return response()->json(['message' => 'Data berhasil dihapus']);
    }

    // ─── BULK DELETE ───────────────────────────────────────────────────────────
    public function bulkDelete(Request $request)
    {
        // Validasi input
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|integer|exists:kasus,id',
        ], [
            'ids.required' => 'Parameter ids wajib diisi',
            'ids.array' => 'Format ids harus berupa array',
            'ids.min' => 'Minimal 1 data yang dipilih',
            'ids.*.exists' => 'Beberapa data tidak ditemukan di database',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $ids = $request->input('ids');

        $deletedCount = Kasus::whereIn('id', $ids)->delete();


        return response()->json([
            'success' => true,
            'message' => "Berhasil menghapus {$deletedCount} data",
            'data' => [
                'total_requested' => count($ids),
                'total_deleted' => $deletedCount,
                'deleted_ids' => $ids,
            ],
        ]);
    }

    // ─── BULK IMPORT ───────────────────────────────────────────────────────────
    // Menerima array rows yang sudah di-parse di frontend (CSV/XLSX)
    // Max 5000 rows per request; frontend harus chunk jika lebih besar
    public function bulkImport(Request $request)
    {
        // Validasi dulu sebelum proses
        $validator = Validator::make($request->all(), [
            'rows' => 'required|array|min:1|max:5000',
            'rows.*.penyakit_id' => 'required|exists:penyakit,id',
            'rows.*.wilayah_id' => 'required|exists:wilayah,id',
            'rows.*.faskes_id' => 'nullable|exists:faskes,id',
            'rows.*.tanggal_kasus' => 'required|date',
            'rows.*.umur' => 'required|integer|min:0|max:150',
            'rows.*.jenis_kelamin' => 'required|in:L,P',
            'rows.*.status' => 'required|in:Dirawat,Sembuh,Meninggal,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal pada beberapa baris',
                'errors' => $validator->errors(),
            ], 422);
        }

        $rows = $request->input('rows', []);
        $userId = $request->user()?->id;

        // ✅ Proses auto-assign faskes_id untuk setiap row
        $processedRows = array_map(function ($row) {
            $faskesId = $row['faskes_id'] ?? null;

            // Auto-assign faskes berdasarkan wilayah jika tidak diisi
            if (empty($faskesId) && !empty($row['wilayah_id'])) {
                $defaultFaskes = \App\Models\Faskes::where('wilayah_id', $row['wilayah_id'])->first();
                $faskesId = $defaultFaskes?->id;
            }

            return [
                'penyakit_id' => $row['penyakit_id'],
                'wilayah_id' => $row['wilayah_id'],
                'faskes_id' => $faskesId,
                'tanggal_kasus' => $row['tanggal_kasus'],
                'umur' => $row['umur'],
                'jenis_kelamin' => $row['jenis_kelamin'],
                'status' => $row['status'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }, $rows);

        // ✅ Chunk insert 500 rows/batch
        $chunks = array_chunk($processedRows, 500);
        $total = 0;

        DB::beginTransaction();  // ✅ Mulai transaction manual
        try {
            foreach ($chunks as $chunk) {
                Kasus::insert($chunk);
                $total += count($chunk);
            }
            DB::commit();  // ✅ Commit jika berhasil

            return response()->json([
                'message' => "{$total} data berhasil diimport",
                'total' => $total,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();  // ✅ Rollback jika error
            return response()->json([
                'message' => 'Gagal mengimport data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ─── STATISTIK (untuk summary cards di frontend) ───────────────────────────
    public function statistik(Request $request)
    {
        $bulan = $request->input('bulan', now()->format('Y-m'));
        $tahun = $request->input('tahun', now()->year);

        // 1. Penyakit terbanyak bulan ini (top 5)
        $penyakitTerbanyak = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("penyakit.nama_penyakit, penyakit.kode_icd, COUNT(*) as total")
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan])
            ->groupBy('penyakit.id', 'penyakit.nama_penyakit', 'penyakit.kode_icd')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        // 2. Faskes dengan pasien terbanyak tahun ini (top 5)
        $faskesTerbanyak = DB::table('kasus')
            ->join('fasilitas_kesehatan', 'kasus.faskes_id', '=', 'fasilitas_kesehatan.id')
            ->selectRaw("fasilitas_kesehatan.nama_faskes, COUNT(*) as total")
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan])
            ->whereNotNull('kasus.faskes_id')
            ->groupBy('fasilitas_kesehatan.id', 'fasilitas_kesehatan.nama_faskes')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        // 3. Kasus by penyakit tahun ini (untuk pie/bar chart)
        $kasusByPenyakit = DB::table('kasus')
            ->join('penyakit', 'kasus.penyakit_id', '=', 'penyakit.id')
            ->selectRaw("penyakit.nama_penyakit, COUNT(*) as total")
            ->whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan])
            ->groupBy('penyakit.id', 'penyakit.nama_penyakit')
            ->orderByDesc('total')
            ->get();

        // 4. Ringkasan bulan ini
        $base = fn() => Kasus::whereRaw("TO_CHAR(tanggal_kasus, 'YYYY-MM') = ?", [$bulan]);

        return response()->json([
            'bulan' => $bulan,
            'tahun' => $tahun,
            'total_kasus' => $base()->count(),
            'total_dirawat' => $base()->where('status', 'Dirawat')->count(),
            'total_sembuh' => $base()->where('status', 'Sembuh')->count(),
            'total_meninggal' => $base()->where('status', 'Meninggal')->count(),
            'penyakit_terbanyak' => $penyakitTerbanyak,
            'faskes_terbanyak' => $faskesTerbanyak,
            'kasus_by_penyakit' => $kasusByPenyakit,
        ]);
    }
}