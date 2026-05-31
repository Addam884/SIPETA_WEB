<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\KasusController;
use App\Http\Controllers\PenyakitController;
use App\Http\Controllers\WilayahController;

use App\Http\Controllers\FakesController;

use App\Http\Controllers\GisController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\UserDashboardController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\AdminDashboardController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

//
// ─── PUBLIC ROUTES (TANPA AUTH) ──────────────────────────────────────────
//

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'sendOtp']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Stats Dashboard
Route::get('/kasus/stats-summary', [KasusController::class, 'statsSummary']);
Route::get('/kasus/statistik', [KasusController::class, 'statistik']);

// 🔥 GIS PUBLIC (INI YANG PENTING)
Route::prefix('gis')->group(function () {
    Route::get('geojson', [GisController::class, 'geojson']);
    Route::get('faskes', [GisController::class, 'faskes']);
    Route::get('clustering/result', [GisController::class, 'clusteringResult']);
});

// Public read-only data
Route::get('kasus', [KasusController::class, 'index']);
Route::get('kasus/{id}', [KasusController::class, 'show']);
Route::get('faskes', [FakesController::class, 'index']);



//
// ─── PROTECTED ROUTES (AUTH:SANCTUM) ─────────────────────────────────────
//
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
    Route::delete('/kasus/bulkDelete', [KasusController::class, 'bulkDelete']);
    Route::delete('/kasus/{id}', [KasusController::class, 'destroy']);
    Route::post('/kasus/import', [KasusController::class, 'bulkImport']);

    // Master Data (CRUD butuh login)
    Route::apiResource('penyakit', PenyakitController::class);
    Route::apiResource('wilayah', WilayahController::class);
Route::apiResource('faskes', FakesController::class);


    // GIS PRIVATE (yang sensitif / aksi)
    Route::prefix('gis')->group(function () {
        Route::get('faskes/{id}/detail', [GisController::class, 'faskesDetail']);
        Route::get('geojson/default-clustering', [GisController::class, 'defaultClusteringGeojson']);
        Route::post('clustering/run', [GisController::class, 'runClustering']);
        Route::get('trend', [GisController::class, 'trend']);
        Route::get('epidemiologi', [GisController::class, 'epidemiologi']);
        Route::get('export-excel', [GisController::class, 'exportExcel']);
    });

    // Logs
    Route::prefix('logs')->group(function () {
        Route::get('summary', [LogController::class, 'summary']);
        Route::get('kasus', [LogController::class, 'riwayatKasus']);
        Route::get('aktivitas', [LogController::class, 'riwayatAktivitas']);
        Route::get('file', [LogController::class, 'riwayatFile']);
    });

    // ─── DASHBOARD (PUBLIC) ───────────────────────────────────────────────────
    Route::prefix('dashboard')->group(function () {
        Route::get('summary', [UserDashboardController::class, 'statsSummary']);
        Route::get('statistik', [UserDashboardController::class, 'statistik']);
        Route::get('tren-bulanan', [UserDashboardController::class, 'trenBulanan']);
        Route::get('stats-faskes', [UserDashboardController::class, 'statsFaskes']);
    });

    Route::get('/superadmin/dashboard', [SuperadminController::class, 'dashboard']);



    // Pastikan prefix ini sama persis dengan yang dipanggil di Axios (React)
    Route::prefix('dashboard-admin-controller')->group(function () {
        Route::get('/statistik', [AdminDashboardController::class, 'statistik']);
        Route::get('/trend', [AdminDashboardController::class, 'trendPenyakit']); // 🌟 Diarahkan ke trendPenyakit
        Route::get('/wilayah', [AdminDashboardController::class, 'distribusiWilayah']); // 🌟 Diarahkan ke distribusiWilayah
        Route::get('/early-warning', [AdminDashboardController::class, 'earlyWarning']);
        Route::get('/list-tahun', [AdminDashboardController::class, 'listTahun']);
    });





    // Pastikan prefix ini sama persis dengan yang dipanggil di Axios (React)
    Route::prefix('dashboard-admin-controller')->group(function () {
        Route::get('/statistik', [AdminDashboardController::class, 'statistik']);
        Route::get('/trend', [AdminDashboardController::class, 'trendPenyakit']); // 🌟 Diarahkan ke trendPenyakit
        Route::get('/wilayah', [AdminDashboardController::class, 'distribusiWilayah']); // 🌟 Diarahkan ke distribusiWilayah
        Route::get('/early-warning', [AdminDashboardController::class, 'earlyWarning']);
        Route::get('/list-tahun', [AdminDashboardController::class, 'listTahun']);
    });



});


//
// ─── MONITORING ─────────────────────────────────────────────────────────
//
Route::get('/metrics', function () {
    return response('metrics');
});