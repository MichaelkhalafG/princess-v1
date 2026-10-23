<?php

namespace App\Photos;

use RuntimeException;

/** An upload that is not a photo the site takes; the message is the error code. */
final class PhotoRejected extends RuntimeException {}
