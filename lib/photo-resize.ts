// Shrinks a photo in the browser before it is uploaded — no dependency, only
// createImageBitmap and a canvas. Two reasons:
//  - size: most phone photos are over the bucket's 5 MB; a 1600px JPEG is a few hundred KB,
//    so she is never told to "shrink it" herself;
//  - privacy: re-encoding drops all metadata. A phone photo often carries the GPS position
//    where it was taken (EXIF); uploaded as it was, a photo taken at home would publish her
//    home's location to a public bucket.

/** The longest side of an uploaded photo, in pixels. Cards show it at 328px, the listing
    page at up to about 600; 1600 keeps it sharp on a high-density screen. */
export const PHOTO_MAX_EDGE = 1600;
/** JPEG quality: no visible loss for a photo of work, a fraction of the size. */
export const PHOTO_QUALITY = 0.85;

/** The size it should be drawn at: never larger than it was, longest side at most maxEdge. */
export function fitWithin(width: number, height: number, maxEdge = PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * The photo she picked, upright (as the phone shows it), at most PHOTO_MAX_EDGE on its
 * longest side, as a JPEG with no metadata. Throws if the browser cannot read the file.
 */
export async function preparePhoto(file: File): Promise<File> {
  // 'from-image' turns it the way the phone's camera recorded, before the EXIF is dropped
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    // JPEG has no transparency: a transparent PNG gets a white ground, not a black one
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
    if (!blob) throw new Error('could not encode the photo');
    const name = `${file.name.replace(/\.[^.]*$/, '') || 'photo'}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
