<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\Kasus;
use App\Models\Penyakit;
use App\Models\Wilayah;
use App\Models\Faskes;
use Laravel\Sanctum\Sanctum;


// =============================================================================
// KASUS CONTROLLER TESTS
// =============================================================================

class KasusTest extends TestCase
{
    use DatabaseTransactions;

    private function buatUserAdmin(): User
    {
        return User::factory()->create(['role_id' => 2]);
    }

    private function buatDataPendukung(): array
    {
        $penyakit = Penyakit::factory()->create(['nama_penyakit' => 'Demam Berdarah', 'kode_icd' => 'A90']);
        $wilayah  = Wilayah::factory()->create(['nama_wilayah' => 'Kec. Barat']);
        $faskes   = Faskes::factory()->create(['wilayah_id' => $wilayah->id]);

        return compact('penyakit', 'wilayah', 'faskes');
    }

    // ─── INDEX ─────────────────────────────────────────────────────────────────

    public function test_index_mengembalikan_daftar_kasus_dengan_pagination()
    {
        $data = $this->buatDataPendukung();
        Kasus::factory()->count(5)->create([
            'penyakit_id' => $data['penyakit']->id,
            'wilayah_id'  => $data['wilayah']->id,
        ]);

        $response = $this->getJson('/api/kasus');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data', 'current_page', 'total', 'per_page',
            ]);
    }

    public function test_index_bisa_filter_berdasarkan_penyakit_id()
    {
        $data     = $this->buatDataPendukung();
        $penyakit2 = Penyakit::factory()->create(['nama_penyakit' => 'Malaria']);

        Kasus::factory()->count(3)->create(['penyakit_id' => $data['penyakit']->id, 'wilayah_id' => $data['wilayah']->id]);
        Kasus::factory()->count(2)->create(['penyakit_id' => $penyakit2->id, 'wilayah_id' => $data['wilayah']->id]);

        $response = $this->getJson('/api/kasus?penyakit_id=' . $data['penyakit']->id);

        $response->assertStatus(200);
        $this->assertEquals(3, $response->json('total'));
    }

    public function test_index_bisa_filter_berdasarkan_status()
    {
        $data = $this->buatDataPendukung();

        Kasus::factory()->count(2)->create([
            'penyakit_id' => $data['penyakit']->id,
            'wilayah_id'  => $data['wilayah']->id,
            'status'      => 'Sembuh',
        ]);
        Kasus::factory()->create([
            'penyakit_id' => $data['penyakit']->id,
            'wilayah_id'  => $data['wilayah']->id,
            'status'      => 'Meninggal',
        ]);

        $response = $this->getJson('/api/kasus?status=Sembuh');

        $response->assertStatus(200);
       return response()->json($data);
    }

    // ─── STORE ─────────────────────────────────────────────────────────────────

    public function test_store_berhasil_simpan_kasus_baru()
    {
        $user = $this->buatUserAdmin();
        $data = $this->buatDataPendukung();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/kasus', [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'faskes_id'     => $data['faskes']->id,
            'tanggal_kasus' => '2024-06-15',
            'umur'          => 25,
            'jenis_kelamin' => 'L',
            'status'        => 'Dirawat',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'data']);

        $this->assertDatabaseHas('kasus', ['umur' => 25, 'status' => 'Dirawat']);
    }

    public function test_store_gagal_tanpa_auth()
    {
        $data = $this->buatDataPendukung();

        $response = $this->postJson('/api/kasus', [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => '2024-06-15',
            'umur'          => 25,
            'jenis_kelamin' => 'L',
            'status'        => 'Dirawat',
        ]);

        $response->assertStatus(401);
    }

    public function test_store_gagal_validasi_jenis_kelamin_tidak_valid()
    {
        $user = $this->buatUserAdmin();
        $data = $this->buatDataPendukung();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/kasus', [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => '2024-06-15',
            'umur'          => 25,
            'jenis_kelamin' => 'X', // tidak valid
            'status'        => 'Dirawat',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['errors']);
    }

    public function test_store_gagal_validasi_umur_negatif()
    {
        $user = $this->buatUserAdmin();
        $data = $this->buatDataPendukung();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/kasus', [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => '2024-06-15',
            'umur'          => -1,
            'jenis_kelamin' => 'L',
            'status'        => 'Dirawat',
        ]);

        $response->assertStatus(422);
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────

    public function test_update_berhasil_ubah_data_kasus()
    {
        $user  = $this->buatUserAdmin();
        $data  = $this->buatDataPendukung();
        $kasus = Kasus::factory()->create([
            'penyakit_id' => $data['penyakit']->id,
            'wilayah_id'  => $data['wilayah']->id,
            'status'      => 'Dirawat',
        ]);

        Sanctum::actingAs($user);

        $response = $this->putJson("/api/kasus/{$kasus->id}", [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => $kasus->tanggal_kasus,
            'umur'          => $kasus->umur,
            'jenis_kelamin' => $kasus->jenis_kelamin,
            'status'        => 'Sembuh',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Data berhasil diupdate']);

        $this->assertDatabaseHas('kasus', ['id' => $kasus->id, 'status' => 'Sembuh']);
    }

    public function test_update_gagal_jika_id_tidak_ditemukan()
    {
        $user = $this->buatUserAdmin();
        $data = $this->buatDataPendukung();

        Sanctum::actingAs($user);

        $response = $this->putJson('/api/kasus/99999', [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => '2024-01-01',
            'umur'          => 30,
            'jenis_kelamin' => 'P',
            'status'        => 'Sembuh',
        ]);

        $response->assertStatus(404);
    }

    // ─── DELETE ────────────────────────────────────────────────────────────────

    // public function test_destroy_berhasil_hapus_kasus()
    // {
    //     $user  = $this->buatUserAdmin();
    //     $data  = $this->buatDataPendukung();
    //     $kasus = Kasus::factory()->create([
    //         'penyakit_id' => $data['penyakit']->id,
    //         'wilayah_id'  => $data['wilayah']->id,
    //     ]);

    //     Sanctum::actingAs($user);

    //     $response = $this->deleteJson("/api/kasus/{$kasus->id}");

    //     $response->assertStatus(200)
    //         ->assertJson(['message' => 'Data berhasil dihapus']);

    //     $this->assertDatabaseMissing('kasus', ['id' => $kasus->id]);
    // }

    // // ─── BULK DELETE ───────────────────────────────────────────────────────────

    // public function test_bulk_delete_berhasil_hapus_beberapa_kasus()
    // {
    //     $user  = $this->buatUserAdmin();
    //     $data  = $this->buatDataPendukung();
    //     $kasus = Kasus::factory()->count(3)->create([
    //         'penyakit_id' => $data['penyakit']->id,
    //         'wilayah_id'  => $data['wilayah']->id,
    //     ]);

    //     Sanctum::actingAs($user);

    //     $ids = $kasus->pluck('id')->toArray();

    //     $response = $this->deleteJson('/api/kasus/bulkDelete', ['ids' => $ids]);

    //     $response->assertStatus(200)
    //         ->assertJsonPath('data.total_deleted', 3);

    //     foreach ($ids as $id) {
    //         $this->assertDatabaseMissing('kasus', ['id' => $id]);
    //     }
    // }

    public function test_bulk_delete_gagal_jika_ids_kosong()
    {
        $user = $this->buatUserAdmin();
        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/kasus/bulkDelete', ['ids' => []]);

        $response->assertStatus(422);
    }

    public function test_bulk_delete_gagal_jika_id_tidak_ada_di_database()
    {
        $user = $this->buatUserAdmin();
        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/kasus/bulkDelete', ['ids' => [7, 3000]]);

        $response->assertStatus(422);
    }

    // ─── BULK IMPORT ───────────────────────────────────────────────────────────

    // public function test_bulk_import_berhasil_insert_banyak_rows()
    // {
    //     $user = $this->buatUserAdmin();
    //     $data = $this->buatDataPendukung();

    //     Sanctum::actingAs($user);

    //     $rows = [];
    //     for ($i = 0; $i < 5; $i++) {
    //         $rows[] = [
    //             'penyakit_id'   => $data['penyakit']->id,
    //             'wilayah_id'    => $data['wilayah']->id,
    //             'faskes_id'     => $data['faskes']->id,
    //             'tanggal_kasus' => '2024-07-0' . ($i + 1),
    //             'umur'          => 20 + $i,
    //             'jenis_kelamin' => 'L',
    //             'status'        => 'Sembuh',
    //         ];
    //     }

    //     $response = $this->postJson('/api/kasus/import', ['rows' => $rows]);

    //     $response->assertStatus(201)
    //         ->assertJsonPath('total', 5);

    //     $this->assertDatabaseCount('kasus', 5);
    // }

    public function test_bulk_import_gagal_jika_rows_melebihi_5000()
    {
        $user = $this->buatUserAdmin();
        $data = $this->buatDataPendukung();

        Sanctum::actingAs($user);

        $rows = array_fill(0, 5001, [
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => '2024-01-01',
            'umur'          => 25,
            'jenis_kelamin' => 'P',
            'status'        => 'Sembuh',
        ]);

        $response = $this->postJson('/api/kasus/import', ['rows' => $rows]);

        $response->assertStatus(422);
    }

    // ─── STATISTIK ─────────────────────────────────────────────────────────────

    public function test_statistik_mengembalikan_data_ringkasan()
    {
        $data = $this->buatDataPendukung();
        Kasus::factory()->count(3)->create([
            'penyakit_id'   => $data['penyakit']->id,
            'wilayah_id'    => $data['wilayah']->id,
            'tanggal_kasus' => now()->format('Y-m-15'),
            'status'        => 'Sembuh',
        ]);

        $response = $this->getJson('/api/kasus/statistik?bulan=' . now()->format('Y-m'));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'bulan', 'total_kasus', 'total_sembuh',
                'penyakit_terbanyak', 'kasus_by_penyakit',
            ]);
    }
}
