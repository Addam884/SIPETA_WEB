<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class WilayahFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nama_wilayah' => fake()->city(),
        ];
    }
}