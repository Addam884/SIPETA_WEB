<?php
// app/Services/KMeansService.php
namespace App\Services;

class KMeansService
{
    /**
     * Jalankan K-Means 1-dimensi pada dataset jumlah kasus per wilayah.
     *
     * @param  array<int, int>  $dataset  [wilayah_id => jumlah_kasus]
     * @param  int              $k        Jumlah cluster (default 3)
     * @param  int              $maxIter  Iterasi maksimum
     * @return array{
     *   assignments: array<int, int>,   // wilayah_id => cluster_id (0=Rendah,1=Sedang,2=Tinggi)
     *   centroids: array<int, float>,   // cluster_id => centroid value
     *   iterations: int
     * }
     */
    public function run(array $dataset, int $k = 3, int $maxIter = 100): array
    {
        if (count($dataset) === 0) {
            return ['assignments' => [], 'centroids' => [], 'iterations' => 0];
        }

        // Jika data < k, tetap jalan tapi semua masuk cluster berbeda
        $ids    = array_keys($dataset);
        $values = array_values($dataset);
        $n      = count($values);
        $k      = min($k, $n);

        // ── Inisialisasi centroid: bagi range [min, max] menjadi k segmen ──────
        $min  = (float) min($values);
        $max  = (float) max($values);

        $centroids = [];
        if ($max === $min) {
            // Semua nilai sama — langsung assign ke cluster 0
            for ($c = 0; $c < $k; $c++) $centroids[$c] = $min;
            $assignments = array_combine($ids, array_fill(0, $n, 0));
            return ['assignments' => $assignments, 'centroids' => $centroids, 'iterations' => 0];
        }

        for ($c = 0; $c < $k; $c++) {
            $centroids[$c] = $min + ($c * ($max - $min) / ($k - 1));
        }

        $assignments = array_fill(0, $n, 0);
        $iterations  = 0;

        for ($iter = 0; $iter < $maxIter; $iter++) {
            $iterations++;
            $changed = false;

            // ── Assignment step ──────────────────────────────────────────────
            foreach ($values as $i => $val) {
                $best     = 0;
                $bestDist = PHP_FLOAT_MAX;
                for ($c = 0; $c < $k; $c++) {
                    $dist = abs($val - $centroids[$c]);
                    if ($dist < $bestDist) {
                        $bestDist = $dist;
                        $best     = $c;
                    }
                }
                if ($assignments[$i] !== $best) {
                    $assignments[$i] = $best;
                    $changed         = true;
                }
            }

            if (!$changed) break;

            // ── Update step ──────────────────────────────────────────────────
            for ($c = 0; $c < $k; $c++) {
                $members = [];
                foreach ($values as $i => $val) {
                    if ($assignments[$i] === $c) $members[] = $val;
                }
                if (count($members) > 0) {
                    $centroids[$c] = array_sum($members) / count($members);
                }
            }
        }

        // ── Normalisasi: urutkan cluster 0=Rendah ... k-1=Tinggi ────────────
        // Sort centroid ASC lalu remap
        $sortedCentroids = $centroids;
        asort($sortedCentroids);                           // ascending
        $oldToNew = array_flip(array_keys($sortedCentroids)); // old_cluster_id => new_cluster_id

        $finalAssignments = [];
        foreach ($ids as $i => $wilayahId) {
            $finalAssignments[$wilayahId] = $oldToNew[$assignments[$i]];
        }

        $finalCentroids = [];
        foreach ($oldToNew as $old => $new) {
            $finalCentroids[$new] = $centroids[$old];
        }
        ksort($finalCentroids);

        return [
            'assignments' => $finalAssignments,  // wilayah_id => 0/1/2
            'centroids'   => $finalCentroids,     // 0/1/2 => nilai centroid
            'iterations'  => $iterations,
        ];
    }

    /**
     * Hitung Davies-Bouldin Index (ukuran kualitas clustering, makin kecil makin baik)
     */
    public function daviesBouldin(array $dataset, array $assignments, array $centroids): float
    {
        $k       = count($centroids);
        $scatter = [];

        for ($c = 0; $c < $k; $c++) {
            $members = [];
            foreach ($dataset as $wId => $val) {
                if (($assignments[$wId] ?? -1) === $c) $members[] = $val;
            }
            $scatter[$c] = count($members) > 0
                ? array_sum(array_map(fn($v) => abs($v - $centroids[$c]), $members)) / count($members)
                : 0;
        }

        $db = 0.0;
        for ($i = 0; $i < $k; $i++) {
            $maxRatio = 0.0;
            for ($j = 0; $j < $k; $j++) {
                if ($i === $j) continue;
                $dist  = abs($centroids[$i] - $centroids[$j]);
                $ratio = $dist > 0 ? ($scatter[$i] + $scatter[$j]) / $dist : 0;
                $maxRatio = max($maxRatio, $ratio);
            }
            $db += $maxRatio;
        }

        return $k > 0 ? $db / $k : 0.0;
    }
}