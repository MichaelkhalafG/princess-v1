// Her prepared photo goes up to the API (POST /api/v1/photos) when she sends the listing, with
// progress (XMLHttpRequest reports upload progress; fetch does not). The API answers with the
// photo's id, which the listing then carries.

import { API_URL } from './config';
import { getToken } from './session';
import type { PreparedPhoto } from './photo';

export class UploadError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** web: lib/upload.ts's UPLOAD_FAILED_MESSAGE, word for word. */
export const UPLOAD_FAILED_MESSAGE = 'تعذّر رفع الصورة. تحققي من الاتصال، ثم اضغطي «أرسلي الإعلان» مرة أخرى — كل ما كتبتِه باقٍ.';

export function uploadPhoto(photo: PreparedPhoto, onProgress: (share: number) => void): { promise: Promise<string>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = (async () => {
    const token = await getToken();
    return new Promise<string>((resolve, reject) => {
      xhr.open('POST', `${API_URL}/api/v1/photos`);
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onerror = () => reject(new UploadError('network'));
      xhr.onabort = () => reject(new UploadError('aborted'));
      xhr.onload = () => {
        let json: { id?: string; errors?: Record<string, string> } | null = null;
        try {
          json = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status >= 200 && xhr.status < 300 && json?.id) resolve(json.id);
        else reject(new UploadError(json?.errors?.photo ?? (xhr.status === 429 ? 'too_many_attempts' : 'failed')));
      };
      const form = new FormData();
      // React Native's FormData takes a file by its URI
      form.append('photo', { uri: photo.uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
      xhr.send(form);
    });
  })();
  return { promise, abort: () => xhr.abort() };
}
