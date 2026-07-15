import { nivelMatchesLista } from './sondagemNiveis';
import { ETIQUETA_LABELS, getEtiquetaLabel } from './etiquetas';
import { isEnsinoMedioText } from './anosEscolares';

export { ETIQUETA_LABELS };

/** Pré I ou Pré II (educação infantil). */
export function isTurmaPreEscola(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  const t = turmaNome.trim().toLowerCase();
  return (
    /\b(pré|pre)\s*(i|1)\b/.test(t) ||
    /\b(pré|pre)\s*(ii|2)\b/.test(t)
  );
}

/** 1º ano do fundamental (não ensino médio). */
export function isTurmaPrimeiroAno(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  if (isEnsinoMedioText(turmaNome)) return false;
  return /1º|1o|1°|primeiro\s*ano/i.test(turmaNome.trim());
}

/** Pré I, Pré II e 1º ano: etiqueta só por leitura, escrita e ocorrências. */
export function ignorarNotasNaEtiqueta(turmaNome, anoEscolar) {
  const anos = Array.isArray(anoEscolar)
    ? anoEscolar
    : anoEscolar != null && String(anoEscolar).trim() !== ''
      ? [anoEscolar]
      : [];

  for (const item of anos) {
    const s = String(item).trim().toLowerCase();
    if (/^pré\s*i$|^pre\s*i$|^pré\s*1$|^pre\s*1$/i.test(s)) return true;
    if (/^pré\s*ii$|^pre\s*ii$|^pré\s*2$|^pre\s*2$/i.test(s)) return true;
    if (/^1º\s*ano$|^1°\s*ano$|^1o\s*ano$|^primeiro\s*ano$/i.test(s)) return true;
    if (isTurmaPreEscola(String(item)) || isTurmaPrimeiroAno(String(item))) return true;
  }

  if (turmaNome) {
    if (isTurmaPreEscola(turmaNome) || isTurmaPrimeiroAno(turmaNome)) return true;
  }

  return false;
}

function criterioNotasAtende(criteria, data, considerarNotas) {
  if (
    !considerarNotas ||
    criteria.notaMin === '' ||
    criteria.notaMax === '' ||
    !data.notas?.length
  ) {
    return false;
  }
  const media = data.notas.reduce((a, b) => a + b, 0) / data.notas.length;
  return media >= parseFloat(criteria.notaMin) && media <= parseFloat(criteria.notaMax);
}

function criterioSondagemAtende(criteria, data) {
  if (!data.sondagem) return false;
  const leitura =
    criteria.niveisLeitura?.length > 0 &&
    nivelMatchesLista(data.sondagem.nivel_leitura, criteria.niveisLeitura);
  const escrita =
    criteria.niveisEscrita?.length > 0 &&
    nivelMatchesLista(data.sondagem.nivel_escrita, criteria.niveisEscrita);
  return leitura || escrita;
}

function criterioOcorrenciasAtende(criteria, data) {
  return (
    criteria.tiposOcorrencia?.length > 0 &&
    data.ocorrencias?.some((tipo) => criteria.tiposOcorrencia.includes(tipo))
  );
}

function corAtendeCriterios(criteria, data, considerarNotas) {
  return (
    criterioNotasAtende(criteria, data, considerarNotas) ||
    criterioSondagemAtende(criteria, data) ||
    criterioOcorrenciasAtende(criteria, data)
  );
}

/** Origem automática da etiqueta: Notas, Sondagem ou Ocorrência. */
export function getMotivoOrigemEtiqueta(tagConfig, data, cor, options = {}) {
  if (!cor || cor === 'roxo' || cor === 'azul') return null;
  const criteria = tagConfig?.[cor];
  if (!criteria) return null;

  const { turmaNome, anoEscolar } = options;
  const considerarNotas = !ignorarNotasNaEtiqueta(turmaNome, anoEscolar);

  if (criterioNotasAtende(criteria, data, considerarNotas)) return 'Notas';
  if (criterioSondagemAtende(criteria, data)) return 'Sondagem';
  if (criterioOcorrenciasAtende(criteria, data)) return 'Ocorrência';
  return null;
}

export function formatEtiquetaMotivoTexto(aluno) {
  const cor = aluno?.etiqueta_cor || 'azul';
  const label = getEtiquetaLabel(cor);
  const motivoManual = aluno?.motivo_etiqueta?.trim();
  const motivoAuto = aluno?.etiqueta_motivo_origem;

  if (cor === 'roxo') {
    if (motivoManual) return `${label}: ${motivoManual}`;
    if (aluno?.aee_deficiencia) return `${label}: ${aluno.aee_deficiencia}`;
    return null;
  }

  const motivo = motivoManual || motivoAuto;
  if (!motivo) return null;
  if (motivo.toLowerCase().startsWith(label.toLowerCase())) return motivo;
  return `${label}: ${motivo}`;
}

export const evaluateStudentEtiqueta = (tagConfig, data, options = {}) => {
  const colorsOrder = ['roxo', 'vermelho', 'amarelo', 'verde', 'azul'];

  for (const cor of colorsOrder) {
    const criteria = tagConfig[cor];
    if (!criteria) continue;

    const { turmaNome, anoEscolar } = options;
    const considerarNotas = !ignorarNotasNaEtiqueta(turmaNome, anoEscolar);

    if (corAtendeCriterios(criteria, data, considerarNotas)) {
      return {
        cor,
        motivoOrigem: getMotivoOrigemEtiqueta(tagConfig, data, cor, options),
      };
    }
  }

  return { cor: 'azul', motivoOrigem: null };
};

export const evaluateStudentColor = (tagConfig, data, options = {}) =>
  evaluateStudentEtiqueta(tagConfig, data, options).cor;
