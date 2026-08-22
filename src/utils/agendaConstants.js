export const ETIQUETA_CORES = [
  { id: 'aniversario', label: 'Aniversário', color: '#BE185D' },
  { id: 'reuniao', label: 'Reunião', color: '#1D4ED8' },
  { id: 'pedagogico', label: 'Pedagógico', color: '#15803D' },
  { id: 'projeto', label: 'Projeto', color: '#6D28D9' },
  { id: 'formacao', label: 'Formação', color: '#0F766E' },
  { id: 'evento', label: 'Evento', color: '#B45309' },
];

export const ALL_ETIQUETA_IDS = ETIQUETA_CORES.map((e) => e.id);

const LEGACY_COLOR_MAP = {
  vermelho: '#BE185D',
  verde: '#15803D',
  amarelo: '#B45309',
  azul: '#1D4ED8',
};

export const INITIAL_EVENT_FORM_DATA = {
  titulo: '',
  descricao: '',
  // Turma à qual o evento se refere. Vazio = vale para todas as turmas.
  // Usado para levar o planejamento do dia até o Diário de Classe da turma.
  turma_id: '',
  data_inicio: '',
  hora_inicio: '08:00',
  data_fim: '',
  hora_fim: '09:00',
  cor_etiqueta: ETIQUETA_CORES.find((e) => e.id === 'reuniao').color,
  anexo_nome: '',
  anexo_file: null,
  recorrencia_tipo: 'nenhuma',
  recorrencia_ate: '',
  incluir_sabado: false,
  incluir_domingo: false,
};

export const RECORRENCIA_OPCOES = [
  { value: 'nenhuma', label: 'Não repetir' },
  { value: 'diaria', label: 'Diariamente' },
  { value: 'semanal', label: 'Semanalmente' },
  { value: 'mensal', label: 'Mensalmente' },
];

export function normalizeEventColor(cor) {
  if (typeof cor !== 'string') return ETIQUETA_CORES.find((e) => e.id === 'evento').color;
  if (cor.startsWith('#')) {
    const match = ETIQUETA_CORES.find((e) => e.color.toLowerCase() === cor.toLowerCase());
    return match ? match.color : cor;
  }
  return LEGACY_COLOR_MAP[cor] || ETIQUETA_CORES.find((e) => e.id === 'evento').color;
}

export function getEventColor(ev) {
  if (ev?.tipo === 'aniversario') {
    return ETIQUETA_CORES.find((e) => e.id === 'aniversario').color;
  }
  return normalizeEventColor(ev?.cor_etiqueta);
}

export function getEventCategoryId(ev) {
  if (ev?.tipo === 'aniversario') return 'aniversario';
  const cor = getEventColor(ev);
  const match = ETIQUETA_CORES.find((e) => e.color.toLowerCase() === cor.toLowerCase());
  return match?.id || 'evento';
}

export function getEtiquetaById(id) {
  return ETIQUETA_CORES.find((e) => e.id === id);
}
