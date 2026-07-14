import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: 'fas fa-home' },
  { id: 'classes', label: 'Turmas', icon: 'fas fa-users' },
  { id: 'students', label: 'Alunos', icon: 'fas fa-user-graduate' },
  { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-alt' },
  { id: 'menu', label: 'Mais', icon: 'fas fa-ellipsis-h', isMenu: true },
];

const MobileBottomNav = ({ activeId, onNavigate, onOpenMenu }) => (
  <nav className="mobile-bottom-nav" aria-label="Navegação principal">
    {NAV_ITEMS.map((item) => {
      const isActive = item.isMenu ? activeId === 'menu' : activeId === item.id;
      return (
        <button
          key={item.id}
          type="button"
          className={`mobile-bottom-nav__item${isActive ? ' active' : ''}`}
          onClick={() => (item.isMenu ? onOpenMenu() : onNavigate(item.id))}
          aria-current={isActive ? 'page' : undefined}
          aria-label={item.label}
        >
          <i className={item.icon} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      );
    })}
  </nav>
);

export default MobileBottomNav;
