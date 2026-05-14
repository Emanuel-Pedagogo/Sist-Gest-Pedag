import React from 'react';

const ClassModal = ({
  showClassModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  setShowClassModal,
  setEditingClass,
  setClassFormData,
  activeSchoolId,
  selectedYear,
  editingClass,
  handleSaveClass,
  classFormData,
  schools,
  generateTurmaNome,
  savingClass,
}) => {
  if (!showClassModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}
      onMouseDown={handleBackdropMouseDown}
      onClick={(e) => handleBackdropClick(e, () => {
        setShowClassModal(false);
        setEditingClass(null);
        setClassFormData({ nome: '', ano: [], codigo: '', professor_regente: '', aluno_representante: '', escola_id: activeSchoolId || '', ano_letivo: selectedYear });
      })}
    >
      <div
        style={{
          background: 'white',
          padding: 20,
          borderRadius: 12,
          width: '90%',
          maxWidth: 750,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 12, color: 'var(--primary)', fontSize: '1.3em' }}>
          {editingClass ? 'Editar Turma' : 'Nova Turma'}
        </h2>
        <form onSubmit={handleSaveClass}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            {/* Linha 1: Escola | Ano Letivo */}
            <div className="input-group">
              <label>Escola *</label>
              <select
                required
                value={classFormData.escola_id || activeSchoolId || ''}
                onChange={(e) => {
                  const newEscolaId = e.target.value;
                  setClassFormData({ ...classFormData, escola_id: newEscolaId });
                }}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                }}
              >
                <option value="">Selecione uma escola...</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.nome} ({school.tipo_estrutura})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Ano Letivo *</label>
              <select
                required
                value={classFormData.ano_letivo || selectedYear}
                onChange={(e) => {
                  setClassFormData({ ...classFormData, ano_letivo: parseInt(e.target.value) });
                }}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                }}
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            {/* Linha 2: Anos Escolares (2 colunas) */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.9em' }}>Anos Escolares * (selecione um ou mais)</label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  gap: '2px',
                  marginTop: 4,
                  padding: '4px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  background: '#f9f9f9',
                }}
              >
                {['Pré I', 'Pré II', '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'].map((anoOption) => (
                  <label
                    key={anoOption}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: 4,
                      transition: 'background 0.2s',
                      fontSize: '0.75em',
                      flex: '1 1 0',
                      minWidth: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={classFormData.ano.includes(anoOption)}
                      onChange={(e) => {
                        const newAnos = e.target.checked
                          ? [...classFormData.ano, anoOption]
                          : classFormData.ano.filter((a) => a !== anoOption);
                        const suggestedNome = generateTurmaNome(newAnos);
                        // Aplicar sugestão automaticamente apenas se o campo estiver vazio
                        setClassFormData({
                          ...classFormData,
                          ano: newAnos,
                          nome: !classFormData.nome ? suggestedNome : classFormData.nome,
                        });
                      }}
                      style={{ cursor: 'pointer', width: '14px', height: '14px', margin: 0, flexShrink: 0 }}
                    />
                    <span style={{ textAlign: 'center', lineHeight: '1.2' }}>{anoOption}</span>
                  </label>
                ))}
              </div>
              {classFormData.ano.length === 0 && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8em', marginTop: 3 }}>
                  Selecione pelo menos um ano escolar
                </div>
              )}
            </div>

            {/* Linha 3: Nome | Código */}
            <div className="input-group">
              <label>Nome da Turma *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  required
                  value={classFormData.nome}
                  onChange={(e) => setClassFormData({ ...classFormData, nome: e.target.value })}
                  placeholder={generateTurmaNome(classFormData.ano) || "Ex: 3º Ano A"}
                  style={{ flex: 1 }}
                />
                {classFormData.ano.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const suggestedNome = generateTurmaNome(classFormData.ano);
                      setClassFormData({ ...classFormData, nome: suggestedNome });
                    }}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#f0f0f0',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      fontSize: '0.85em',
                      whiteSpace: 'nowrap',
                    }}
                    title="Usar sugestão automática"
                  >
                    Usar Sugestão
                  </button>
                )}
              </div>
            </div>

            <div className="input-group">
              <label>Código da Turma</label>
              <input
                type="text"
                value={classFormData.codigo}
                onChange={(e) => setClassFormData({ ...classFormData, codigo: e.target.value })}
                placeholder="Ex: 301, 302 (opcional)"
              />
            </div>

            {/* Linha 4: Professor Regente | Aluno Representante */}
            <div className="input-group">
              <label>Professor Regente *</label>
              <input
                type="text"
                required
                value={classFormData.professor_regente}
                onChange={(e) =>
                  setClassFormData({ ...classFormData, professor_regente: e.target.value })
                }
                placeholder="Nome do professor"
              />
            </div>

            <div className="input-group">
              <label>Aluno Representante</label>
              <input
                type="text"
                value={classFormData.aluno_representante}
                onChange={(e) =>
                  setClassFormData({ ...classFormData, aluno_representante: e.target.value })
                }
                placeholder="Nome do aluno representante (opcional)"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setShowClassModal(false);
                setEditingClass(null);
                setClassFormData({ nome: '', ano: [], codigo: '', professor_regente: '', aluno_representante: '', escola_id: activeSchoolId || '', ano_letivo: selectedYear });
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '0.9em',
              }}
              disabled={savingClass}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9em' }}
              disabled={savingClass}
            >
              {savingClass ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassModal;
