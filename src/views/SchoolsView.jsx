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
    <div id="view-schools" className="view-section">
      <button
        className="btn-primary"
        style={{ width: 'auto', marginBottom: 20 }}
        onClick={() => {
          setEditingSchool(null);
          setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
          setShowSchoolModal(true);
        }}
      >
        + Nova Escola
      </button>
      <div className="list-container">
        {schoolsLoading && (
          <div className="list-item">
            <span>Carregando escolas...</span>
          </div>
        )}
        {schoolsError && (
          <div className="list-item">
            <span>{schoolsError}</span>
          </div>
        )}
        {!schoolsLoading && !schoolsError && schools.length === 0 && (
          <div className="list-item">
            <span>Nenhuma escola encontrada.</span>
          </div>
        )}
        {!schoolsLoading &&
          !schoolsError &&
          [...schools]
            .sort((a, b) => {
              const arqA = a.arquivada ? 1 : 0;
              const arqB = b.arquivada ? 1 : 0;
              if (arqA !== arqB) return arqA - arqB; // ativas primeiro
              return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
            })
            .map((school) => (
              <div key={school.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <strong>{school.nome}</strong>
                  <div style={{ fontSize: '0.8em', color: 'gray' }}>
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
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchiveSchool(school);
                    }}
                    style={{
                      background: school.arquivada ? '#374151' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    title={school.arquivada ? 'Desarquivar escola' : 'Arquivar escola'}
                  >
                    <i className={`fas ${school.arquivada ? 'fa-box-open' : 'fa-archive'}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSchool(school);
                    }}
                    style={{
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSchool(school.id);
                    }}
                    style={{
                      background: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fas fa-trash" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectSchool(school);
                    }}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    title="Acessar turmas desta escola"
                  >
                    <i className="fas fa-arrow-right" />
                  </button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};

export default SchoolsView;
