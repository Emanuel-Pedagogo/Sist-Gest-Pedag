import React from 'react';

const TeacherModal = ({
  showTeacherModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  setShowTeacherModal,
  setEditingTeacher,
  setTeacherFormData,
  editingTeacher,
  handleSaveTeacher,
  teacherFormData,
  classesList,
  getCanonicalGradesForTurma,
  savingTeacher,
}) => {
  if (!showTeacherModal) return null;

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
          if (!savingTeacher) {
            setShowTeacherModal(false);
            setEditingTeacher(null);
            setTeacherFormData({ nome: '', disciplina: '', turmas_ids: [] });
          }
        })
      }
    >
      <div
        style={{
          background: 'white',
          padding: 30,
          borderRadius: 12,
          width: '90%',
          maxWidth: 650,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>
          {editingTeacher ? 'Editar Professor' : 'Novo Professor'}
        </h2>
        <form onSubmit={handleSaveTeacher}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              alignItems: 'start',
            }}
          >
            <div className="input-group">
              <label>Nome *</label>
              <input
                type="text"
                required
                value={teacherFormData.nome}
                onChange={(e) => setTeacherFormData({ ...teacherFormData, nome: e.target.value })}
                placeholder="Nome completo do professor"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
              />
            </div>

            <div className="input-group">
              <label>Disciplina *</label>
              <input
                type="text"
                required
                value={teacherFormData.disciplina}
                onChange={(e) => setTeacherFormData({ ...teacherFormData, disciplina: e.target.value })}
                placeholder="Ex: Matemática"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
              />
            </div>
          </div>

          {/* Linha 2: Turmas (igual ao seletor de anos do modal de turma) */}
          <div className="input-group" style={{ marginTop: 12 }}>
            <label style={{ fontSize: '0.9em' }}>Turmas * (selecione um ou mais)</label>
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
                overflowX: 'auto',
              }}
            >
              {[
                'Pré I',
                'Pré II',
                '1º Ano',
                '2º Ano',
                '3º Ano',
                '4º Ano',
                '5º Ano',
                '6º Ano',
                '7º Ano',
                '8º Ano',
                '9º Ano',
              ].map((anoOption) => {
                const gradeCanonical =
                  anoOption === 'Pré I'
                    ? 'Pré I'
                    : anoOption === 'Pré II'
                      ? 'Pré II'
                      : `${parseInt(anoOption, 10)}º`;

                const turmasDaGrade = classesList.filter((t) =>
                  getCanonicalGradesForTurma(t).includes(gradeCanonical)
                );
                const idsGrade = turmasDaGrade.map((t) => t.id);
                const current = Array.isArray(teacherFormData.turmas_ids) ? teacherFormData.turmas_ids : [];
                const idGradeSet = new Set(idsGrade.map(String));
                const checked =
                  turmasDaGrade.length > 0 &&
                  turmasDaGrade.every((t) => current.some((id) => String(id) === String(t.id)));
                const disabled = turmasDaGrade.length === 0;

                return (
                  <label
                    key={anoOption}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      borderRadius: 4,
                      transition: 'background 0.2s',
                      fontSize: '0.75em',
                      flex: '1 1 0',
                      minWidth: 0,
                      opacity: disabled ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled) e.currentTarget.style.background = '#f0f0f0';
                    }}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    title={
                      disabled
                        ? 'Sem turmas cadastradas nesta série'
                        : turmasDaGrade.length === 1
                          ? turmasDaGrade[0].nome
                          : `${turmasDaGrade.length} turmas`
                    }
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={(e) => {
                        const cur = Array.isArray(teacherFormData.turmas_ids) ? teacherFormData.turmas_ids : [];
                        const next = e.target.checked
                          ? [...cur, ...idsGrade.filter((id) => !cur.some((c) => String(c) === String(id)))]
                          : cur.filter((c) => !idGradeSet.has(String(c)));
                        setTeacherFormData({ ...teacherFormData, turmas_ids: next });
                      }}
                      style={{
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        width: '14px',
                        height: '14px',
                        margin: 0,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ textAlign: 'center', lineHeight: '1.2' }}>{anoOption}</span>
                  </label>
                );
              })}
            </div>
            {classesList.length === 0 ? (
              <div style={{ color: 'gray', fontSize: '0.8em', marginTop: 6 }}>
                Nenhuma turma cadastrada para a escola/ano selecionados.
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowTeacherModal(false);
                setEditingTeacher(null);
                setTeacherFormData({ nome: '', disciplina: '', turmas_ids: [] });
              }}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingTeacher}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingTeacher}
            >
              {savingTeacher ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherModal;
