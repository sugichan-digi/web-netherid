<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\InquiryController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ServiceController;
use Illuminate\Support\Facades\Route;

/*
 * 認証任意エンドポイント（公開ページからもアクセス可）
 */
Route::middleware('kratos.optional')->group(function () {
    // お知らせ
    Route::get('/notifications', [NotificationController::class, 'index']);

    // サービス一覧
    Route::get('/services', [ServiceController::class, 'index']);
});

/*
 * 認証必須エンドポイント
 */
Route::middleware('kratos.auth')->group(function () {
    // お問い合わせ
    Route::get('/inquiries', [InquiryController::class, 'index']);
    Route::post('/inquiries', [InquiryController::class, 'store']);

    // アカウント
    Route::delete('/account/deactivate', [AccountController::class, 'deactivate']);
});
