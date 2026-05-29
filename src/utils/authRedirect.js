import { Capacitor } from '@capacitor/core';

/** Scheme registrado no AndroidManifest e no Supabase Dashboard */
export const APP_AUTH_SCHEME = 'br.com.sacp.coordenacao';
export const AUTH_CALLBACK_PATH = 'login-callback';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/** URL de retorno OAuth / recuperação de senha (web ou app nativo) */
export function getAuthRedirectUrl() {
  if (isNativeApp()) {
    return `${APP_AUTH_SCHEME}://${AUTH_CALLBACK_PATH}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }
  return '/';
}
