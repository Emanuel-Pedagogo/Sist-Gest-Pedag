import React, { memo } from 'react';
import EtiquetaIcon from './EtiquetaIcon';
import AlunoListSubtitle from './AlunoListSubtitle';
import { ETIQUETA_LABELS, getEtiquetaLabel } from '../utils/etiquetas';

const StudentListItem = memo(({
  aluno,
  classesList,
  canManageCadastro,
  getBadgeColorClass,
  selectStudent,
  handleEditStudent,
  handleDeleteStudent,
  selectedClassName,
}) => {
  const badgeClass = getBadgeColorClass(aluno.etiqueta_cor);
  const turmaAluno = classesList.find((c) => String(c.id) === String(aluno.turma_id));
  const turmaNome = turmaAluno?.nome || 'Turma não informada';
  const professorNome = turmaAluno?.professor_regente;

  return (
    <div
      key={aluno.id}
      className="list-item"
      style={{
        borderLeft: aluno.etiqueta_cor === 'roxo' ? '4px solid #9c27b0' : undefined,
        paddingLeft: aluno.etiqueta_cor === 'roxo' ? '12px' : undefined,
      }}
    >
      <button
        type="button"
        className="btn-unstyled"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
        onClick={() => selectStudent(aluno)}
      >
        <EtiquetaIcon cor={aluno.etiqueta_cor} />
        <div>
          <strong>{aluno.nome}</strong>
          <AlunoListSubtitle
            aluno={aluno}
            showTurma={!selectedClassName}
            turmaNome={turmaNome}
            professorNome={professorNome}
          />
        </div>
      </button>
      <div className="list-item-actions">
        <span className={`badge ${badgeClass}`}>
          {getEtiquetaLabel(aluno.etiqueta_cor)}
        </span>
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--accent"
            onClick={(e) => { e.stopPropagation(); handleEditStudent(aluno); }}
            aria-label={`Editar ${aluno.nome}`}
          >
            <i className="fas fa-edit" />
          </button>
        )}
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            onClick={(e) => { e.stopPropagation(); handleDeleteStudent(aluno.id); }}
            aria-label={`Excluir ${aluno.nome}`}
          >
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.aluno.id === nextProps.aluno.id &&
    prevProps.aluno.etiqueta_cor === nextProps.aluno.etiqueta_cor &&
    prevProps.aluno.nome === nextProps.aluno.nome &&
    prevProps.canManageCadastro === nextProps.canManageCadastro &&
    prevProps.selectedClassName === nextProps.selectedClassName
  );
});

StudentListItem.displayName = 'StudentListItem';

export default StudentListItem;
