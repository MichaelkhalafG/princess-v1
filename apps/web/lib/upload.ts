// Photo upload from the browser straight to the public bucket, at the moment she publishes
// (never when she picks it: that left orphans). XHR rather than supabase-js because the
// submit button shows real upload progress.
// The bucket itself enforces type, size and name (see the migration); these checks
// only refuse early with the design's message.

import { PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from './constants.ts';
import { megabytesLabel } from './format.ts';

const EXTENSION: Record<(typeof PHOTO_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type PhotoCheck = { ok: true } | { ok: false; reason: string };

/** The file she picked is a kind of image the form takes (checked before it is shrunk). */
export function checkPhotoType(file: { type: string }): PhotoCheck {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    const kind = file.type ? `من نوع ${file.type.split('/')[1]?.toUpperCase() ?? file.type}` : 'ليس صورة';
    return { ok: false, reason: `هذا الملف ${kind}. اختاري صورة JPEG أو PNG أو WebP.` };
  }
  return { ok: true };
}

/** When the browser cannot open the picture at all (a damaged file, say). */
export const UNREADABLE_PHOTO_MESSAGE = 'تعذّر فتح هذه الصورة. اختاري صورة أخرى.';

/** The design's refusal messages, checked before any byte is sent. The size check runs on
    the photo after it is shrunk (lib/photo-resize.ts), so in practice it never fires. */
export function checkPhoto(file: { type: string; size: number }): PhotoCheck {
  const type = checkPhotoType(file);
  if (!type.ok) return type;
  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, reason: `الصورة أكبر من المسموح (${megabytesLabel(file.size)}). صغّريها إلى ٥ ميغابايت أو أقل ثم اختاريها من جديد.` };
  }
  return { ok: true };
}

/** The photo goes up when she publishes; if it fails, nothing she typed is lost. */
export const UPLOAD_FAILED_MESSAGE = 'تعذّر رفع الصورة. تحققي من الاتصال، ثم اضغطي «انشري الإعلان» مرة أخرى — كل ما كتبتِه باقٍ.';

/** Uploads under a fresh "<uuid>.<ext>" name and resolves to that object path. */
export function uploadPhoto(file: File, onProgress: (percent: number) => void): { promise: Promise<string>; abort: () => void } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const xhr = new XMLHttpRequest();
  const promise = new Promise<string>((resolve, reject) => {
    if (!url || !key) return reject(new Error('Supabase is not configured'));
    const name = `${crypto.randomUUID()}.${EXTENSION[file.type as keyof typeof EXTENSION]}`;
    xhr.open('POST', `${url}/storage/v1/object/${PHOTO_BUCKET}/${name}`);
    // Publishable keys are not JWTs: they go on `apikey` only, never `Authorization: Bearer`
    // (anything that tries to verify them as a JWT fails). They map to the anon role.
    xhr.setRequestHeader('apikey', key);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(name) : reject(new Error(`upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('upload failed: network'));
    xhr.onabort = () => reject(new Error('upload aborted'));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}
