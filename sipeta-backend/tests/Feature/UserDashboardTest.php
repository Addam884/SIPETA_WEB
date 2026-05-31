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
// USER DASHBOARD CONTROLLER TESTS
// =============================================================================

class UserDashboardTest extends TestCase
{
    use DatabaseTransactions;
    private function actingAsUser(): User
    {
        $user = User::factory()->create(['role_id' => 3]);
        Sanctum::actingAs($user);
        return $user;
    }

    private function seedKasus(string $tanggal = null, string $status = 'Sembuh'): Kasus
    {
        $penyakit = Penyakit::factory()->create();
        $wilayah  = Wilayah::factory()->create();

        return Kasus::factory()->create([
            'penyakit_id'   => $penyakit->id,
            'wilayah_id'    => $wilayah->id,
            'tanggal_kasus' => $tanggal ?? now()->format('Y-m-15'),
            'status'        => $status,
        ]);
    }

    // ─── STATS SUMMARY ────────────────────────────────────────────────────────

    public function test_stats_summary_mengembalikan_total_kasus_dan_wilayah()
    {
        $this->actingAsUser();
        $this->seedKasus();

        $response = $this->getJson('/api/dashboard/summary');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_kasus', 'total_wilayah',
                'penyakit_dominan', 'jumlah_penyakit_dominan',
            ]);
    }

    public function test_stats_summary_filter_berdasarkan_tahun()
    {
        $this->actingAsUser();
        $this->seedKasus('2024-03-15');

        $response = $this->getJson('/api/dashboard/summary?tahun=2024');

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $response->json('total_kasus'));
    }

    // ─── STATISTIK ─────────────────────────────────────────────────────────────

    public function test_statistik_mengembalikan_breakdown_status()
    {
        $this->actingAsUser();
        $this->seedKasus(now()->format('Y-m-10'), 'Sembuh');
        $this->seedKasus(now()->format('Y-m-10'), 'Dirawat');

        $response = $this->getJson('/api/dashboard/statistik?bulan=' . now()->format('Y-m'));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'bulan', 'total_kasus', 'total_dirawat',
                'total_sembuh', 'total_meninggal',
            ]);
    }

    // ─── TREN BULANAN ─────────────────────────────────────────────────────────

    public function test_tren_bulanan_mengembalikan_12_data_bulan()
    {
        $this->actingAsUser();

        $response = $this->getJson('/api/dashboard/tren-bulanan?tahun=' . now()->year);

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'tahun', 'data'])
            ->assertJsonPath('status', 'success');

        $this->assertCount(12, $response->json('data'));
    }

    public function test_tren_bulanan_nilai_bulan_tanpa_data_adalah_nol()
    {
        $this->actingAsUser();

        $response = $this->getJson('/api/dashboard/tren-bulanan?tahun=2000');

        $response->assertStatus(200);

        $data = $response->json('data');
        foreach ($data as $bulan) {
            $this->assertEquals(0, $bulan['jumlah_kasus']);
        }
    }

    // ─── STATS FASKES ─────────────────────────────────────────────────────────

    public function test_stats_faskes_mengembalikan_data_dengan_persentase()
    {
        $this->actingAsUser();

        $penyakit = Penyakit::factory()->create();
        $wilayah  = Wilayah::factory()->create();
        $faskes   = Faskes::factory()->create(['wilayah_id' => $wilayah->id]);

        Kasus::factory()->count(4)->create([
            'penyakit_id'   => $penyakit->id,
            'wilayah_id'    => $wilayah->id,
            'faskes_id'     => $faskes->id,
            'tanggal_kasus' => now()->format('Y-m-10'),
        ]);

        $response = $this->getJson('/api/dashboard/stats-faskes');

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'data'])
            ->assertJsonPath('status', 'success');

        $pertama = $response->json('data.0');
        $this->assertArrayHasKey('persentase', $pertama);
    }
}

