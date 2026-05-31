<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\WithFaker;
use App\Models\User;
use App\Models\Wilayah;
use Laravel\Sanctum\Sanctum;
use App\Models\Faskes;
use Tests\TestCase;

// =============================================================================
// FASKES CONTROLLER TESTS
// =============================================================================

class FaskesTest extends TestCase
{
    use DatabaseTransactions;

    private function actingAsAdmin(): void
    {
        $user = User::factory()->create(['role_id' => 2]);
        Sanctum::actingAs($user);
    }

   public function test_index_mengembalikan_semua_faskes()
{
    $this->actingAsAdmin();

    $wilayah = Wilayah::factory()->create();
    Faskes::factory()->count(3)->create([
        'wilayah_id' => $wilayah->id
    ]);

    $response = $this->getJson('/api/faskes');

    dump($response->getContent());

    $response->assertStatus(200);
}

    public function test_index_bisa_filter_berdasarkan_wilayah_id()
    {
         $this->actingAsAdmin();

        $w1 = Wilayah::factory()->create();
        $w2 = Wilayah::factory()->create();
        Faskes::factory()->count(2)->create(['wilayah_id' => $w1->id]);
        Faskes::factory()->count(3)->create(['wilayah_id' => $w2->id]);

        $response = $this->getJson('/api/faskes?wilayah_id=' . $w1->id);

        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_store_berhasil_tambah_faskes_baru()
    {
        $this->actingAsAdmin();
        $wilayah = Wilayah::factory()->create();

        $response = $this->postJson('/api/faskes', [
            'nama_faskes' => 'Puskesmas Maju',
            'wilayah_id'  => $wilayah->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'data']);

        $this->assertDatabaseHas('fasilitas_kesehatan', ['nama_faskes' => 'Puskesmas Maju']);
    }

    public function test_store_gagal_jika_wilayah_id_tidak_ada()
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/faskes', [
            'nama_faskes' => 'Klinik Test',
            'wilayah_id'  => 99999,
        ]);

        $response->assertStatus(422);
    }

    public function test_update_berhasil_ubah_nama_faskes()
    {
        $this->actingAsAdmin();
        $wilayah = Wilayah::factory()->create();
        $faskes  = Faskes::factory()->create(['wilayah_id' => $wilayah->id, 'nama_faskes' => 'Lama']);

        $response = $this->putJson('/api/faskes/' . $faskes->id, [
            'nama_faskes' => 'Klinik Baru',
            'wilayah_id'  => $wilayah->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('fasilitas_kesehatan', ['id' => $faskes->id, 'nama_faskes' => 'Klinik Baru']);
    }

    public function test_destroy_berhasil_hapus_faskes()
    {
        $this->actingAsAdmin();
        $wilayah = Wilayah::factory()->create();
        $faskes  = Faskes::factory()->create(['wilayah_id' => $wilayah->id]);

        $response = $this->deleteJson('/api/faskes/' . $faskes->id);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Data faskes berhasil dihapus']);

        $this->assertDatabaseMissing('fasilitas_kesehatan', ['id' => $faskes->id]);
    }
}

