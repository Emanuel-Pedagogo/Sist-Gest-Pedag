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

/** @param {string | null | undefined} cor */
export function getEtiquetaLabel(cor) {
  return ETIQUETA_LABELS[cor || 'azul'] || ETIQUETA_LABELS.azul;
}

/** @param {string | null | undefined} cor */
export function getEtiquetaIcon(cor) {
  return ETIQUETA_ICONS[cor || 'azul'] || ETIQUETA_ICONS.azul;
}
