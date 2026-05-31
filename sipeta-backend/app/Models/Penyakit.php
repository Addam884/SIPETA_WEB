<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Penyakit extends Model
{
    use HasFactory;
    protected $table = 'penyakit';

    public $timestamps = false;

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