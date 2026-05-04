<?php

// app/Models/Penyakit.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penyakit extends Model
{
    protected $table = 'penyakit';

    protected $fillable = [
        'nama_penyakit',
        'kode_icd',
        'kategori',
        'threshold_ews'
    ];

    public function kasus()
    {
        return $this->hasMany(Kasus::class);
    }
}