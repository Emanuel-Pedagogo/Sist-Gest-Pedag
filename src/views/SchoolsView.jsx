import React from 'react';

const SchoolsView = ({
  schoolsLoading,
  schoolsError,
  schools,
  setEditingSchool,
  setSchoolFormData,
  setShowSchoolModal,
  handleToggleArchiveSchool,
  handleEditSchool,
  handleDeleteSchool,
  selectSchool,
}) => {
  return (
    <section id="view-schools" className="view-section">
      <div className="page-toolbar">
        <h2>Escolas</h2>
        <button
          className="btn-primary"
          style={{ width: 'auto' }}
          onClick={() => {
            setEditingSchool(null);
            setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
            setShowSchoolModal(true);
          }}
        >
          + Nova Escola
        </button>
      </div>
      <div className="list-container schools-grid">
        {schoolsLoading && (
          <div className="list-item list-item--full-width school-card">
            <span>Carregando escolas...</span>
          </div>
        )}
        {schoolsError && (
          <div className="list-item list-item--full-width school-card">
            <span>{schoolsError}</span>
          </div>
        )}
        {!schoolsLoading && !schoolsError && schools.length === 0 && (
          <div className="list-item list-item--full-width school-card">
            <span>Nenhuma escola encontrada.</span>
          </div>
        )}
        {!schoolsLoading &&
          !schoolsError &&
          [...schools]
            .sort((a, b) => {
              const arqA = a.arquivada ? 1 : 0;
              const arqB = b.arquivada ? 1 : 0;
              if (arqA !== arqB) return arqA - arqB;
              return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
            })
            .map((school) => (
              <div key={school.id} className="list-item school-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{school.nome}</strong>
                  <div className="list-item__meta">
                    INEP: {school.inep || 'Não informado'} • {school.endereco || 'Endereço não informado'}
                  </div>
                  <span
                    className={`badge ${
                      school.tipo_estrutura === 'Polo' ? 'bg-blue' : 'bg-green'
                    }`}
                    style={{ marginTop: 5, display: 'inline-block' }}
                  >
                    {school.tipo_estrutura}
                  </span>
                  {school.arquivada && (
                    <span
                      className="badge"
                      style={{
                        marginTop: 5,
                        display: 'inline-block',
                        marginLeft: 8,
                        background: '#6b7280',
                        color: 'white',
                      }}
                    >
                      Arquivada
                    </span>
                  )}
                </div>
                <div className="list-item-actions">
                  <button
                    type="button"
                    className={`btn-icon ${school.arquivada ? 'btn-icon--muted' : 'btn-icon--warning'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchiveSchool(school);
                    }}
                    title={school.arquivada ? 'Desarquivar escola' : 'Arquivar escola'}
                  >
                    <i className={`fas ${school.arquivada ? 'fa-box-open' : 'fa-archive'}`} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSchool(school);
                    }}
                    title="Editar escola"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSchool(school.id);
                    }}
                    title="Excluir escola"
                  >
                    <i className="fas fa-trash" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectSchool(school);
                    }}
                    title="Acessar turmas desta escola"
                  >
                    <i className="fas fa-arrow-right" />
                  </button>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
};

export default SchoolsView;
