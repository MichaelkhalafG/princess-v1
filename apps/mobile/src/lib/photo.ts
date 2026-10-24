// Her photo, from her phone's library to a file ready to upload.
//
// The picked file is never sent as it is. The image manipulator decodes it to pixels and writes
// a new JPEG from them — at most PHOTO_EDGE on its longest side — so what leaves the phone carries
// only the picture: no EXIF (camera, time, GPS position), no XMP, no IPTC. That is proved, not
// assumed: see the photo gate in the app's report (a real photo with GPS, picked through the form,
// the output pulled from the device and read). The server then decodes and re-encodes everything
// again; this is the second layer, not the only one.

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { PHOTO_MAX_BYTES } from '@princess/shared/constants.ts';

/** The longest side sent (the server keeps at most 1600 too, so nothing larger is ever needed). */
export const PHOTO_EDGE = 1600;
const QUALITY = 0.85;

export type PreparedPhoto = { uri: string; width: number; height: number; bytes: number };
export type PickResult = { kind: 'cancelled' } | { kind: 'ok'; photo: PreparedPhoto } | { kind: 'rejected'; reason: 'invalid' | 'too_large' };

export async function pickPhoto(): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false });
  if (res.canceled || !res.assets?.[0]) return { kind: 'cancelled' };
  try {
    return { kind: 'ok', photo: await prepare(res.assets[0]) };
  } catch {
    return { kind: 'rejected', reason: 'invalid' };
  }
}

/** Decoded and written again: upright, at most PHOTO_EDGE, a fresh JPEG with no metadata. */
export async function prepare(asset: { uri: string; width: number; height: number }): Promise<PreparedPhoto> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  const longest = Math.max(asset.width, asset.height);
  if (longest > PHOTO_EDGE) ctx.resize(asset.width >= asset.height ? { width: PHOTO_EDGE, height: null } : { width: null, height: PHOTO_EDGE });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });
  const bytes = new File(saved.uri).size ?? 0;
  if (bytes > PHOTO_MAX_BYTES) throw new Error('too large');
  return { uri: saved.uri, width: saved.width, height: saved.height, bytes };
}
