<?php

// app/Models/Wilayah.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Wilayah extends Model
{
    protected $table = 'wilayah';
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'nama_wilayah',
        'level',
        'geom'
    ];

    public function batasWilayah()
    {
        return $this->belongsTo(BatasWilayah::class, 'batas_wilayah_gid', 'gid');
    }

    public function kasus()
    {
        return $this->hasMany(Kasus::class);
    }

    public function faskes()
    {
        return $this->hasMany(Faskes::class);
    }
 
    public function populasi()
    {
        return $this->hasMany(Populasi::class);
    }
 
    public function hasilClustering()
    {
        return $this->hasMany(HasilClustering::class);
    }
}