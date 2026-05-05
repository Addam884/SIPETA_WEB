<?php

// app/Models/Wilayah.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wilayah extends Model
{
    protected $table = 'wilayah';

    protected $fillable = [
        'nama_wilayah',
        'level',
        'parent_id'
    ];

    public function kasus()
    {
        return $this->hasMany(Kasus::class);
    }
}