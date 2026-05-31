import { Capacitor } from '@capacitor/core';

/** Abre câmera ou galeria e retorna um File (somente app nativo). */
export async function pickPhotoAsFile(baseName = 'sondagem') {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Disponível apenas no app Android.');
  }

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
  });

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const ext = photo.format === 'png' ? 'png' : 'jpeg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const name = `${baseName}.${ext === 'jpeg' ? 'jpg' : ext}`;

  return new File([blob], name, { type: mime });
}
