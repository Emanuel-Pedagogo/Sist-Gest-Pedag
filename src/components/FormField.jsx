import React, { useId, Children, cloneElement, isValidElement } from 'react';

/**
 * Campo de formulário acessível: gera um id automático e associa label,
 * dica e mensagem de erro ao controle (htmlFor, aria-invalid, aria-describedby).
 * Espera um único controle (input/select/textarea) como filho; para campos
 * compostos (controle + botão na mesma linha), use htmlFor/id manualmente.
 */
function FormField({ label, required = false, error = '', hint = '', className = '', style, labelStyle, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-erro`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const control = Children.only(children);
  const controlAcessivel = isValidElement(control)
    ? cloneElement(control, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : control;

  return (
    <div className={`input-group${className ? ` ${className}` : ''}`} style={style}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </label>
      {controlAcessivel}
      {hint ? (
        <small id={hintId} style={{ display: 'block', marginTop: 6, color: '#666', lineHeight: 1.4 }}>
          {hint}
        </small>
      ) : null}
      {error ? (
        <div id={errorId} role="alert" className="input-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default FormField;
