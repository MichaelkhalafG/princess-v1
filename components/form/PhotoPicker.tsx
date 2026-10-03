'use client';

import { useEffect, useRef, useState } from 'react';
import { megabytesLabel, toArabicDigits } from '@/lib/format.ts';
import type { UploadState } from '@/lib/listing-form.ts';
import { PHOTO_MIME_TYPES } from '@/lib/constants.ts';
import { UPLOAD_FAILED_MESSAGE, checkPhoto, uploadPhoto } from '@/lib/upload.ts';
import { Button } from '../Button.tsx';
import { FieldError } from './Field.tsx';
import styles from './PhotoPicker.module.css';

type State =
  | { status: 'idle' }
  | { status: 'uploading'; name: string; preview: string; progress: number }
  | { status: 'chosen'; name: string; preview: string; size: string; path: string }
  | { status: 'rejected'; reason: string };

/**
 * "صورة من عملك" — optional. The photo uploads as soon as she picks it, so the listing
 * insert only carries its object path. Removing it here does not delete the uploaded
 * object (orphan photos — docs/SECURITY-NOTES.md).
 */
export function PhotoPicker({ onChange }: { onChange: (state: UploadState, path: string | null) => void }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<(() => void) | null>(null);
  const preview = useRef<string | null>(null);

  const report = (s: State) => {
    setState(s);
    onChange(s.status, s.status === 'chosen' ? s.path : null);
  };

  const releasePreview = () => {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
  };

  useEffect(() => () => {
    abort.current?.();
    releasePreview();
  }, []);

  const pick = () => input.current?.click();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    abort.current?.();
    releasePreview();
    const check = checkPhoto(file);
    if (!check.ok) return report({ status: 'rejected', reason: check.reason });

    const url = URL.createObjectURL(file);
    preview.current = url;
    report({ status: 'uploading', name: file.name, preview: url, progress: 0 });
    const job = uploadPhoto(file, (progress) => setState((s) => (s.status === 'uploading' ? { ...s, progress } : s)));
    abort.current = job.abort;
    job.promise.then(
      (path) => report({ status: 'chosen', name: file.name, preview: url, size: megabytesLabel(file.size), path }),
      (err: Error) => {
        if (err.message === 'upload aborted') return;
        releasePreview();
        report({ status: 'rejected', reason: UPLOAD_FAILED_MESSAGE });
      },
    );
  };

  const remove = () => {
    abort.current?.();
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
            {state.status === 'rejected' ? 'JPEG أو PNG أو WebP حتى ٥ ميغابايت.' : 'صورة واحدة لنتيجة أو منتج، لا لوجهك. JPEG أو PNG أو WebP حتى ٥ ميغابايت.'}
          </span>
        </button>
      )}
      {state.status === 'rejected' && <FieldError id="e-photo" alert>{state.reason}</FieldError>}

      {state.status === 'uploading' && (
        <div className={styles.row} role="status" aria-live="polite">
          <span className={styles.thumb}><img src={state.preview} alt="" /></span>
          <div className={styles.info}>
            <span className={styles.name}>{state.name}</span>
            <progress className={styles.progress} value={state.progress} max={100} aria-label="تقدم رفع الصورة" />
            <span className={styles.meta}>جارٍ الرفع… {toArabicDigits(state.progress)}٪</span>
          </div>
        </div>
      )}

      {state.status === 'chosen' && (
        <div className={styles.row}>
          <span className={styles.thumb}><img src={state.preview} alt="معاينة الصورة المختارة" /></span>
          <div className={`${styles.info} ${styles.infoTight}`}>
            <span className={styles.name}>{state.name}</span>
            <span className={styles.done}>تم رفعها، {state.size}</span>
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
