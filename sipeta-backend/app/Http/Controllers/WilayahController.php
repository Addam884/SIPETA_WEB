<?php

namespace App\Http\Controllers;

use App\Models\Populasi;
use App\Models\Wilayah;
use App\Models\BatasWilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WilayahController extends Controller
{
    private const CACHE_NAMESPACE = 'master_delete_cache_v1';
    private const CACHE_KEY = 'deleted_wilayah_ids';

    public function index()
    {
        $tahun = now()->year;
        $deletedIds = $this->getDeletedIds();

        $data = Wilayah::orderBy('nama_wilayah')
            ->leftJoin('populasi', function ($join) use ($tahun) {
                $join->on('wilayah.id', '=', 'populasi.wilayah_id')
                    ->where('populasi.tahun', '=', $tahun);
            })
            ->select(
                'wilayah.*',
                DB::raw('populasi.jumlah as populasi_jumlah'),
                DB::raw('ST_AsGeoJSON(wilayah.geom) as geojson')
            );

        if (!empty($deletedIds)) {
            $data->whereNotIn('wilayah.id', $deletedIds);
        }

        $results = $data->get();

        $results->transform(function ($item) {
            if ($item->geojson) {
                $item->geom_data = json_decode($item->geojson);
            }
            unset($item->geojson);
            return $item;
        });

        return response()->json($results);
    }

    /**
     * SIMPAN DATA WILAYAH BARU
     * TIDAK ADA RESTORE - SELALU BUAT DATA BARU
     */
    public function store(Request $request)
    {
        try {
            Log::info('=== START STORE WILAYAH ===');
            Log::info('Request data: ', $request->all());

            $request->validate([
                'nama_wilayah' => 'required|string|max:100',
                'level' => 'required|string|in:Provinsi,Kabupaten,Kota,Kecamatan',
                'parent_id' => 'nullable',
                'populasi_jumlah' => 'nullable|numeric',
            ]);

            $tahun = now()->year;
            $nama = trim($request->input('nama_wilayah'));
            $level = $request->input('level');

            // CEK DUPLIKAT NAMA (hanya untuk data yang TIDAK soft delete)
            $deletedIds = $this->getDeletedIds();
            $existing = Wilayah::whereRaw('lower(nama_wilayah) = lower(?)', [$nama])
                ->whereNotIn('id', $deletedIds) // Abaikan yang soft delete
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => "Data wilayah '{$nama}' sudah ada dan aktif! Silahkan gunakan nama lain atau edit data yang ada."
                ], 422);
            }

            // Ambil geom dari batas_wilayah
            $geomData = $this->getGeomFromBatasWilayah($nama, $level);

            if (!$geomData) {
                return response()->json([
                    'success' => false,
                    'message' => "Data wilayah '{$nama}' dengan level '{$level}' tidak ditemukan di tabel batas_wilayah!",
                    'hint' => "Pastikan nama wilayah sesuai dengan data di database batas_wilayah"
                ], 404);
            }

            // SELALU BUAT DATA BARU, tidak pernah restore
            $payloadWilayah = [
                'nama_wilayah' => $nama,
                'level' => $level,
                'parent_id' => $request->input('parent_id'),
                'geom' => $geomData['geom_raw'],
                'batas_wilayah_gid' => $geomData['gid']
            ];

            $wilayah = Wilayah::create($payloadWilayah);
            Log::info("✅ Wilayah baru created: ID {$wilayah->id} - Nama: {$nama}");

            // Simpan populasi dengan ID wilayah yang BARU
            $jumlah = $request->input('populasi_jumlah');
            if ($jumlah !== null && $jumlah !== '') {
                $this->savePopulasi($wilayah->id, $tahun, $jumlah);
                Log::info("✅ Populasi saved untuk wilayah_id: {$wilayah->id}");
            }

            $wilayah->populasi_jumlah = $jumlah;

            return response()->json([
                'success' => true,
                'message' => 'Data berhasil ditambahkan',
                'data' => $wilayah,
                'new_wilayah_id' => $wilayah->id // Kirim ID baru ke frontend
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error store wilayah: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * UPDATE DATA WILAYAH (Edit)
     */
    public function update(Request $request, $id)
    {
        try {
            Log::info("=== UPDATE WILAYAH ID: {$id} ===");

            $request->validate([
                'nama_wilayah' => 'sometimes|required|string|max:100',
                'level' => 'sometimes|required|string|in:Provinsi,Kabupaten,Kota,Kecamatan',
                'populasi_jumlah' => 'nullable|numeric',
            ]);

            $w = Wilayah::findOrFail($id);

            $payloadWilayah = [];

            // Jika update nama atau level
            if ($request->filled('nama_wilayah') || $request->filled('level')) {
                $nama = $request->filled('nama_wilayah') ? trim($request->input('nama_wilayah')) : $w->nama_wilayah;
                $level = $request->filled('level') ? $request->input('level') : $w->level;

                // Cek duplikat nama (abaikan ID sendiri)
                $deletedIds = $this->getDeletedIds();
                $existing = Wilayah::whereRaw('lower(nama_wilayah) = lower(?)', [$nama])
                    ->where('id', '!=', $id)
                    ->whereNotIn('id', $deletedIds)
                    ->first();

                if ($existing) {
                    return response()->json([
                        'success' => false,
                        'message' => "Nama wilayah '{$nama}' sudah digunakan oleh data lain."
                    ], 409);
                }

                // Ambil geom baru dari batas_wilayah
                $geomData = $this->getGeomFromBatasWilayah($nama, $level);

                if (!$geomData) {
                    return response()->json([
                        'success' => false,
                        'message' => "Data wilayah '{$nama}' dengan level '{$level}' tidak ditemukan di tabel batas_wilayah!"
                    ], 404);
                }

                $payloadWilayah = [
                    'nama_wilayah' => $nama,
                    'level' => $level,
                    'geom' => $geomData['geom_raw'],
                    'batas_wilayah_gid' => $geomData['gid']
                ];
            }

            if (!empty($payloadWilayah)) {
                $w->update($payloadWilayah);
                Log::info("✅ Wilayah ID {$id} updated");
            }

            // Update populasi
            $tahun = now()->year;
            $jumlah = $request->input('populasi_jumlah');
            if ($jumlah !== null && $jumlah !== '') {
                $this->savePopulasi($w->id, $tahun, $jumlah);
                Log::info("✅ Populasi updated untuk wilayah_id: {$w->id}");
            }

            return response()->json([
                'success' => true,
                'message' => 'Data berhasil diupdate',
                'data' => $w
            ]);

        } catch (\Exception $e) {
            Log::error('Error update wilayah: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }
    public function destroy($id)
    {
        try {
            // Cari data wilayah
            $wilayah = Wilayah::find($id);

            if (!$wilayah) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data wilayah tidak ditemukan.'
                ], 404);
            }

            $deletedIds = $this->getDeletedIds();

            if (!in_array((int) $id, $deletedIds, true)) {
                $deletedIds[] = (int) $id;
            }

            $this->setDeletedIds($deletedIds);

            Log::info("🗑️ Wilayah ID {$id} soft deleted");

            return response()->json([
                'success' => true,
                'message' => 'Data wilayah disembunyikan (soft delete via cache).'
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Gagal Destroy Wilayah: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses soft delete.',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Helper function untuk save populasi
     */
    private function savePopulasi($wilayahId, $tahun, $jumlah)
    {
        try {
            Log::info("Saving populasi - wilayah_id: {$wilayahId}, tahun: {$tahun}, jumlah: {$jumlah}");

            // Gunakan updateOrCreate untuk menghindari duplicate
            $populasi = Populasi::updateOrCreate(
                [
                    'wilayah_id' => $wilayahId,
                    'tahun' => $tahun
                ],
                [
                    'jumlah' => $jumlah
                ]
            );

            Log::info("✅ Populasi saved with ID: {$populasi->id} for wilayah_id: {$wilayahId}");
            return $populasi;

        } catch (\Exception $e) {
            Log::error("Error savePopulasi: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Ambil MultiPolygon geom dari tabel batas_wilayah
     */
    private function getGeomFromBatasWilayah(string $namaWilayah, string $level): ?array
    {
        try {
            $query = BatasWilayah::query();

            switch (strtolower($level)) {
                case 'provinsi':
                    $query->whereRaw('LOWER(name_1) = LOWER(?)', [$namaWilayah]);
                    Log::info("Mencari provinsi: {$namaWilayah} di kolom name_1");
                    break;

                case 'kabupaten':
                case 'kota':
                    $query->whereRaw('LOWER(name_2) = LOWER(?)', [$namaWilayah]);
                    Log::info("Mencari kabupaten/kota: {$namaWilayah} di kolom name_2");
                    break;

                case 'kecamatan':
                    $query->whereRaw('LOWER(name_3) = LOWER(?)', [$namaWilayah]);
                    Log::info("Mencari kecamatan: {$namaWilayah} di kolom name_3");
                    break;

                default:
                    Log::warning("Level tidak dikenal: {$level}");
                    return null;
            }

            $batasWilayah = $query->first();

            if ($batasWilayah && $batasWilayah->geom) {
                Log::info("✅ Geom ditemukan untuk {$namaWilayah} (level: {$level}), GID: {$batasWilayah->gid}");

                return [
                    'gid' => $batasWilayah->gid,
                    'geom_raw' => $batasWilayah->geom,
                    'name_1' => $batasWilayah->name_1,
                    'name_2' => $batasWilayah->name_2,
                    'name_3' => $batasWilayah->name_3,
                ];
            }

            Log::warning("❌ Geom TIDAK ditemukan untuk: {$namaWilayah} (level: {$level})");
            return null;

        } catch (\Exception $e) {
            Log::error("Error mengambil geom: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Endpoint untuk cek ketersediaan geom
     */
    public function checkGeom(Request $request)
    {
        $request->validate([
            'nama_wilayah' => 'required|string',
            'level' => 'required|string|in:Provinsi,Kabupaten,Kota,Kecamatan'
        ]);

        $geomData = $this->getGeomFromBatasWilayah(
            $request->input('nama_wilayah'),
            $request->input('level')
        );

        if ($geomData) {
            return response()->json([
                'success' => true,
                'found' => true,
                'gid' => $geomData['gid'],
                'message' => 'Geom MultiPolygon ditemukan'
            ]);
        }

        return response()->json([
            'success' => false,
            'found' => false,
            'message' => "Wilayah tidak ditemukan di database batas_wilayah"
        ], 404);
    }

    public function show($id)
    {
        $wilayah = Wilayah::with('batasWilayah')->findOrFail($id);

        if ($wilayah->geom) {
            $geojson = DB::select("SELECT ST_AsGeoJSON(?) as geojson", [$wilayah->geom]);
            if (!empty($geojson) && $geojson[0]->geojson) {
                $wilayah->geom_data = json_decode($geojson[0]->geojson);
            }
        }

        return response()->json($wilayah);
    }

    private function getDeletedIds(): array
    {
        $key = $this->cacheKey();
        $ids = Cache::rememberForever($key, function () {
            return [];
        });

        if (!is_array($ids)) {
            return [];
        }

        return array_values(array_map('intval', $ids));
    }

    private function setDeletedIds(array $ids): void
    {
        $key = $this->cacheKey();
        $unique = array_values(array_unique(array_map('intval', $ids)));
        Cache::forever($key, $unique);
    }

    private function removeDeletedId(int $id): void
    {
        $deletedIds = $this->getDeletedIds();
        $newIds = array_values(array_filter(
            $deletedIds,
            fn($x) => (int) $x !== (int) $id
        ));

        $this->setDeletedIds($newIds);
    }

    private function cacheKey(): string
    {
        return self::CACHE_NAMESPACE . ':' . self::CACHE_KEY;
    }
}