<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Faskes extends Model
{
    use HasFactory;
    protected $table = 'fasilitas_kesehatan';

    public $timestamps = false;

    
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