<?php

use App\Http\Controllers\Api\ListingController;
use Illuminate\Support\Facades\Route;

// Under /api/v1 (bootstrap/app.php). Reads carry no rate limit: the web server makes them
// on every visitor's behalf, from one address.

Route::get('listings', [ListingController::class, 'index']);
Route::get('listings/{id}', [ListingController::class, 'show'])->whereUuid('id');
Route::get('listings/{id}/others', [ListingController::class, 'others'])->whereUuid('id');
