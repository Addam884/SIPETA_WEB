<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Catatan:
        // Model App\\Models\\Faskes mendefinisikan $table = 'fasilitas_kesehatan'
        // Di WilayahController juga ada query ke tabel 'faskes'.
        // Untuk memastikan kompatibel, kita buat kedua nama tabel.

        Schema::createIfNotExists('fasilitas_kesehatan', function (Blueprint $table) {
            $table->id();
            $table->string('nama_faskes', 255);
            $table->unsignedBigInteger('wilayah_id');
            $table->geometry('geom')->nullable();

            // Foreign key opsional (kalau tabel wilayah tersedia)
            $table->foreign('wilayah_id')->references('id')->on('wilayah')->onDelete('cascade');
        });


        // Buat alias tabel supaya query existing "faskes" tidak error.
        // Struktur dibuat sama seperti fasilitas_kesehatan.
        Schema::create('faskes', function (Blueprint $table) {
            $table->id();
            $table->string('nama_faskes', 255);
            $table->unsignedBigInteger('wilayah_id');
            $table->geometry('geom')->nullable();

            $table->foreign('wilayah_id')->references('id')->on('wilayah')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Drop tabel alias dulu
        Schema::dropIfExists('faskes');
        Schema::dropIfExists('fasilitas_kesehatan');
    }
};

