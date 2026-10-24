// Her sign-in: the API token (POST /login or sign-up with a listing returns it once), kept in the
// phone's secure storage (Keychain on iOS, the Android Keystore). Screens subscribe, so signing in
// or out anywhere updates every screen that shows her account.

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY = 'princess.api-token';
let token: string | null | undefined; // undefined: not read from storage yet
const listeners = new Set<(t: string | null) => void>();

export async function getToken(): Promise<string | null> {
  if (token === undefined) token = await SecureStore.getItemAsync(KEY);
  return token;
}

export async function setToken(value: string | null): Promise<void> {
  token = value;
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
  listeners.forEach((l) => l(value));
}

/** The token while the app runs: undefined until read, then a string or null. */
export function useToken(): string | null | undefined {
  const [t, setT] = useState<string | null | undefined>(token);
  useEffect(() => {
    let live = true;
    getToken().then((v) => live && setT(v));
    listeners.add(setT);
    return () => {
      live = false;
      listeners.delete(setT);
    };
  }, []);
  return t;
}
