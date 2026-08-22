import { Capacitor } from '@capacitor/core';

/** Status bar, teclado e navegação nativa (Android). */
export function initNativeUi() {
  if (!Capacitor.isNativePlatform()) return undefined;

  const cleanups = [];

  import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => {
      StatusBar.setBackgroundColor({ color: '#2C3E50' });
      StatusBar.setStyle({ style: Style.Light });
    })
    .catch(() => {});

  import('@capacitor/keyboard')
    .then(({ Keyboard }) => {
      document.body.classList.add('native-keyboard');
      const showSub = Keyboard.addListener('keyboardWillShow', (info) => {
        document.documentElement.style.setProperty(
          '--keyboard-offset',
          `${info.keyboardHeight || 0}px`,
        );
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--keyboard-offset', '0px');
      });
      cleanups.push(() => {
        showSub.then((h) => h.remove());
        hideSub.then((h) => h.remove());
      });
    })
    .catch(() => {});

  import('@capacitor/app')
    .then(({ App }) => {
      const backSub = App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) window.history.back();
      });
      cleanups.push(() => {
        backSub.then((h) => h.remove());
      });
    })
    .catch(() => {});

  return () => cleanups.forEach((fn) => fn());
}
