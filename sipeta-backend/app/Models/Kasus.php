<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kasus extends Model

{
    protected $table = 'kasus';
    protected $fillable = [
        'penyakit_id',
        'wilayah_id', 
        'faskes_id',
        'file_import_id', 
        'tanggal_kasus',
        'umur',
        'jenis_kelamin',
        'status',
        'created_by',
        'created_at',
        'updated_at',
    ];

    // Relasi
    public function penyakit()
    {
        return $this->belongsTo(Penyakit::class);
    }

    public function wilayah()
    {
        return $this->belongsTo(Wilayah::class);
    }

    public function faskes()
    {
        return $this->belongsTo(Faskes::class);
    }

    // Boot method untuk auto-assign faskes
    protected static function boot()
    {
        parent::boot();

        // Saat creating (sebelum insert)
        static::creating(function ($kasus) {
            // Jika faskes_id belum di-set, auto-assign dari wilayah
            if (!$kasus->faskes_id && $kasus->wilayah_id) {
                $faskes = Faskes::where('wilayah_id', $kasus->wilayah_id)->first();
                $kasus->faskes_id = $faskes ? $faskes->id : null;
            }
        });

        // Saat updating
        static::updating(function ($kasus) {
            // Jika wilayah berubah, update faskes_id juga
            if ($kasus->isDirty('wilayah_id')) {
                $faskes = Faskes::where('wilayah_id', $kasus->wilayah_id)->first();
                $kasus->faskes_id = $faskes ? $faskes->id : null;
            }
        });
    }
}