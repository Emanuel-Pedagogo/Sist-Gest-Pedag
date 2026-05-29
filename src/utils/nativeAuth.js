import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabaseClient';
import { AUTH_CALLBACK_PATH, getAuthRedirectUrl } from './authRedirect';

function parseAuthUrl(rawUrl) {
  const hashIndex = rawUrl.indexOf('#');
  const withoutHash = hashIndex >= 0 ? rawUrl.slice(0, hashIndex) : rawUrl;
  const hash = hashIndex >= 0 ? rawUrl.slice(hashIndex + 1) : '';
  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';

  return {
    params: new URLSearchParams(query),
    hashParams: new URLSearchParams(hash),
  };
}

async function handleAuthCallbackUrl(url) {
  if (!url || !url.includes(AUTH_CALLBACK_PATH)) return false;

  try {
    await Browser.close();
  } catch {
    // Browser pode já estar fechado
  }

  const { params, hashParams } = parseAuthUrl(url);
  const code = params.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[SACP] OAuth callback:', error.message);
      return true;
    }
  } else {
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error('[SACP] OAuth callback:', error.message);
        return true;
      }
    }
  }

  const isRecovery =
    hashParams.get('type') === 'recovery' || params.get('type') === 'recovery';
  if (isRecovery) {
    window.dispatchEvent(new CustomEvent('sacp:auth-recovery'));
  }

  return true;
}

/** Login Google no app nativo (abre navegador in-app e retorna via deep link) */
export async function signInWithGoogleNative() {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Não foi possível iniciar o login com Google.');

  await Browser.open({ url: data.url });
}

/** Registra listeners de deep link (chamar uma vez no boot do app) */
export function initNativeAuth() {
  if (!Capacitor.isNativePlatform()) return undefined;

  const openSub = App.addListener('appUrlOpen', ({ url }) => {
    handleAuthCallbackUrl(url);
  });

  App.getLaunchUrl()
    .then((result) => {
      if (result?.url) handleAuthCallbackUrl(result.url);
    })
    .catch(() => {});

  return () => {
    openSub.then((h) => h.remove());
  };
}
