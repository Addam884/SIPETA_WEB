<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Mail\ResetPasswordMail;
use Carbon\Carbon;

// =============================================================================
// AUTH CONTROLLER TESTS
// =============================================================================

class AuthTest extends TestCase
{
    use DatabaseTransactions;

    // ─── REGISTER ─────────────────────────────────────────────────────────────

    public function test_register_berhasil_dengan_data_valid()
    {
        $response = $this->postJson('/api/register', [
            'name'     => 'User Baru',
            'email'    => 'userbaru@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'user']);

        $this->assertDatabaseHas('users', ['email' => 'userbaru@example.com']);
    }

    public function test_register_gagal_jika_email_sudah_ada()
    {
        User::factory()->create(['email' => 'duplikat@example.com']);

        $response = $this->postJson('/api/register', [
            'name'     => 'User Lain',
            'email'    => 'duplikat@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_register_gagal_jika_password_kurang_dari_6_karakter()
    {
        $response = $this->postJson('/api/register', [
            'name'     => 'User Test',
            'email'    => 'test@example.com',
            'password' => '123',
        ]);

        $response->assertStatus(422);
    }

    // ─── LOGIN ─────────────────────────────────────────────────────────────────

    public function test_login_berhasil_dengan_kredensial_benar()
    {

        $response = $this->postJson('/api/login', [
            'email'    => 'admin@gmail.com',
            'password' => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_login_gagal_dengan_password_salah()
    {
        User::factory()->create([
            'email'    => 'user@example.com',
            'password' => Hash::make('passwordBenar'),
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'user@example.com',
            'password' => 'passwordSalah',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Email / password salah']);
    }

    public function test_login_gagal_dengan_email_tidak_terdaftar()
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'tidakada@example.com',
            'password' => 'apasaja',
        ]);

        $response->assertStatus(401);
    }

    // ─── OTP / FORGOT PASSWORD ─────────────────────────────────────────────────

    public function test_send_otp_berhasil_untuk_email_terdaftar()
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'otp@example.com']);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'otp@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'OTP telah dikirim ke email Anda']);

        Mail::assertSent(ResetPasswordMail::class);
    }

    public function test_send_otp_gagal_untuk_email_tidak_terdaftar()
    {
        $response = $this->postJson('/api/forgot-password', [
            'email' => 'tidakterdaftar@example.com',
        ]);

        $response->assertStatus(422);
    }

    public function test_verify_otp_berhasil_dengan_otp_valid()
    {
        $user = User::factory()->create([
            'email'          => 'verify@example.com',
            'otp'            => '123456',
            'otp_expires_at' => Carbon::now()->addMinutes(15),
        ]);

        $response = $this->postJson('/api/verify-otp', [
            'email' => 'verify@example.com',
            'otp'   => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'OTP valid']);
    }

    public function test_verify_otp_gagal_jika_otp_kadaluwarsa()
    {
        $user = User::factory()->create([
            'email'          => 'expired@example.com',
            'otp'            => '999999',
            'otp_expires_at' => Carbon::now()->subMinutes(5), // sudah lewat
        ]);

        $response = $this->postJson('/api/verify-otp', [
            'email' => 'expired@example.com',
            'otp'   => '999999',
        ]);

        $response->assertStatus(400);
    }

    public function test_reset_password_berhasil_dengan_otp_valid()
    {
        $user = User::factory()->create([
            'email'          => 'reset@example.com',
            'otp'            => '654321',
            'otp_expires_at' => Carbon::now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/reset-password', [
            'email'    => 'reset@example.com',
            'otp'      => '654321',
            'password' => 'passwordBaru123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password berhasil diubah. Silakan login.']);

        $user->refresh();
        $this->assertTrue(Hash::check('passwordBaru123', $user->password));
        $this->assertNull($user->otp);
    }
}

// // =============================================================================
// // LOG CONTROLLER TESTS
// // =============================================================================

// class LogControllerTest extends TestCase
// {
//     use RefreshDatabase;

//     private function actingAsAdmin(): void
//     {
//         $user = User::factory()->create(['role_id' => 2]);
//         Sanctum::actingAs($user);
//     }

//     public function test_summary_mengembalikan_struktur_yang_benar()
//     {
//         $this->actingAsAdmin();

//         $response = $this->getJson('/api/logs/summary');

//         $response->assertStatus(200)
//             ->assertJsonStructure([
//                 'kasus_hari_ini',
//                 'aktivitas_hari_ini',
//                 'import_hari_ini',
//                 'export_hari_ini',
//                 'tambah_bulan_ini',
//                 'edit_bulan_ini',
//                 'hapus_bulan_ini',
//             ]);
//     }

//     public function test_riwayat_kasus_mengembalikan_data_terpaginasi()
//     {
//         $this->actingAsAdmin();

//         $response = $this->getJson('/api/logs/kasus');

//         $response->assertStatus(200)
//             ->assertJsonStructure(['data', 'current_page', 'total']);
//     }

//     public function test_riwayat_kasus_filter_berdasarkan_aksi()
//     {
//         $this->actingAsAdmin();

//         $response = $this->getJson('/api/logs/kasus?aksi=Tambah');

//         $response->assertStatus(200);
//     }

//     public function test_riwayat_kasus_filter_berdasarkan_rentang_tanggal()
//     {
//         $this->actingAsAdmin();

//         $from = now()->subDays(7)->format('Y-m-d');
//         $to   = now()->format('Y-m-d');

//         $response = $this->getJson("/api/logs/kasus?from={$from}&to={$to}");

//         $response->assertStatus(200);
//     }

//     public function test_riwayat_aktivitas_mengembalikan_data_terpaginasi()
//     {
//         $this->actingAsAdmin();

//         $response = $this->getJson('/api/logs/aktivitas');

//         $response->assertStatus(200)
//             ->assertJsonStructure(['data', 'current_page', 'total']);
//     }

//     public function test_riwayat_file_mengembalikan_data_terpaginasi()
//     {
//         $this->actingAsAdmin();

//         $response = $this->getJson('/api/logs/file');

//         $response->assertStatus(200)
//             ->assertJsonStructure(['data', 'current_page', 'total']);
//     }

//     public function test_riwayat_file_filter_berdasarkan_status()
//     {
//         $this->actingAsAdmin();

//         $response = $this->getJson('/api/logs/file?status=success');

//         $response->assertStatus(200);
//     }

//     public function test_semua_endpoint_log_butuh_auth()
//     {
//         $endpoints = [
//             '/api/logs/summary',
//             '/api/logs/kasus',
//             '/api/logs/aktivitas',
//             '/api/logs/file',
//         ];

//         foreach ($endpoints as $endpoint) {
//             $this->getJson($endpoint)->assertStatus(401);
//         }
//     }
// }


// // =============================================================================
// // SUPERADMIN CONTROLLER TESTS
// // =============================================================================

// class SuperAdminControllerTest extends TestCase
// {
//     use RefreshDatabase;

//     private function actingAsSuperAdmin(): void
//     {
//         $user = User::factory()->create(['role_id' => 1]);
//         Sanctum::actingAs($user);
//     }

//     public function test_dashboard_mengembalikan_semua_stats()
//     {
//         $this->actingAsSuperAdmin();

//         $response = $this->getJson('/api/superadmin/dashboard');

//         $response->assertStatus(200)
//             ->assertJsonStructure([
//                 'stats' => [
//                     'totalKasus', 'totalUsers', 'totalFaskes',
//                     'totalWilayah', 'totalPenyakit', 'totalImport',
//                     'kasusHariIni', 'logError',
//                 ],
//                 'users_by_role',
//                 'tren_kasus',
//                 'recent_activity',
//                 'recent_imports',
//                 'kasus_log',
//             ]);
//     }

//     public function test_dashboard_filter_berdasarkan_tahun()
//     {
//         $this->actingAsSuperAdmin();

//         $response = $this->getJson('/api/superadmin/dashboard?tahun=2024');

//         $response->assertStatus(200);
//     }

//     public function test_dashboard_tren_kasus_selalu_12_bulan()
//     {
//         $this->actingAsSuperAdmin();

//         $response = $this->getJson('/api/superadmin/dashboard');

//         $response->assertStatus(200);
//         $this->assertCount(12, $response->json('tren_kasus'));
//     }

//     public function test_dashboard_mengembalikan_recent_activity_max_10()
//     {
//         $this->actingAsSuperAdmin();

//         $response = $this->getJson('/api/superadmin/dashboard');

//         $response->assertStatus(200);
//         $this->assertLessThanOrEqual(10, count($response->json('recent_activity')));
//     }

//     public function test_dashboard_gagal_tanpa_auth()
//     {
//         $response = $this->getJson('/api/superadmin/dashboard');

//         $response->assertStatus(401);
//     }
// }