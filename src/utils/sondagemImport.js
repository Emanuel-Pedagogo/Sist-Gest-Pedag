function toPositiveInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number.parseInt(String(value).trim(), 10);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function extractOrdemFicha(registro, fallbackIndex = 0) {
  const explicitOrder =
    toPositiveInteger(registro?.ordem_ficha) ??
    toPositiveInteger(registro?.ordem) ??
    toPositiveInteger(registro?.linha) ??
    toPositiveInteger(registro?.indice_ficha);

  return explicitOrder ?? fallbackIndex + 1;
}

export function normalizeExtractedSondagens(registros = []) {
  const normalized = (registros || []).map((registro, index) => {
    const explicitOrder =
      toPositiveInteger(registro?.ordem_ficha) ??
      toPositiveInteger(registro?.ordem) ??
      toPositiveInteger(registro?.linha) ??
      toPositiveInteger(registro?.indice_ficha);

    return {
      ...registro,
      ordem_ficha: extractOrdemFicha(registro, index),
      ordem_original: index,
      tem_ordem_explicita: explicitOrder !== null,
    };
  });

  const hasExplicitOrder = normalized.some((registro) => registro.tem_ordem_explicita);
  if (!hasExplicitOrder) return normalized;

  return [...normalized].sort((a, b) => {
    if (a.ordem_ficha !== b.ordem_ficha) return a.ordem_ficha - b.ordem_ficha;
    return a.ordem_original - b.ordem_original;
  });
}

export function buildSondagemImportKey(alunoId, data) {
  return alunoId && data ? `${alunoId}::${data}` : '';
}

export function getSondagemPersistenceAction({ alunoId, dataSondagem, overwriteExisting, existingKeys }) {
  const key = buildSondagemImportKey(alunoId, dataSondagem);
  if (!key) return 'missing-key';
  if (!existingKeys?.has(key)) return 'insert';
  return overwriteExisting ? 'update' : 'skip-existing';
}
