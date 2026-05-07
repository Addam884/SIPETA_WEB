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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [SettingsController::class, 'profile']);
    Route::post('/profile', [SettingsController::class, 'updateProfile']);
    Route::put('/password', [SettingsController::class, 'updatePassword']);
});

Route::get('kasus/statistik', [KasusController::class, 'statistik']);

// Handle
Route::get('faskes', [FaskesController::class, 'index']);
Route::post('kasus/import', [KasusController::class, 'bulkImport']);
Route::delete('kasus/bulkDelete', [KasusController::class, 'bulkDelete']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


// API Resource Routes
Route::apiResource('penyakit', PenyakitController::class);
Route::apiResource('wilayah', WilayahController::class);
Route::apiResource('kasus', KasusController::class);
Route::apiResource('faskes', FaskesController::class);


// GIS routes
Route::prefix('gis')->group(function () {
    // Peta
    Route::get('geojson',                  [GisController::class, 'geojson']);
    Route::get('faskes',                   [GisController::class, 'faskes']);
    Route::get('faskes/{id}/detail',       [GisController::class, 'faskesDetail']);
 
    // Clustering K-Means
    Route::post('clustering/run',          [GisController::class, 'runClustering']);
    Route::get ('clustering/result',       [GisController::class, 'clusteringResult']);
 
    // Chart & tabel
    Route::get('trend',                    [GisController::class, 'trend']);
    Route::get('epidemiologi',             [GisController::class, 'epidemiologi']);
});