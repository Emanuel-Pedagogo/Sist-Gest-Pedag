import React from 'react';
import ModalShell from '../ModalShell';
import { ANOS_ESCOLARES_OPCOES, anoOptionToCanonical } from '../../utils/anosEscolares';

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
  const closeModal = () => {
    setShowTeacherModal(false);
    setEditingTeacher(null);
    setTeacherFormData({ nome: '', disciplina: '', turmas_ids: [], auth_email: '' });
  };

  return (
    <ModalShell
      open={showTeacherModal}
      disabled={savingTeacher}
      onClose={closeModal}
      maxWidth={650}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>{editingTeacher ? 'Editar Professor' : 'Novo Professor'}</h2>
      <form onSubmit={handleSaveTeacher}>
        <div className="modal-form-grid" style={{ marginBottom: 12 }}>
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

        <div className="input-group" style={{ marginTop: 12 }}>
          <label>E-mail de acesso (login do professor)</label>
          <input
            type="email"
            value={teacherFormData.auth_email || ''}
            onChange={(e) => setTeacherFormData({ ...teacherFormData, auth_email: e.target.value })}
            placeholder="mesmo e-mail usado no cadastro/login do professor"
            autoComplete="off"
          />
          <small style={{ display: 'block', marginTop: 6, color: '#666', lineHeight: 1.4 }}>
            O professor precisa de conta no SACP com este e-mail. No primeiro login, o sistema vincula o
            acesso às turmas selecionadas. Deixe em branco se o professor ainda não for usuário do app.
          </small>
          {editingTeacher?.user_id ? (
            <small style={{ display: 'block', marginTop: 4, color: '#28a745' }}>
              Conta vinculada (usuário Auth ativo).
            </small>
          ) : null}
        </div>

        <div className="input-group" style={{ marginTop: 12 }}>
          <label style={{ fontSize: '0.9em' }}>Turmas * (selecione um ou mais)</label>
          <div className="teacher-turmas-picker">
            {[
              ...ANOS_ESCOLARES_OPCOES,
            ].map((anoOption) => {
              const gradeCanonical = anoOptionToCanonical(anoOption);

              const turmasDaGrade = classesList.filter((t) => {
                if (!gradeCanonical) return false;
                // Match exato: "1º" != "1º EM"
                return getCanonicalGradesForTurma(t).includes(gradeCanonical);
              });
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
                  className={`teacher-turmas-picker__item${disabled ? ' is-disabled' : ''}`}
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
                  />
                  <span>{anoOption}</span>
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

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={closeModal} disabled={savingTeacher}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingTeacher}>
            {savingTeacher ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default TeacherModal;
