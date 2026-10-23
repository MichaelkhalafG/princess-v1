<?php

use App\Http\Controllers\Api\PhotoController;
use Illuminate\Support\Facades\Route;

// Photo files, outside the api and web middleware groups: no session or cookie ever rides on an
// image (bootstrap/app.php registers this file).

Route::get('photos/private/{id}.jpg', [PhotoController::class, 'showPrivate'])->whereUuid('id')->name('photos.private');
Route::get('photos/{id}.jpg', [PhotoController::class, 'showPublic'])->whereUuid('id')->name('photos.public');
