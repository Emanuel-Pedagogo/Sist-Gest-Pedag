import React, { useEffect, useMemo, useState } from 'react';

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
  schoolStudentsPicker = [],
  schoolStudentsPickerLoading = false,
  vinculadosTurmaEspecialIds = new Set(),
  onAddExistingStudent,
  isTurmaEspecial,
}) => {
  const [nameSearchQuery, setNameSearchQuery] = useState('');

  useEffect(() => {
    if (!showStudentModal) setNameSearchQuery('');
  }, [showStudentModal]);

  const resetForm = () => {
    setStudentFormData({
      nome: '',
      data_nascimento: '',
      turma_id: '',
      etiqueta_cor: 'azul',
      matricula: '',
      nome_responsavel: '',
      contato: '',
      aee_deficiencia: '',
      aee_cid: '',
      motivo_etiqueta: '',
    });
    setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
    setNameSearchQuery('');
  };

  const turmaDestino = useMemo(
    () => (classes || []).find((c) => String(c.id) === String(studentFormData.turma_id)),
    [classes, studentFormData.turma_id],
  );

  const linkExistingMode =
    !editingStudent && isTurmaEspecial?.(turmaDestino) && Boolean(studentFormData.turma_id);

  const sugestoesAlunos = useMemo(() => {
    if (!linkExistingMode || nameSearchQuery.trim().length < 2) return [];
    const q = nameSearchQuery.toLowerCase().trim();

    return (schoolStudentsPicker || [])
      .filter((aluno) => {
        if (vinculadosTurmaEspecialIds.has(String(aluno.id))) return false;
        const nomeMatch = (aluno.nome || '').toLowerCase().includes(q);
        const mat = aluno.matricula != null ? String(aluno.matricula).trim() : '';
        const matMatch = mat && mat.toLowerCase().includes(q);
        return nomeMatch || matMatch;
      })
      .slice(0, 15);
  }, [linkExistingMode, nameSearchQuery, schoolStudentsPicker, vinculadosTurmaEspecialIds]);

  const turmaNomePorId = (turmaId) =>
    (classes || []).find((c) => String(c.id) === String(turmaId))?.nome || 'Turma';

  if (!showStudentModal) return null;

  if (linkExistingMode) {
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
        onClick={(e) =>
          handleBackdropClick(e, () => {
            setShowStudentModal(false);
            setEditingStudent(null);
            resetForm();
          })
        }
      >
        <div
          style={{
            background: 'white',
            padding: 30,
            borderRadius: 12,
            width: '90%',
            maxWidth: 560,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ marginBottom: 8, color: 'var(--primary)' }}>
            Adicionar aluno — {turmaDestino?.nome}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.9em', color: '#6b7280', lineHeight: 1.45 }}>
            Busque alunos já cadastrados na turma regular. O cadastro é único: ao abrir os detalhes,
            você verá sempre os dados da turma de escolarização.
          </p>
          <div className="input-group" style={{ position: 'relative', marginBottom: 20 }}>
            <label>Nome ou matrícula *</label>
            <input
              type="text"
              value={nameSearchQuery}
              onChange={(e) => setNameSearchQuery(e.target.value)}
              placeholder="Digite para buscar..."
              autoComplete="off"
              autoFocus
            />
            {nameSearchQuery.trim().length >= 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '0 0 6px 6px',
                  maxHeight: 280,
                  overflowY: 'auto',
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {schoolStudentsPickerLoading && (
                  <div style={{ padding: 10, fontSize: '0.85em', color: '#666' }}>
                    Buscando alunos...
                  </div>
                )}
                {!schoolStudentsPickerLoading &&
                  sugestoesAlunos.map((aluno) => (
                    <button
                      key={aluno.id}
                      type="button"
                      disabled={savingStudent}
                      onClick={() => onAddExistingStudent?.(aluno, studentFormData.turma_id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        border: 'none',
                        borderBottom: '1px solid #f0f0f0',
                        background: 'white',
                        cursor: savingStudent ? 'wait' : 'pointer',
                        fontSize: '0.9em',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eef4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#111' }}>{aluno.nome}</div>
                      <div style={{ color: '#666', fontSize: '0.85em', marginTop: 2 }}>
                        Turma regular: {turmaNomePorId(aluno.turma_id)}
                        {aluno.matricula ? ` • Matrícula: ${aluno.matricula}` : ''}
                      </div>
                    </button>
                  ))}
                {!schoolStudentsPickerLoading && sugestoesAlunos.length === 0 && (
                  <div style={{ padding: 10, fontSize: '0.85em', color: '#666' }}>
                    Nenhum aluno encontrado ou todos já estão nesta turma.
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowStudentModal(false);
                setEditingStudent(null);
                resetForm();
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
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      onClick={(e) =>
        handleBackdropClick(e, () => {
          setShowStudentModal(false);
          setEditingStudent(null);
          resetForm();
        })
      }
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
                {(classes || [])
                  .filter((turma) => !isTurmaEspecial?.(turma))
                  .map((turma) => (
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
                      const cidMatch = value.match(/CID:\s*([A-Z0-9.]+)/i);
                      let cid = '';
                      let deficiencia = value;

                      if (cidMatch) {
                        cid = cidMatch[1].trim();
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
                resetForm();
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
