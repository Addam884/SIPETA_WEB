<?php
// app/Models/FileImport.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FileImport extends Model
{
    use HasFactory;

    protected $table = 'file_imports';

    protected $fillable = [
        'nama_file',
        'uploaded_by',
        'tanggal_upload',
        'status',
        'jumlah_data',
    ];

    protected $casts = [
        'tanggal_upload' => 'datetime',
        'jumlah_data' => 'integer',
    ];

    /**
     * Relasi ke user yang mengupload
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}