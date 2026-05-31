<?php

namespace App\Http\Controllers;

use App\Models\Populasi;
use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WilayahController extends Controller
{
    private const CACHE_NAMESPACE = 'master_delete_cache_v1';
    private const CACHE_KEY = 'deleted_wilayah_ids';

    /**
     * AMBIL SEMUA DATA WILAYAH (filter cache terhapus)
     */
    public function index()
    {
        $tahun = now()->year;
        $deletedIds = $this->getDeletedIds();

        $data = Wilayah::orderBy('nama_wilayah')
            ->leftJoin('populasi', function ($join) use ($tahun) {
                $join->on('wilayah.id', '=', 'populasi.wilayah_id')
                    ->where('populasi.tahun', '=', $tahun);
            })
            ->select('wilayah.*', DB::raw('populasi.jumlah as populasi_jumlah'));

        if (!empty($deletedIds)) {
            $data->whereNotIn('wilayah.id', $deletedIds);
        }

        return response()->json($data->get());
    }

    /**
     * SIMPAN DATA WILAYAH BARU (anti-duplikat + restore cache)
     */
    public function store(Request $request)
    {
        $request->validate([
            'nama_wilayah'      => 'required|string|max:100',
            'level'             => 'nullable|string',
            'parent_id'         => 'nullable',
            'populasi_jumlah'   => 'nullable|numeric',
        ]);

        $tahun = now()->year;
        $nama = trim($request->input('nama_wilayah'));
        $deletedIds = $this->getDeletedIds();

        $existing = Wilayah::whereRaw('lower(nama_wilayah) = lower(?)', [$nama])->first();

        if ($existing) {
            // Jika sudah ada dan ID tidak terhapus -> error 422
            if (!in_array((int) $existing->id, $deletedIds, true)) {
                return response()->json([
                    'success' => false,
                    'message' => "Data {$nama} sudah ada!"
                ], 422);
            }

            // Jika ada tapi terhapus -> restore (hapus dari cache)
            $this->removeDeletedId((int) $existing->id);

            // (jangan ubah data master lain yang sudah ada) update field yang diberikan
            $payloadWilayah = $request->only(['nama_wilayah', 'level']);
            $existing->update($payloadWilayah);

            $jumlah = $request->input('populasi_jumlah');
            if ($jumlah !== null && $jumlah !== '') {
                Populasi::updateOrCreate(
                    ['wilayah_id' => $existing->id, 'tahun' => $tahun],
                    ['jumlah' => $jumlah]
                );
            }

            $existing->populasi_jumlah = Populasi::where('wilayah_id', $existing->id)
                ->where('tahun', $tahun)
                ->value('jumlah');

            return response()->json($existing, 200);
        }

        // Benar-benar baru -> insert
        $payloadWilayah = $request->only(['nama_wilayah', 'level', 'parent_id']);
        $wilayah = Wilayah::create($payloadWilayah);

        $jumlah = $request->input('populasi_jumlah');
        if ($jumlah !== null && $jumlah !== '') {
            Populasi::updateOrCreate(
                ['wilayah_id' => $wilayah->id, 'tahun' => $tahun],
                ['jumlah' => $jumlah]
            );
        }

        $wilayah->populasi_jumlah = Populasi::where('wilayah_id', $wilayah->id)
            ->where('tahun', $tahun)
            ->value('jumlah');

        return response()->json($wilayah, 201);
    }

    /**
     * TAMPILKAN SPESIFIK DETAIL WILAYAH BY ID
     * (tetap seperti sebelumnya; tidak filter cache untuk endpoint show)
     */
    public function show($id)
    {
        return response()->json(Wilayah::findOrFail($id));
    }

    /**
     * UBAH DATA WILAYAH
     * (tidak diubah agar data existing datamaster tidak berubah behavior)
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'nama_wilayah'      => 'sometimes|required|string|max:100',
            'level'             => 'nullable|string',
            'parent_id'         => 'nullable',
            'populasi_jumlah'   => 'nullable|numeric',
        ]);

        $w = Wilayah::findOrFail($id);

        if ($request->filled('nama_wilayah')) {
            $nama = trim($request->input('nama_wilayah'));
            $existing = Wilayah::whereRaw('lower(nama_wilayah) = lower(?)', [$nama])
                ->where('id', '!=', $id)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nama wilayah sudah ada, duplikat tidak diperbolehkan.'
                ], 409);
            }
        }

        $payloadWilayah = $request->only(['nama_wilayah', 'level']);
        $w->update($payloadWilayah);

        $tahun = now()->year;
        $jumlah = $request->input('populasi_jumlah');
        if ($jumlah !== null && $jumlah !== '') {
            Populasi::updateOrCreate(
                ['wilayah_id' => $w->id, 'tahun' => $tahun],
                ['jumlah' => $jumlah]
            );
        }

        return response()->json($w);
    }

    /**
     * HAPUS DATA WILAYAH (tidak DELETE fisik; simpan ID ke cache terhapus)
     */
    public function destroy($id)
    {
        try {
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
            fn ($x) => (int) $x !== (int) $id
        ));

        $this->setDeletedIds($newIds);
    }

    private function cacheKey(): string
    {
        return self::CACHE_NAMESPACE . ':' . self::CACHE_KEY;
    }
}


