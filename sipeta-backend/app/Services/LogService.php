<?php
// app/Services/ActivityLogService.php
namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;

class ActivityLogService
{
    /**
     * Catat aktivitas ke tabel activity_log.
     * Panggil dari controller mana saja.
     *
     * Contoh penggunaan:
     *   ActivityLogService::log('Login', 'Auth', 'User admin@sipeta.id berhasil login');
     *   ActivityLogService::log('Tambah Data', 'Kasus', 'Menambahkan 1 data kasus ISPA wilayah Patrang');
     *   ActivityLogService::log('Export', 'File', 'Export Excel 97 data kasus');
     */
    public static function log(
        string $aktivitas,
        string $modul,
        string $deskripsi = '',
        ?int   $userId    = null
    ): void {
        try {
            $uid = $userId ?? auth()->id();
            DB::table('activity_log')->insert([
                'user_id'    => $uid,
                'aktivitas'  => $aktivitas,
                'modul'      => $modul,
                'deskripsi'  => $deskripsi,
                'user_agent' => Request::userAgent(),
                'timestamp'  => now(),
            ]);
        } catch (\Throwable) {
            // Jangan sampai gagal log menghentikan flow utama
        }
    }

    // ── Shortcut methods ─────────────────────────────────────────────────────

    public static function login(string $email): void
    {
        static::log('Login', 'Auth', "Login berhasil: $email");
    }

    public static function logout(string $email): void
    {
        static::log('Logout', 'Auth', "Logout: $email");
    }

    public static function tambahKasus(string $penyakit, string $wilayah): void
    {
        static::log('Tambah Data', 'Kasus', "Menambah data kasus $penyakit di $wilayah");
    }

    public static function editKasus(int $id, string $penyakit): void
    {
        static::log('Edit Data', 'Kasus', "Mengedit data kasus #$id ($penyakit)");
    }

    public static function hapusKasus(int $id): void
    {
        static::log('Hapus Data', 'Kasus', "Menghapus data kasus #$id");
    }

    public static function importFile(string $namaFile, int $jumlah, string $status): void
    {
        static::log('Import File', 'File', "Import $namaFile — $jumlah data — $status");
    }

    public static function exportFile(string $namaFile, string $format): void
    {
        static::log('Export File', 'File', "Export $namaFile ($format)");
    }

    public static function runClustering(string $penyakit, string $periode): void
    {
        static::log('Clustering', 'GIS', "Jalankan K-Means untuk $penyakit periode $periode");
    }
}