<?php

namespace Database\Factories;

use App\Models\Kasus;
use App\Models\Penyakit;
use App\Models\Wilayah;
use App\Models\Faskes;
use Illuminate\Database\Eloquent\Factories\Factory;

class KasusFactory extends Factory
{
    protected $model = Kasus::class;

    public function definition(): array
    {
        return [
            'penyakit_id'   => Penyakit::factory(),
            'wilayah_id'    => Wilayah::factory(),
            'faskes_id'     => Faskes::factory(),
            'tanggal_kasus' => now()->format('Y-m-d'),
            'umur'          => fake()->numberBetween(1, 80),
            'jenis_kelamin' => fake()->randomElement(['L', 'P']),
            'status'        => fake()->randomElement([
                'Dirawat',
                'Sembuh',
                'Meninggal'
            ]),
        ];
    }
}