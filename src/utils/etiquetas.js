/** Rótulos, cores e ícones das etiquetas pedagógicas (fonte única no app). */

export const ETIQUETA_ORDER = ['azul', 'verde', 'amarelo', 'vermelho', 'roxo'];

export const ETIQUETA_LABELS = {
  azul: 'Adequado',
  verde: 'Avançado',
  amarelo: 'Atenção',
  vermelho: 'Risco',
  roxo: 'AEE',
};

export const ETIQUETA_COLORS = {
  azul: '#3498DB',
  verde: '#2ecc71',
  amarelo: '#f1c40f',
  vermelho: '#e74c3c',
  roxo: '#9b59b6',
};

export const ETIQUETA_ICONS = {
  azul: { className: 'fas fa-user', color: '#007bff' },
  verde: { className: 'fas fa-star', color: '#28a745' },
  amarelo: { className: 'fas fa-exclamation-circle', color: '#ffc107' },
  vermelho: { className: 'fas fa-exclamation-triangle', color: '#dc3545' },
  roxo: { className: 'fas fa-wheelchair', color: '#9c27b0' },
};

/** Textos em linguagem simples para o glossário (?) das etiquetas. */
export const ETIQUETA_GLOSSARIO = {
  azul: 'Desempenho dentro do esperado para a série. Não exige intervenção imediata.',
  verde: 'Desempenho acima do esperado ou em avanço consistente na leitura, escrita ou notas.',
  amarelo: 'Sinais de dificuldade que pedem acompanhamento. Vale observar de perto e registrar ações.',
  vermelho: 'Situação que precisa de atenção prioritária da coordenação e da equipe da turma.',
  roxo: 'Aluno com atendimento educacional especializado (AEE). Pode ter laudo e plano individual.',
};

/** @param {string | null | undefined} cor */
export function getEtiquetaLabel(cor) {
  return ETIQUETA_LABELS[cor || 'azul'] || ETIQUETA_LABELS.azul;
}

/** @param {string | null | undefined} cor */
export function getEtiquetaIcon(cor) {
  return ETIQUETA_ICONS[cor || 'azul'] || ETIQUETA_ICONS.azul;
}
