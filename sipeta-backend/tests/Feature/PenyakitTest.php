<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\Penyakit;
use Laravel\Sanctum\Sanctum;


// =============================================================================
// PENYAKIT CONTROLLER TESTS
// =============================================================================

class PenyakitTest extends TestCase
{
    use DatabaseTransactions;

    private function actingAsAdmin(): void
    {
        $user = User::factory()->create(['role_id' => 2]);
        Sanctum::actingAs($user);
    }

    public function test_index_mengembalikan_semua_penyakit()
{
    $this->actingAsAdmin();

    $jumlahAwal = Penyakit::count();

    Penyakit::factory()->count(3)->create();

    $response = $this->getJson('/api/penyakit');

    $response->assertStatus(200);

    $this->assertCount(
        $jumlahAwal + 3,
        $response->json()
    );
}

    public function test_store_berhasil_tambah_penyakit_baru()
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/penyakit', [
            'nama_penyakit' => 'Tuberculosis',
            'kode_icd' => 'A15',
            'kategori' => 'Infeksi',
            'threshold_ews' => 10,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('penyakit', ['kode_icd' => 'A15']);
    }

    public function test_store_gagal_jika_nama_penyakit_kosong()
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/penyakit', [
            'kode_icd' => 'A15',
        ]);

        $response->assertStatus(422);
    }

    public function test_show_mengembalikan_detail_penyakit()
    {
        $this->actingAsAdmin();

        $penyakit = Penyakit::factory()->create([
            'nama_penyakit' => 'Hepatitis B'
        ]);

        $response = $this->getJson('/api/penyakit/' . $penyakit->id);

        $response->assertStatus(200)
            ->assertJsonPath('nama_penyakit', 'Hepatitis B');
    }

    public function test_show_mengembalikan_404_jika_tidak_ditemukan()
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/penyakit/99999');

        $response->assertStatus(404);
    }

    public function test_update_berhasil_ubah_data_penyakit()
    {
        $this->actingAsAdmin();
        $penyakit = Penyakit::factory()->create(['nama_penyakit' => 'Lama']);

        $response = $this->putJson('/api/penyakit/' . $penyakit->id, [
            'nama_penyakit' => 'Baru',
            'kode_icd' => 'Z99',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('penyakit', ['id' => $penyakit->id, 'nama_penyakit' => 'Baru']);
    }

    public function test_destroy_berhasil_hapus_penyakit()
    {
        $this->actingAsAdmin();
        $penyakit = Penyakit::factory()->create();

        $response = $this->deleteJson('/api/penyakit/' . $penyakit->id);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Penyakit berhasil dihapus']);

        $this->assertDatabaseMissing('penyakit', ['id' => $penyakit->id]);
    }
}

