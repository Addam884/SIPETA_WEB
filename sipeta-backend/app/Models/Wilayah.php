<?php

// app/Models/Wilayah.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wilayah extends Model
{
    protected $table = 'wilayah';

    public $timestamps = false;

    protected $fillable = [
        'nama_wilayah',
        'level',
        'parent_id'
    ];

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