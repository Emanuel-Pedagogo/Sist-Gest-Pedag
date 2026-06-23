import React from 'react';

/**
 * Shell padrão para modais — layout responsivo (mobile/tablet).
 */
function ModalShell({
  open,
  onClose,
  disabled = false,
  children,
  maxWidth = 600,
  panelClassName = '',
  handleBackdropMouseDown,
  handleBackdropClick,
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleBackdropMouseDown}
      onClick={(e) => {
        if (handleBackdropClick && onClose) {
          handleBackdropClick(e, () => {
            if (!disabled) onClose();
          });
        } else if (e.target === e.currentTarget && onClose && !disabled) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`modal-panel${panelClassName ? ` ${panelClassName}` : ''}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
