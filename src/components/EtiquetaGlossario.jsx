import React, { useState } from 'react';
import ModalShell from './ModalShell';
import EtiquetaIcon from './EtiquetaIcon';
import {
  ETIQUETA_ORDER,
  ETIQUETA_GLOSSARIO,
  ETIQUETA_COLORS,
  ETIQUETA_LABELS,
} from '../utils/etiquetas';

const EtiquetaGlossarioButton = ({ className = '', compact = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`etiqueta-glossario-btn${className ? ` ${className}` : ''}`}
        onClick={() => setOpen(true)}
        aria-label="O que significam as etiquetas?"
        title="O que significam as etiquetas?"
      >
        <i className="fas fa-question-circle" aria-hidden="true" />
        {!compact && <span>O que são as etiquetas?</span>}
      </button>

      <ModalShell open={open} onClose={() => setOpen(false)} maxWidth={520}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Etiquetas pedagógicas</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-light, #666)', lineHeight: 1.5 }}>
          As etiquetas ajudam a enxergar rapidamente quem precisa de mais apoio. Elas podem ser definidas
          automaticamente pelas regras em Configurações ou ajustadas manualmente no cadastro do aluno.
        </p>
        <ul className="etiqueta-glossario-list">
          {ETIQUETA_ORDER.map((cor) => (
            <li key={cor} className="etiqueta-glossario-item">
              <div
                className="etiqueta-glossario-item__badge"
                style={{ borderLeftColor: ETIQUETA_COLORS[cor] }}
              >
                <EtiquetaIcon cor={cor} size="1rem" />
                <strong>{ETIQUETA_LABELS[cor]}</strong>
              </div>
              <p>{ETIQUETA_GLOSSARIO[cor]}</p>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} onClick={() => setOpen(false)}>
            Entendi
          </button>
        </div>
      </ModalShell>
    </>
  );
};

export default EtiquetaGlossarioButton;
