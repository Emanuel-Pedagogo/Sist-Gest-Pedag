import React from 'react';

const TeacherDetailView = ({
  setSelectedTeacherId,
  setSelectedTeacher,
  setTeacherProfileMissing,
  navigate,
  teacherProfileMissing,
  selectedTeacher,
  activeSchool,
  teacherProfileTab,
  setTeacherProfileTab,
  openEntregaModal,
  entregaCounts,
  entregaFilter,
  setEntregaFilter,
  entregasLoading,
  entregasError,
  entregasFiltradas,
  getEntregaDisplayStatus,
  formatDate,
  handleDeleteEntrega,
  openRegistroCoordModal,
  registrosCoordLoading,
  registrosCoordError,
  registrosCoordenacao,
  handleDeleteRegistroCoord,
}) => {
  return (
    <div id="view-teacher-detail" className="view-section">
      <div
        className="breadcrumb"
        onClick={() => {
          setSelectedTeacherId(null);
          setSelectedTeacher(null);
          setTeacherProfileMissing(false);
          navigate('teachers');
        }}
      >
        <i className="fas fa-arrow-left" /> Voltar para Professores
      </div>

      {teacherProfileMissing && (
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 8,
            border: '1px solid #eee',
          }}
        >
          <p style={{ marginTop: 0 }}>Não foi possível carregar este professor. Ele pode ter sido removido.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setSelectedTeacherId(null);
              setSelectedTeacher(null);
              setTeacherProfileMissing(false);
              navigate('teachers');
            }}
          >
            Voltar à lista
          </button>
        </div>
      )}

      {!teacherProfileMissing && !selectedTeacher && (
        <div className="list-container" style={{ marginTop: 12 }}>
          <div className="list-item">
            <span>Carregando professor...</span>
          </div>
        </div>
      )}

      {!teacherProfileMissing && selectedTeacher && (
        <>
          <div className="student-header">
            <div
              style={{
                width: 60,
                height: 60,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5em',
                color: 'white',
              }}
            >
              <i className="fas fa-chalkboard-teacher" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0 }}>{selectedTeacher.nome || 'Professor'}</h2>
              <span style={{ color: 'gray' }}>
                {selectedTeacher.disciplina || 'Disciplina não informada'}
                {activeSchool?.nome ? ` • ${activeSchool.nome}` : ''}
                {selectedTeacher.ano_letivo ? ` • ${selectedTeacher.ano_letivo}` : ''}
              </span>
            </div>
          </div>

          <div className="student-tabs">
            <div
              className={`tab ${teacherProfileTab === 'entregas' ? 'active' : ''}`}
              onClick={() => setTeacherProfileTab('entregas')}
            >
              Entregas pedagógicas
            </div>
            <div
              className={`tab ${teacherProfileTab === 'acompanhamento' ? 'active' : ''}`}
              onClick={() => setTeacherProfileTab('acompanhamento')}
            >
              Acompanhamento pedagógico
            </div>
          </div>

          {teacherProfileTab === 'entregas' && (
            <div className="tab-content active">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>Entregas pedagógicas</h3>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => openEntregaModal()}
                >
                  <i className="fas fa-plus" style={{ marginRight: 6 }} />
                  Nova exigência
                </button>
              </div>
              <p style={{ color: 'var(--text-light)', marginTop: 0, marginBottom: 16, fontSize: '0.95em' }}>
                Acompanhe planos, diários e demais documentos. O status &quot;Atrasado&quot; também aparece quando o prazo
                venceu e a entrega ainda está pendente.
              </p>

              <div className="cards-grid" style={{ marginBottom: 18 }}>
                <div className="card">
                  <h4>Pendentes</h4>
                  <div className="number" style={{ color: 'var(--warning)' }}>
                    {entregaCounts.pendente}
                  </div>
                </div>
                <div className="card">
                  <h4>Entregues</h4>
                  <div className="number" style={{ color: 'var(--success)' }}>
                    {entregaCounts.entregue}
                  </div>
                </div>
                <div className="card">
                  <h4>Atrasados</h4>
                  <div className="number" style={{ color: 'var(--danger)' }}>
                    {entregaCounts.atrasado}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'pendente', label: 'Pendente' },
                  { id: 'entregue', label: 'Entregue' },
                  { id: 'atrasado', label: 'Atrasado' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setEntregaFilter(f.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: entregaFilter === f.id ? '2px solid var(--primary)' : '1px solid #ddd',
                      background: entregaFilter === f.id ? 'rgba(13, 110, 253, 0.08)' : 'white',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {entregasLoading && (
                <div className="list-container">
                  <div className="list-item">
                    <span>Carregando entregas...</span>
                  </div>
                </div>
              )}
              {entregasError && (
                <div className="list-container">
                  <div className="list-item">
                    <span>{entregasError}</span>
                  </div>
                </div>
              )}
              {!entregasLoading && !entregasError && entregasFiltradas.length === 0 && (
                <div className="list-container">
                  <div className="list-item">
                    <span>Nenhuma exigência neste filtro.</span>
                  </div>
                </div>
              )}
              {!entregasLoading && !entregasError && entregasFiltradas.length > 0 && (
                <div className="list-container">
                  {entregasFiltradas.map((e) => {
                    const st = getEntregaDisplayStatus(e);
                    const badgeBg =
                      st === 'entregue' ? 'var(--success)' : st === 'atrasado' ? 'var(--danger)' : 'var(--warning)';
                    const badgeText =
                      st === 'entregue' ? 'Entregue' : st === 'atrasado' ? 'Atrasado' : 'Pendente';
                    return (
                      <div key={e.id} className="list-item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                            <strong>{e.tipo_documento || 'Documento'}</strong>
                            <span
                              className="badge"
                              style={{
                                background: badgeBg,
                                fontSize: '0.75em',
                              }}
                            >
                              {badgeText}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9em', color: '#555', marginBottom: 4 }}>
                            <i className="fas fa-bookmark" style={{ marginRight: 6, opacity: 0.7 }} />
                            {e.referencia || 'Sem referência'}
                          </div>
                          {e.prazo && (
                            <div style={{ fontSize: '0.85em', color: 'var(--text-light)' }}>
                              Prazo: {formatDate(e.prazo)}
                            </div>
                          )}
                          {e.observacoes && (
                            <div style={{ fontSize: '0.85em', color: '#666', marginTop: 8, lineHeight: 1.45 }}>
                              {e.observacoes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => openEntregaModal(e)}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #0d6efd',
                              borderRadius: 6,
                              background: 'white',
                              color: '#0d6efd',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntrega(e)}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #dc3545',
                              borderRadius: 6,
                              background: 'white',
                              color: '#dc3545',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {teacherProfileTab === 'acompanhamento' && (
            <div className="tab-content active">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>Acompanhamento pedagógico</h3>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => openRegistroCoordModal()}
                >
                  <i className="fas fa-plus" style={{ marginRight: 6 }} />
                  Registrar conversa
                </button>
              </div>
              <p style={{ color: 'var(--text-light)', marginTop: 0, marginBottom: 20, fontSize: '0.95em' }}>
                Reuniões, feedbacks e observações de sala — em ordem da data mais recente.
              </p>

              {registrosCoordLoading && (
                <div className="list-container">
                  <div className="list-item">
                    <span>Carregando registros...</span>
                  </div>
                </div>
              )}
              {registrosCoordError && (
                <div className="list-container">
                  <div className="list-item">
                    <span>{registrosCoordError}</span>
                  </div>
                </div>
              )}
              {!registrosCoordLoading && !registrosCoordError && registrosCoordenacao.length === 0 && (
                <div className="list-container">
                  <div className="list-item">
                    <span>Nenhum registro ainda. Use "Registrar conversa" para começar.</span>
                  </div>
                </div>
              )}
              {!registrosCoordLoading && !registrosCoordError && registrosCoordenacao.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {registrosCoordenacao.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr',
                        gap: 16,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #eee',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          background: '#f8f9fa',
                          padding: 16,
                          textAlign: 'center',
                          borderRight: '1px solid #eee',
                        }}
                      >
                        <div style={{ fontSize: '0.75em', color: 'var(--text-light)', textTransform: 'uppercase' }}>
                          Data
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginTop: 4 }}>
                          {r.data_conversa
                            ? (() => {
                                const d = String(r.data_conversa).split('T')[0];
                                const [y, m, day] = d.split('-');
                                return `${day}/${m}/${y}`;
                              })()
                            : '—'}
                        </div>
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1.05em', color: 'var(--primary)' }}>{r.assunto || 'Sem assunto'}</strong>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => openRegistroCoordModal(r)}
                              style={{
                                padding: '4px 10px',
                                border: '1px solid #0d6efd',
                                borderRadius: 6,
                                background: 'white',
                                color: '#0d6efd',
                                cursor: 'pointer',
                                fontSize: 12,
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRegistroCoord(r)}
                              style={{
                                padding: '4px 10px',
                                border: '1px solid #dc3545',
                                borderRadius: 6,
                                background: 'white',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: 12,
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                        {r.relato && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: '0.8em', color: 'var(--text-light)', marginBottom: 4 }}>Relato</div>
                            <div style={{ fontSize: '0.95em', lineHeight: 1.5, color: '#333' }}>{r.relato}</div>
                          </div>
                        )}
                        {r.encaminhamentos && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: 12,
                              background: '#f0f7ff',
                              borderRadius: 6,
                              borderLeft: '3px solid var(--accent)',
                            }}
                          >
                            <div style={{ fontSize: '0.8em', color: 'var(--text-light)', marginBottom: 4 }}>
                              Encaminhamentos
                            </div>
                            <div style={{ fontSize: '0.95em', lineHeight: 1.5, color: '#333' }}>{r.encaminhamentos}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherDetailView;
