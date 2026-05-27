<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penyakit extends Model
{
    // Mengarahkan ke nama tabel yang ada di pgAdmin Anda
    protected $table = 'penyakit';

    // NONAKTIFKAN TIMESTAMPS karena kolom created_at & updated_at tidak ada di tabel pgAdmin
    public $timestamps = false;

    // Daftarkan semua kolom agar bisa diisi secara Mass Assignment (Penyakit::create)
    protected $fillable = [
        'nama_penyakit',
        'kode_icd',
        'kategori',
        'threshold_ews'
    ];

    /**
     * Relasi ke tabel Kasus (One to Many)
     */
    public function kasus()
    {
        return $this->hasMany(Kasus::class);
    }
}