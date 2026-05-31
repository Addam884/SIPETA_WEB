<?php

namespace Database\Factories;

use App\Models\Faskes;
use App\Models\Wilayah;
use Illuminate\Database\Eloquent\Factories\Factory;

class FaskesFactory extends Factory
{
    protected $model = Faskes::class;

    public function definition(): array
    {
        return [
            'nama_faskes' => fake()->randomElement([
                'Puskesmas Kaliwates',
                'Puskesmas Patrang',
            ]),

            'wilayah_id' => Wilayah::factory(),

            // sesuaikan jika geom wajib di database
            'geom' => null,
        ];
    }
}