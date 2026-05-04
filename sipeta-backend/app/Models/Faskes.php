<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Faskes extends Model
{
    protected $table = 'fasilitas_kesehatan';
    
    protected $fillable = [
        'nama_faskes',
        'wilayah_id',
        'geom',
    ];

    // Relasi ke Wilayah
    public function wilayah()
    {
        return $this->belongsTo(Wilayah::class);
    }

    // Relasi ke Kasus
    public function kasus()
    {
        return $this->hasMany(Kasus::class);
    }
}