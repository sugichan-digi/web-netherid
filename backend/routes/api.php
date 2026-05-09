<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InquiryController;
use Illuminate\Support\Facades\Route;

/*
 * 認証必須エンドポイント
 */
Route::middleware('kratos.auth')->group(function () {
    Route::get('/dashboard/init', [DashboardController::class, 'init']);
    
    // お問い合わせ
    Route::get('/inquiries', [InquiryController::class, 'index']);
    Route::post('/inquiries', [InquiryController::class, 'store']);

    // アカウント
    Route::delete('/account/deactivate', [\App\Http\Controllers\AccountController::class, 'deactivate']);
});
