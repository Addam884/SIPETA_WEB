<?php

namespace App\Http\Controllers;

use App\Models\Penyakit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PenyakitController extends Controller
{
    private const CACHE_NAMESPACE = 'master_delete_cache_v1';
    private const CACHE_KEY = 'deleted_penyakit_ids';

    public function index()
    {
        $deletedIds = $this->getDeletedIds();

        $query = Penyakit::orderBy('nama_penyakit');

        if (!empty($deletedIds)) {
            $query->whereNotIn('id', $deletedIds);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_penyakit' => 'required|string|max:100',
            'kode_icd'      => 'nullable|string|max:20',
            'kategori'      => 'nullable|string',
            'threshold_ews' => 'nullable|numeric',
        ]);

        $nama = trim($request->input('nama_penyakit'));
        $deletedIds = $this->getDeletedIds();

        $existing = Penyakit::whereRaw('lower(nama_penyakit) = lower(?)', [$nama])->first();

        if ($existing) {
            if (!in_array((int) $existing->id, $deletedIds, true)) {
                return response()->json([
                    'success' => false,
                    'message' => "Data {$nama} sudah ada!"
                ], 422);
            }

            // Restore: hapus dari cache terhapus
            $this->removeDeletedId((int) $existing->id);

            $payload = $request->all();
            if (isset($payload['threshold_ews'])) {
                $payload['threshold_ews'] = (float) $payload['threshold_ews'];
            }

            $existing->update($payload);
            return response()->json($existing, 200);
        }

        $payload = $request->all();

        if (isset($payload['threshold_ews'])) {
            $payload['threshold_ews'] = (float) $payload['threshold_ews'];
        }

        return response()->json(Penyakit::create($payload), 201);
    }

    public function show($id)
    {
        return response()->json(Penyakit::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        // Tetap gunakan logika existing agar data master tidak berubah behavior di edit
        $data = Penyakit::findOrFail($id);

        $payload = $request->all();
        if (isset($payload['threshold_ews'])) {
            $payload['threshold_ews'] = (float) $payload['threshold_ews'];
        }

        $data->update($payload);
        return response()->json($data);
    }

    public function destroy($id)
    {
        try {
            $penyakit = Penyakit::find($id);

            if (!$penyakit) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penyakit tidak ditemukan.'
                ], 404);
            }

            $deletedIds = $this->getDeletedIds();
            if (!in_array((int) $id, $deletedIds, true)) {
                $deletedIds[] = (int) $id;
            }
            $this->setDeletedIds($deletedIds);

            return response()->json([
                'success' => true,
                'message' => 'Data penyakit disembunyikan (soft delete via cache).'
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Gagal Destroy Penyakit: ' . $e->getMessage());
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

