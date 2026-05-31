<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Laravel\Sanctum\Sanctum;


class SettingsTest extends TestCase
{
    use DatabaseTransactions;

    // ─── PROFILE ──────────────────────────────────────────────────────────────

    public function test_profile_mengembalikan_data_user_yang_login()
    {
        $user = User::factory()->create(['name' => 'Budi Santoso']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/profile');

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Budi Santoso')
            ->assertJsonStructure(['id', 'name', 'email', 'phone', 'avatar', 'role']);
    }

    public function test_profile_gagal_tanpa_auth()
    {
        $response = $this->getJson('/api/profile');

        $response->assertStatus(401);
    }

    // ─── UPDATE PROFILE ────────────────────────────────────────────────────────

    public function test_update_profile_berhasil_ubah_nama_dan_telepon()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/profile', [
            'name'  => 'Nama Baru',
            'phone' => '081234567890',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.name', 'Nama Baru');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Nama Baru']);
    }

    public function test_update_profile_berhasil_upload_avatar()
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $file = UploadedFile::fake()->image('avatar.jpg', 300, 300);

        $response = $this->postJson('/api/profile', [
            'avatar' => $file,
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('user.avatar'));
    }

    public function test_update_profile_gagal_jika_avatar_bukan_gambar()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/profile', [
            'avatar' => $file,
        ]);

        $response->assertStatus(422);
    }

    // ─── UPDATE PASSWORD ───────────────────────────────────────────────────────

    public function test_update_password_berhasil_dengan_current_password_benar()
    {
        $user = User::factory()->create([
            'password' => Hash::make('passwordLama'),
        ]);
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/password', [
            'current' => 'passwordLama',
            'newPass' => 'passwordBaru123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password updated']);

        $user->refresh();
        $this->assertTrue(Hash::check('passwordBaru123', $user->password));
    }

    public function test_update_password_gagal_jika_current_password_salah()
    {
        $user = User::factory()->create([
            'password' => Hash::make('passwordBenar'),
        ]);
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/password', [
            'current' => 'passwordSalah',
            'newPass' => 'passwordBaru123',
        ]);

        $response->assertStatus(400)
            ->assertJson(['message' => 'Password salah']);
    }

    public function test_update_password_gagal_jika_new_password_kurang_dari_6_karakter()
    {
        $user = User::factory()->create([
            'password' => Hash::make('passwordLama'),
        ]);
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/password', [
            'current' => 'passwordLama',
            'newPass' => '123',
        ]);

        $response->assertStatus(422);
    }
}
