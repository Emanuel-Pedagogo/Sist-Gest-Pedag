import React from 'react';

const EmptyState = ({
  icon = 'fas fa-inbox',
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="empty-state">
    {icon && <i className={`empty-state__icon ${icon}`} aria-hidden="true" />}
    {title && <h3 className="empty-state__title">{title}</h3>}
    {description && <p className="empty-state__description">{description}</p>}
    {actionLabel && onAction && (
      <button type="button" className="btn-primary empty-state__action" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
