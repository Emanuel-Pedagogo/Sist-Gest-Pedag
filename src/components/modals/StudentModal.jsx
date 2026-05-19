import React from 'react';

const StudentModal = ({
  showStudentModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  setShowStudentModal,
  setEditingStudent,
  setStudentFormData,
  setAeeFormData,
  editingStudent,
  handleSaveStudent,
  studentFormData,
  classes,
  savingStudent,
}) => {
  if (!showStudentModal) return null;

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
        setShowStudentModal(false);
        setEditingStudent(null);
        setStudentFormData({ nome: '', data_nascimento: '', turma_id: '', etiqueta_cor: 'azul', matricula: '', nome_responsavel: '', contato: '', aee_deficiencia: '', aee_cid: '', motivo_etiqueta: '' });
        setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
      })}
    >
      <div
        style={{
          background: 'white',
          padding: 30,
          borderRadius: 12,
          width: '90%',
          maxWidth: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>
          {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
        </h2>
        <form onSubmit={handleSaveStudent}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
            }}
          >
            {/* Linha 1: Nome | Data de Nascimento */}
            <div className="input-group">
              <label>Nome *</label>
              <input
                type="text"
                required
                value={studentFormData.nome}
                onChange={(e) => setStudentFormData({ ...studentFormData, nome: e.target.value })}
                placeholder="Nome completo do aluno"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
              />
            </div>

            <div className="input-group">
              <label>Data de Nascimento *</label>
              <input
                type="date"
                required
                value={studentFormData.data_nascimento}
                onChange={(e) =>
                  setStudentFormData({ ...studentFormData, data_nascimento: e.target.value })
                }
              />
            </div>

            {/* Linha 2: Turma | Matrícula */}
            <div className="input-group">
              <label>Turma *</label>
              <select
                required
                value={studentFormData.turma_id}
                onChange={(e) => setStudentFormData({ ...studentFormData, turma_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                }}
              >
                <option value="">Selecione uma turma...</option>
                {classes.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome} - {turma.codigo}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Matrícula</label>
              <input
                type="text"
                value={studentFormData.matricula}
                onChange={(e) => setStudentFormData({ ...studentFormData, matricula: e.target.value })}
                placeholder="Número da matrícula (opcional)"
              />
            </div>

            {/* Linha 3: Responsável | Contato */}
            <div className="input-group">
              <label>Nome do Responsável</label>
              <input
                type="text"
                value={studentFormData.nome_responsavel}
                onChange={(e) => setStudentFormData({ ...studentFormData, nome_responsavel: e.target.value })}
                placeholder="Nome do responsável (opcional)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
              />
            </div>

            <div className="input-group">
              <label>Contato</label>
              <input
                type="text"
                value={studentFormData.contato}
                onChange={(e) => setStudentFormData({ ...studentFormData, contato: e.target.value })}
                placeholder="Telefone ou email (opcional)"
              />
            </div>

            {/* Linha 4: Etiqueta | Motivo/Deficiência/Condição/CID (2 colunas) */}
            <div className="input-group">
              <label>Etiqueta (Cor) *</label>
              <select
                required
                value={studentFormData.etiqueta_cor}
                onChange={(e) =>
                  setStudentFormData({ ...studentFormData, etiqueta_cor: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                }}
              >
                <option value="vermelho">🔴 Vermelho: Risco</option>
                <option value="amarelo">🟡 Amarelo: Atenção</option>
                <option value="azul">🔵 Azul: Adequado</option>
                <option value="verde">🟢 Verde: Avançado</option>
                <option value="roxo">🟣 Roxo: AEE</option>
              </select>
            </div>

            <div className="input-group">
              {studentFormData.etiqueta_cor === 'roxo' ? (
                <>
                  <label>Deficiência/Condição/CID</label>
                  <input
                    type="text"
                    value={
                      studentFormData.aee_deficiencia || studentFormData.aee_cid
                        ? `${studentFormData.aee_deficiencia || ''}${studentFormData.aee_cid ? (studentFormData.aee_deficiencia ? ' - ' : '') + `CID: ${studentFormData.aee_cid}` : ''}`
                        : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      // Separar deficiência e CID se houver "CID:" no texto
                      const cidMatch = value.match(/CID:\s*([A-Z0-9.]+)/i);
                      let cid = '';
                      let deficiencia = value;
                      
                      if (cidMatch) {
                        cid = cidMatch[1].trim();
                        // Remover a parte do CID do texto
                        deficiencia = value.replace(/CID:\s*[A-Z0-9.]+/i, '').replace(/\s*-\s*$/, '').trim();
                      }
                      
                      setStudentFormData({
                        ...studentFormData,
                        aee_deficiencia: deficiencia,
                        aee_cid: cid,
                      });
                    }}
                    placeholder="Ex: Autismo, Síndrome de Down - CID: F84.0"
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  />
                </>
              ) : (
                <>
                  <label>Motivo</label>
                  <input
                    type="text"
                    value={studentFormData.motivo_etiqueta}
                    onChange={(e) => setStudentFormData({ ...studentFormData, motivo_etiqueta: e.target.value })}
                    placeholder={
                      studentFormData.etiqueta_cor === 'vermelho'
                        ? 'Ex: Frequência, Nota baixa...'
                        : studentFormData.etiqueta_cor === 'amarelo'
                        ? 'Ex: Dificuldade de aprendizagem...'
                        : studentFormData.etiqueta_cor === 'azul'
                        ? 'Ex: Desempenho regular...'
                        : studentFormData.etiqueta_cor === 'verde'
                        ? 'Ex: Bom desempenho...'
                        : 'Motivo da etiqueta'
                    }
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  />
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={() => {
                setShowStudentModal(false);
                setEditingStudent(null);
                setStudentFormData({ nome: '', data_nascimento: '', turma_id: '', etiqueta_cor: 'azul', matricula: '', nome_responsavel: '', contato: '', aee_deficiencia: '', aee_cid: '', motivo_etiqueta: '' });
                setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
              }}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingStudent}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingStudent}
            >
              {savingStudent ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentModal;
