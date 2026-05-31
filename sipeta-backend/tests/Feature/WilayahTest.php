<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\Wilayah;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// =============================================================================
// WILAYAH CONTROLLER TESTS
// =============================================================================

class WilayahTest extends TestCase
{
    use DatabaseTransactions;

    private function actingAsAdmin(): void
    {
        $user = User::factory()->create(['role_id' => 2]);
        Sanctum::actingAs($user);
    }

    public function test_index_mengembalikan_semua_wilayah()
    {
        Wilayah::factory()->count(4)->create();

        $response = $this->getJson('/api/wilayah');

        $response->assertStatus(200);
        $this->assertCount(4, $response->json());
    }

    public function test_store_berhasil_tambah_wilayah_baru()
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/wilayah', [
            'nama_wilayah' => 'Kecamatan Selatan',
            'level'        => 'kecamatan',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('wilayah', ['nama_wilayah' => 'Kecamatan Selatan']);
    }

    public function test_store_gagal_jika_nama_wilayah_kosong()
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/wilayah', [
            'level' => 'kecamatan',
        ]);

        $response->assertStatus(422);
    }

    public function test_show_mengembalikan_detail_wilayah()
    {
        $wilayah = Wilayah::factory()->create(['nama_wilayah' => 'Kec. Utara']);

        $response = $this->getJson('/api/wilayah/' . $wilayah->id);

        $response->assertStatus(200)
            ->assertJsonPath('nama_wilayah', 'Kec. Utara');
    }

    public function test_update_berhasil_ubah_nama_wilayah()
    {
        $this->actingAsAdmin();
        $wilayah = Wilayah::factory()->create(['nama_wilayah' => 'Lama']);

        $response = $this->putJson('/api/wilayah/' . $wilayah->id, [
            'nama_wilayah' => 'Diperbarui',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('wilayah', ['id' => $wilayah->id, 'nama_wilayah' => 'Diperbarui']);
    }

    public function test_destroy_berhasil_hapus_wilayah()
    {
        $this->actingAsAdmin();
        $wilayah = Wilayah::factory()->create();

        $response = $this->deleteJson('/api/wilayah/' . $wilayah->id);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Wilayah berhasil dihapus']);

        $this->assertDatabaseMissing('wilayah', ['id' => $wilayah->id]);
    }
}