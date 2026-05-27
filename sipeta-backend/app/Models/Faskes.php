<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Faskes extends Model
{
    // Mengarah ke nama tabel fisik di PostgreSQL Anda
    protected $table = 'fasilitas_kesehatan';
    
    // Matikan timestamps bawaan Laravel (created_at/updated_at)
    public $timestamps = false;
    
    protected $fillable = [
        'nama_faskes',
        'wilayah_id',
        'geom',
    ];

    /**
     * Relasi ke model Wilayah secara eksplisit
     */
    public function wilayah()
    {
        // Parameter 2: foreign_key di tabel fasilitas_kesehatan
        // Parameter 3: owner_key / primary_key di tabel wilayah
        return $this->belongsTo(Wilayah::class, 'wilayah_id', 'id');
    }

    /**
     * Relasi ke model Kasus
     */
    public function kasus()
    {
        return $this->hasMany(Kasus::class, 'faskes_id', 'id');
    }
}