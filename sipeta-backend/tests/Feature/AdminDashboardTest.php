<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\Kasus;
use App\Models\Penyakit;
use App\Models\Wilayah;
use Laravel\Sanctum\Sanctum;
// =============================================================================
// ADMIN DASHBOARD CONTROLLER TESTS
// =============================================================================

class AdminDashboardTest extends TestCase
{
    use DatabaseTransactions;

    private function actingAsAdmin(): User
    {
        $user = User::factory()->create(['role_id' => 2]);
        Sanctum::actingAs($user);
        return $user;
    }

    private function seedKasus(int $jumlah = 5, array $override = []): void
    {
        $penyakit = Penyakit::factory()->create();
        $wilayah = Wilayah::factory()->create();

        Kasus::factory()->count($jumlah)->create(array_merge([
            'penyakit_id' => $penyakit->id,
            'wilayah_id' => $wilayah->id,
            'tanggal_kasus' => now()->format('Y-m-15'),
        ], $override));
    }

    // ─── STATISTIK ─────────────────────────────────────────────────────────────

    public function test_statistik_mengembalikan_total_kasus_per_tahun()
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/dashboard-admin-controller/statistik?tahun=' . now()->year);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'tahun',
                'total_kasus',
                'total_dirawat',
                'total_sembuh',
                'total_meninggal',
                'penyakit_terbanyak',
                'kasus_by_penyakit',
            ]);

        $this->assertGreaterThanOrEqual(0, $response->json('total_kasus'));
    }

    public function test_statistik_default_gunakan_tahun_sekarang()
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/dashboard-admin-controller/statistik');

        $response->assertStatus(200)
            ->assertJsonPath('tahun', now()->year);
    }

    // ─── TREND PENYAKIT ────────────────────────────────────────────────────────

    public function test_trend_penyakit_mengembalikan_12_bulan()
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/dashboard-admin-controller/trend?tahun=' . now()->year);

        $response->assertStatus(200);
        $this->assertCount(12, $response->json());
    }

    public function test_trend_penyakit_bisa_filter_per_penyakit_id()
    {
        $this->actingAsAdmin();
        $penyakit = Penyakit::factory()->create();
        $wilayah = Wilayah::factory()->create();

        Kasus::factory()->count(3)->create([
            'penyakit_id' => $penyakit->id,
            'wilayah_id' => $wilayah->id,
            'tanggal_kasus' => now()->format('Y-m-10'),
        ]);

        $response = $this->getJson(
            '/api/dashboard-admin-controller/trend?tahun=' . now()->year
            . '&penyakit_id=' . $penyakit->id
        );

        $response->assertStatus(200);
        $this->assertCount(12, $response->json());
    }

    // ─── DISTRIBUSI WILAYAH ────────────────────────────────────────────────────

    public function test_distribusi_wilayah_mengembalikan_top_4()
    {
        $this->actingAsAdmin();
        $penyakit = Penyakit::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $wilayah = Wilayah::factory()->create();
            Kasus::factory()->count($i + 1)->create([
                'penyakit_id' => $penyakit->id,
                'wilayah_id' => $wilayah->id,
                'tanggal_kasus' => now()->format('Y-m-10'),
            ]);
        }

        $response = $this->getJson('/api/dashboard-admin-controller/wilayah?tahun=' . now()->year);

        $response->assertStatus(200);
        $this->assertLessThanOrEqual(4, count($response->json()));
    }
}