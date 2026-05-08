<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Populasi extends Model
{
    protected $table = 'populasi';

    protected $primaryKey = 'id';

    public $timestamps = false; // karena di tabel tidak ada created_at & updated_at

    protected $fillable = [
        'wilayah_id',
        'tahun',
        'jumlah',
    ];

    // Relasi ke wilayah
    public function wilayah()
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }
}