'use client';

import { useEffect, useRef, useState } from 'react';
import { megabytesLabel } from '@/lib/format.ts';
import type { UploadState } from '@/lib/listing-form.ts';
import { PHOTO_MIME_TYPES } from '@/lib/constants.ts';
import { preparePhoto } from '@/lib/photo-resize.ts';
import { UNREADABLE_PHOTO_MESSAGE, checkPhoto, checkPhotoType } from '@/lib/upload.ts';
import { Button } from '../Button.tsx';
import { FieldError } from './Field.tsx';
import styles from './PhotoPicker.module.css';

type State =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'chosen'; name: string; preview: string; size: string; file: File }
  | { status: 'rejected'; reason: string };

/**
 * "صورة من عملك" — optional. Picking a photo uploads NOTHING: it is shrunk on her phone
 * (lib/photo-resize.ts — at most 1600px, a JPEG with no metadata) and previewed, and the
 * form uploads it only when she publishes. Changing or removing it, or leaving the form,
 * therefore leaves no file behind in the bucket.
 */
export function PhotoPicker({ onChange }: { onChange: (state: UploadState, file: File | null) => void }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<string | null>(null);

  const report = (s: State) => {
    setState(s);
    onChange(s.status, s.status === 'chosen' ? s.file : null);
  };

  const releasePreview = () => {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
  };

  useEffect(() => () => releasePreview(), []);

  const pick = () => input.current?.click();

  const onFile = async (picked: File | undefined) => {
    if (!picked) return;
    releasePreview();
    const type = checkPhotoType(picked);
    if (!type.ok) return report({ status: 'rejected', reason: type.reason });
    report({ status: 'preparing' });
    // shrunk and stripped of its metadata (GPS included) before anything is sent
    let file: File;
    try {
      file = await preparePhoto(picked);
    } catch {
      return report({ status: 'rejected', reason: UNREADABLE_PHOTO_MESSAGE });
    }
    const check = checkPhoto(file);
    if (!check.ok) return report({ status: 'rejected', reason: check.reason });
    const url = URL.createObjectURL(file);
    preview.current = url;
    report({ status: 'chosen', name: picked.name, preview: url, size: megabytesLabel(file.size), file });
  };

  const remove = () => {
    releasePreview();
    report({ status: 'idle' });
  };

  return (
    <div className={styles.picker}>
      <div className={styles.labelRow}>
        <span id="l-photo" className={styles.label}>صورة من عملك</span>
        <span className={styles.optional}>اختياري</span>
      </div>
      <input
        ref={input}
        type="file"
        accept={PHOTO_MIME_TYPES.join(',')}
        aria-labelledby="l-photo"
        className={styles.file}
        tabIndex={-1}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {(state.status === 'idle' || state.status === 'rejected') && (
        <button
          type="button"
          onClick={pick}
          className={`${styles.dropzone} ${state.status === 'rejected' ? styles.rejected : ''}`}
          {...(state.status === 'rejected' ? { 'aria-describedby': 'e-photo' } : {})}
        >
          <span className={styles.dropTitle}>{state.status === 'rejected' ? 'اختاري صورة أخرى' : 'اختاري صورة لعملك'}</span>
          <span className={styles.dropHint}>
            {state.status === 'rejected' ? 'JPEG أو PNG أو WebP.' : 'صورة واحدة لنتيجة أو منتج، لا لوجهك. JPEG أو PNG أو WebP.'}
          </span>
        </button>
      )}
      {state.status === 'rejected' && <FieldError id="e-photo" alert>{state.reason}</FieldError>}

      {state.status === 'preparing' && (
        <div className={styles.row} role="status" aria-live="polite">
          <span className={styles.meta}>جارٍ تجهيز الصورة…</span>
        </div>
      )}

      {state.status === 'chosen' && (
        <div className={styles.row} role="status" aria-live="polite">
          <span className={styles.thumb}><img src={state.preview} alt="معاينة الصورة المختارة" /></span>
          <div className={`${styles.info} ${styles.infoTight}`}>
            <span className={styles.name}>{state.name}</span>
            {/* it is uploaded when she publishes — "uploaded" would be untrue here */}
            <span className={styles.done}>جاهزة للنشر، {state.size}</span>
          </div>
          <div className={styles.actions}>
            <Button variant="surface" size="compact" onClick={pick}>تغيير</Button>
            <Button variant="surface" size="compact" onClick={remove} aria-label="إزالة الصورة">إزالة</Button>
          </div>
        </div>
      )}
    </div>
  );
}
