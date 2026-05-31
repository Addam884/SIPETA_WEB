<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Populasi extends Model
{
    protected $table = 'populasi';
    public $timestamps = false; 

    protected $fillable = [
        'wilayah_id',
        'tahun',
        'jumlah',
    ];

    // Menggunakan type hinting untuk kejelasan
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }
}