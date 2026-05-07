<?php
// app/Models/HasilClustering.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HasilClustering extends Model
{
    protected $table    = 'hasil_clustering';
    public $timestamps  = false;

    protected $fillable = [
        'wilayah_id', 'penyakit_id', 'periode',
        'cluster_id', 'jumlah_kasus', 'centroid',
    ];

    protected $casts = [
        'periode'      => 'date',
        'centroid'     => 'float',
        'cluster_id'   => 'integer',
        'jumlah_kasus' => 'integer',
    ];

    // Label cluster: 0=Rendah, 1=Sedang, 2=Tinggi
    public static array $labels = [0 => 'Rendah', 1 => 'Sedang', 2 => 'Tinggi'];

    // Warna untuk frontend
    public static array $colors = [0 => '#22c55e', 1 => '#f59e0b', 2 => '#ef4444'];

    public function wilayah()
    {
        return $this->belongsTo(Wilayah::class);
    }

    public function penyakit()
    {
        return $this->belongsTo(Penyakit::class);
    }
}