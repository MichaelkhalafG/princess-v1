<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\PhotoController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

// Under /api/v1 (bootstrap/app.php). Reads carry no rate limit: the web server makes them
// on every visitor's behalf, from one address. The limits named below are in AppServiceProvider.

Route::get('listings', [ListingController::class, 'index']);
Route::get('listings/{id}', [ListingController::class, 'show'])->whereUuid('id');
Route::get('listings/{id}/others', [ListingController::class, 'others'])->whereUuid('id');

// signed in, or signing up in the same request
Route::post('listings', [ListingController::class, 'store'])->middleware('throttle:new-accounts');
// before she has an account, too (she signs up at the end of the form)
Route::post('photos', [PhotoController::class, 'store'])->middleware('throttle:photo-uploads');
// anyone, signed in or not
Route::post('listings/{id}/reports', [ReportController::class, 'store'])->whereUuid('id')->middleware('throttle:reports');

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->whereNumber('id')->name('verification.verify');
Route::post('password/forgot', [PasswordController::class, 'forgot'])->middleware('throttle:password-emails');
Route::post('password/reset', [PasswordController::class, 'reset'])->middleware('throttle:password-emails');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AccountController::class, 'show']);
    Route::get('me/listings', [AccountController::class, 'listings']);
    Route::delete('me', [AccountController::class, 'destroy'])->middleware('throttle:login');
    Route::post('email/resend', [EmailVerificationController::class, 'resend'])->middleware('throttle:verification-emails');
});
