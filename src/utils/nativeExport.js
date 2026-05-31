import { Capacitor } from '@capacitor/core';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      resolve(String(dataUrl).split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function sanitizeFilename(name) {
  return String(name || 'arquivo')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .trim() || 'arquivo';
}

/** Salva ou compartilha um Blob (web: download; app nativo: share sheet). */
export async function saveBlob(blob, filename) {
  const safeName = sanitizeFilename(filename);

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: safeName,
      url: result.uri,
      dialogTitle: 'Salvar ou compartilhar arquivo',
    });
    return;
  }

  const { saveAs } = await import('file-saver');
  saveAs(blob, safeName);
}

/** Exporta jsPDF — download na web, share no app nativo. */
export async function savePdfDocument(doc, filename) {
  const safeName = sanitizeFilename(filename);
  if (Capacitor.isNativePlatform()) {
    const blob = doc.output('blob');
    await saveBlob(blob, safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
    return;
  }
  doc.save(safeName);
}
