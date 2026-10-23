// Her photo goes up from the browser to the API (POST /api/v1/photos) at the moment she sends
// the listing (never when she picks it). XHR rather than fetch because the submit button shows
// real upload progress. The API re-encodes it and keeps it private until the listing is
// published; these checks only refuse early with the design's message.

import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from '@princess/shared/constants.ts';
import { megabytesLabel } from '@princess/shared/format.ts';
import { publicApiUrl } from './api.ts';
import { ensureCsrf, xsrfToken } from './client.ts';

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


/**
 * The photo goes up when she sends the listing; if it fails, nothing she typed is lost.
 * ARABIC COPY: DRAFT (it names the button, «أرسلي الإعلان»).
 */
export const UPLOAD_FAILED_MESSAGE = 'تعذّر رفع الصورة. تحققي من الاتصال، ثم اضغطي «أرسلي الإعلان» مرة أخرى — كل ما كتبتِه باقٍ.';

/** Why an upload failed: the API's code for the photo ("too_large", "invalid"...), or "network". */
export class UploadError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`upload failed: ${code}`);
    this.code = code;
  }
}

/** Uploads her photo to the API and resolves to the id it gave it. */
export function uploadPhoto(file: File, onProgress: (percent: number) => void): { promise: Promise<string>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = ensureCsrf().then(
    () =>
      new Promise<string>((resolve, reject) => {
        xhr.open('POST', publicApiUrl('/photos'));
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-XSRF-TOKEN', xsrfToken());
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          let body: { id?: string; errors?: { photo?: string } } | null = null;
          try {
            body = JSON.parse(xhr.responseText);
          } catch { /* not JSON */ }
          if (xhr.status === 201 && typeof body?.id === 'string') resolve(body.id);
          else reject(new UploadError(body?.errors?.photo ?? `status_${xhr.status}`));
        };
        xhr.onerror = () => reject(new UploadError('network'));
        xhr.onabort = () => reject(new UploadError('aborted'));
        const form = new FormData();
        form.append('photo', file);
        xhr.send(form);
      }),
    () => {
      throw new UploadError('network');
    },
  );
  return { promise, abort: () => xhr.abort() };
}
