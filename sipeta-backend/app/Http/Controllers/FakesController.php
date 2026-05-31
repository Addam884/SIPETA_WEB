<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Faskes; 
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class FakesController extends Controller
{
    /**
     * TAMPILKAN DATA & PENCARIAN (INDEX)
     */
    public function index(Request $request)
    {
        try {
            $query = Faskes::with(['wilayah'])
                ->select(
                    'id',
                    'nama_faskes',
                    'wilayah_id',
                    DB::raw("ST_Y(geom) as latitude"),
                    DB::raw("ST_X(geom) as longitude")
                )
                ->whereNotNull('geom'); // 🔥 INI KUNCINYA

            if ($request->filled('wilayah_id')) {
                $query->where('wilayah_id', $request->wilayah_id);
            }
            
            if ($request->filled('search')) {
                $search = trim($request->search); 
                $query->where('nama_faskes', 'ilike', '%' . $search . '%');
            }
            
            $data = $query->orderBy('nama_faskes', 'asc')->get();
            return response()->json($data, 200);

        } catch (\Exception $e) {
            Log::error('Error Index Faskes: ' . $e->getMessage());
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * SIMPAN DATA BARU (STORE)
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'nama_faskes' => 'required|string|max:255',
                'wilayah_id'  => 'required|integer',
                'latitude'    => 'required|numeric',
                'longitude'   => 'required|numeric',
            ]);

            $faskes = new Faskes();
            $faskes->nama_faskes = $request->nama_faskes;
            $faskes->wilayah_id = $request->wilayah_id;
            $faskes->geom = DB::raw("ST_GeomFromText('POINT(" . $request->longitude . " " . $request->latitude . ")', 4326)");
            $faskes->save();

            return response()->json(['success' => true, 'message' => 'Data faskes baru berhasil disimpan!'], 201);

        } catch (\Exception $e) {
            Log::error('Gagal Store Faskes: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal menyimpan data ke database.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * UBAH DATA (UPDATE)
     */
    public function update(Request $request, $id)
    {
        try {
            $request->validate([
                'nama_faskes' => 'required|string|max:255',
                'wilayah_id'  => 'required|integer',
                'latitude'    => 'required|numeric',
                'longitude'   => 'required|numeric',
            ]);

            $faskes = Faskes::find($id);
            if (!$faskes) {
                return response()->json(['success' => false, 'message' => 'Data tidak ditemukan.'], 404);
            }

            $faskes->nama_faskes = $request->nama_faskes;
            $faskes->wilayah_id = $request->wilayah_id;
            $faskes->geom = DB::raw("ST_GeomFromText('POINT(" . $request->longitude . " " . $request->latitude . ")', 4326)");
            $faskes->save();

            return response()->json(['success' => true, 'message' => 'Data faskes berhasil diperbarui!'], 200);

        } catch (\Exception $e) {
            Log::error('Gagal Update Faskes: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal memperbarui data.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * HAPUS DATA & PENANGANAN DUPLIKAT (DESTROY - FIXED ERROR 500)
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $faskes = Faskes::find($id);

            if (!$faskes) {
                return response()->json(['success' => false, 'message' => 'Data faskes tidak ditemukan.'], 404);
            }

            // MENCARI ALTERNATIF DATA KEMBARAN (Untuk Merger Kasus)
            $alternatifFaskes = Faskes::where('nama_faskes', 'ilike', $faskes->nama_faskes)
                                        ->where('id', '!=', $id)
                                        ->first();

            // Cek nama tabel relasi secara dinamis (mengantisipasi antara datakasus, data_kasus, atau kasus)
            $tabelKasus = 'datakasus';
            if (!Schema::hasTable('datakasus') && Schema::hasTable('data_kasus')) {
                $tabelKasus = 'data_kasus';
            } elseif (!Schema::hasTable('datakasus') && Schema::hasTable('kasus')) {
                $tabelKasus = 'kasus';
            }

            // Cek nama kolom relasi secara dinamis (mengantisipasi faskes_id atau id_faskes)
            $kolomFaskes = 'faskes_id';
            if (Schema::hasTable($tabelKasus) && !Schema::hasColumn($tabelKasus, 'faskes_id') && Schema::hasColumn($tabelKasus, 'id_faskes')) {
                $kolomFaskes = 'id_faskes';
            }

            // Eksekusi merger pemindahan data jika tabelnya valid & ada faskes alternatifnya
            if (Schema::hasTable($tabelKasus)) {
                $hasRelations = DB::table($tabelKasus)->where($kolomFaskes, $id)->exists();
                
                if ($hasRelations) {
                    if ($alternatifFaskes) {
                        DB::table($tabelKasus)->where($kolomFaskes, $id)->update([$kolomFaskes => $alternatifFaskes->id]);
                    } else {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Gagal menghapus! Faskes ini memiliki data laporan aktif dan tidak ada faskes cadangan untuk memindahkan datanya.'
                        ], 400);
                    }
                }
            }

            // Jalankan perintah hapus
            $faskes->delete();
            DB::commit();
            
            return response()->json(['success' => true, 'message' => 'Data faskes berhasil dihapus!'], 200);

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            Log::error('Query Exception saat hapus faskes: ' . $e->getMessage());

            // Menangkap kode error constraint PostgreSQL (23503) agar tidak melempar error 500 ke React
            if ($e->getCode() === '23503' || str_contains($e->getMessage(), 'foreign key constraint')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus! Titik faskes ini terikat dengan data riwayat penyakit/kasus di database.'
                ], 400); // 400 Bad Request dibaca aman oleh Axios
            }

            return response()->json(['success' => false, 'message' => 'Gagal memproses query hapus.', 'error' => $e->getMessage()], 500);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Gagal Hapus Faskes Fatal: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal menghapus data.', 'error' => $e->getMessage()], 500);
        }
    }
}