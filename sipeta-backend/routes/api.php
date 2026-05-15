<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\KasusController;
use App\Http\Controllers\PenyakitController;
use App\Http\Controllers\WilayahController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\GisController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\LogController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ─── Public Routes (tanpa auth) ──────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Statistik bisa diakses tanpa auth (opsional, bisa dipindah ke dalam auth jika perlu)
Route::get('kasus/statistik', [KasusController::class, 'statistik']);

// ─── Protected Routes (dengan auth:sanctum) ─────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    
    // User
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // Profile
    Route::get('/profile', [SettingsController::class, 'profile']);
    Route::post('/profile', [SettingsController::class, 'updateProfile']);
    Route::put('/password', [SettingsController::class, 'updatePassword']);

    // Kasus CRUD
    Route::post('/kasus', [KasusController::class, 'store']);
    Route::put('/kasus/{id}', [KasusController::class, 'update']);
    Route::delete('/kasus/{id}', [KasusController::class, 'destroy']);
    Route::delete('/kasus/bulkDelete', [KasusController::class, 'bulkDelete']);
    Route::post('/kasus/import', [KasusController::class, 'bulkImport']);

    // API Resources
    Route::apiResource('penyakit', PenyakitController::class);
    Route::apiResource('wilayah', WilayahController::class);
    Route::apiResource('faskes', FaskesController::class);
    
    // GIS routes
    Route::prefix('gis')->group(function () {
        Route::get('geojson', [GisController::class, 'geojson']);
        Route::get('faskes', [GisController::class, 'faskes']);
        Route::get('faskes/{id}/detail', [GisController::class, 'faskesDetail']);
        Route::get('geojson/default-clustering', [GisController::class, 'defaultClusteringGeojson']);
        Route::post('clustering/run', [GisController::class, 'runClustering']);
        Route::get('clustering/result', [GisController::class, 'clusteringResult']);
        Route::get('trend', [GisController::class, 'trend']);
        Route::get('epidemiologi', [GisController::class, 'epidemiologi']);
    });

    // Log routes
    Route::prefix('logs')->group(function () {
        Route::get('summary', [LogController::class, 'summary']);
        Route::get('kasus', [LogController::class, 'riwayatKasus']);
        Route::get('aktivitas', [LogController::class, 'riwayatAktivitas']);
        Route::get('file', [LogController::class, 'riwayatFile']);
    });
});

// ─── Public Read-only Routes ─────────────────────────────────────────────
// Hanya GET yang publik, sisanya di dalam auth
Route::get('kasus', [KasusController::class, 'index']);
Route::get('kasus/{id}', [KasusController::class, 'show']);
Route::get('faskes', [FaskesController::class, 'index']);

Route::get('/metrics', function () {
    return response('metrics');
});