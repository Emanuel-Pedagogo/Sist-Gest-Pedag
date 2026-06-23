import React from 'react';
import { getEtiquetaIcon, getEtiquetaLabel } from '../utils/etiquetas';

const EtiquetaIcon = ({ cor, size = '1.2em' }) => {
  const { className, color } = getEtiquetaIcon(cor);
  const label = getEtiquetaLabel(cor);
  return (
    <i
      className={className}
      style={{ color, fontSize: size, width: 24, textAlign: 'center' }}
      title={label}
      aria-label={label}
    />
  );
};

export default EtiquetaIcon;
