import React from 'react';
import EmptyState from './EmptyState';

/**
 * Área "Minhas entregas" do professor (autodeclaração).
 * Reaproveita o mesmo modelo entregas_docentes usado pelo coordenador.
 */
const ProfessorEntregasView = ({
  professor,
  entregas,
  loading,
  error,
  filter,
  setFilter,
  onNovaEntrega,
  onEditEntrega,
  onDeleteEntrega,
}) => {
  const filtered =
    filter === 'todos'
      ? entregas
      : entregas.filter((e) => String(e.status || '').toLowerCase() === filter);

  return (
    <section id="view-professor-entregas" className="view-section">
      <div className="page-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Minhas entregas</h2>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.9rem' }}>
            {professor?.nome
              ? `${professor.nome}${professor.disciplina ? ` · ${professor.disciplina}` : ''}`
              : 'Declare planos, diários e demais documentos entregues à coordenação.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={onNovaEntrega}
        >
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          Nova entrega
        </button>
      </div>

      <div className="segmented-control" style={{ marginBottom: 16, maxWidth: 420 }}>
        {[
          { id: 'todos', label: 'Todas' },
          { id: 'pendente', label: 'Pendentes' },
          { id: 'entregue', label: 'Entregues' },
          { id: 'atrasado', label: 'Atrasadas' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={filter === opt.id ? 'active' : ''}
            onClick={() => setFilter(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#888' }}>Carregando entregas...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="fas fa-folder-open"
          title="Nenhuma entrega nesta lista"
          description="Registre o que você já entregou à coordenação (plano de aula, diário, sondagem etc.)."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="list-container">
          {filtered.map((item) => (
            <div key={item.id} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{item.tipo_documento}</strong>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
                  {item.referencia}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 6 }}>
                  Status: <strong>{item.status}</strong>
                  {item.prazo ? ` · Prazo ${new Date(item.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                </div>
                {item.observacoes ? (
                  <div style={{ fontSize: '0.85rem', marginTop: 6 }}>{item.observacoes}</div>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
                  onClick={() => onEditEntrega(item)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title="Excluir"
                  aria-label="Excluir entrega"
                  onClick={() => onDeleteEntrega(item.id)}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProfessorEntregasView;
