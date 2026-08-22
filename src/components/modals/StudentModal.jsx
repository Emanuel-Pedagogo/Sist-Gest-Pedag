import React, { useEffect, useMemo, useState } from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';

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

  const closeModal = () => {
    setShowStudentModal(false);
    setEditingStudent(null);
    resetForm();
  };

  if (linkExistingMode) {
    return (
      <ModalShell
        open={showStudentModal}
        disabled={savingStudent}
        onClose={closeModal}
        maxWidth={560}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      >
          <h2 style={{ marginBottom: 8 }}>
            Adicionar aluno — {turmaDestino?.nome}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.9em', color: '#6b7280', lineHeight: 1.45 }}>
            Busque alunos já cadastrados na turma regular. O cadastro é único: ao abrir os detalhes,
            você verá sempre os dados da turma de escolarização.
          </p>
          <div className="input-group" style={{ position: 'relative', marginBottom: 20 }}>
            <label htmlFor="aluno-vincular-busca">Nome ou matrícula *</label>
            <input
              id="aluno-vincular-busca"
              type="text"
              value={nameSearchQuery}
              onChange={(e) => setNameSearchQuery(e.target.value)}
              placeholder="Digite para buscar..."
              autoComplete="off"
              autoFocus
            />
            {nameSearchQuery.trim().length >= 2 && (
              <div className="modal-autocomplete-dropdown">
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
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={savingStudent}>
              Fechar
            </button>
          </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open={showStudentModal}
      disabled={savingStudent}
      onClose={closeModal}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
        <h2>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h2>
        <form onSubmit={handleSaveStudent}>
          <div className="modal-form-grid">
            <FormField label="Nome" required>
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
            </FormField>

            <FormField label="Data de Nascimento" required>
              <input
                type="date"
                required
                value={studentFormData.data_nascimento}
                onChange={(e) =>
                  setStudentFormData({ ...studentFormData, data_nascimento: e.target.value })
                }
              />
            </FormField>

            <FormField label="Turma" required>
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
            </FormField>

            <FormField label="Matrícula">
              <input
                type="text"
                value={studentFormData.matricula}
                onChange={(e) => setStudentFormData({ ...studentFormData, matricula: e.target.value })}
                placeholder="Número da matrícula (opcional)"
              />
            </FormField>

            <FormField label="Nome do Responsável">
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
            </FormField>

            <FormField label="Contato">
              <input
                type="text"
                value={studentFormData.contato}
                onChange={(e) => setStudentFormData({ ...studentFormData, contato: e.target.value })}
                placeholder="Telefone ou email (opcional)"
              />
            </FormField>

            <FormField label="Etiqueta" required>
              <select
                required
                value={studentFormData.etiqueta_cor}
                onChange={(e) =>
                  setStudentFormData({ ...studentFormData, etiqueta_cor: e.target.value })
                }
              >
                <option value="azul">Adequado</option>
                <option value="verde">Avançado</option>
                <option value="amarelo">Atenção</option>
                <option value="vermelho">Risco</option>
                <option value="roxo">AEE</option>
              </select>
            </FormField>

            {studentFormData.etiqueta_cor === 'roxo' ? (
              <FormField label="Deficiência/Condição/CID">
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
                />
              </FormField>
            ) : (
              <FormField label="Motivo">
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
                />
              </FormField>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={savingStudent}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingStudent}>
              {savingStudent ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
    </ModalShell>
  );
};

export default StudentModal;
