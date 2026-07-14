import React, { useMemo } from 'react';
import EtiquetaGlossarioButton from './EtiquetaGlossario';
import { dismissOnboardingGuide } from '../utils/onboarding';

const OnboardingChecklist = ({
  classesCount,
  totalAlunos,
  sondagemDone,
  onGoToClasses,
  onGoToStudents,
  onDismiss,
}) => {
  const steps = useMemo(
    () => [
      {
        id: 'turmas',
        label: 'Conferir as turmas da escola',
        hint: 'Veja se todas as turmas do ano letivo estão cadastradas.',
        done: classesCount > 0,
        action: onGoToClasses,
        actionLabel: 'Ir para Turmas',
      },
      {
        id: 'aluno',
        label: 'Cadastrar pelo menos um aluno',
        hint: 'Escolha uma turma e adicione os estudantes.',
        done: totalAlunos > 0,
        action: onGoToClasses,
        actionLabel: classesCount > 0 ? 'Abrir Turmas' : 'Começar pelas Turmas',
      },
      {
        id: 'sondagem',
        label: 'Registrar uma sondagem de leitura/escrita',
        hint: 'Abra o aluno, vá em Sondagens e registre os níveis.',
        done: sondagemDone,
        action: totalAlunos > 0 ? onGoToStudents : onGoToClasses,
        actionLabel: totalAlunos > 0 ? 'Ver Alunos' : 'Cadastrar aluno antes',
      },
    ],
    [classesCount, totalAlunos, sondagemDone, onGoToClasses, onGoToStudents],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  const dismiss = () => {
    dismissOnboardingGuide();
    onDismiss?.();
  };

  return (
    <div className="onboarding-card">
      <div className="onboarding-card__header">
        <h3>Primeiros passos</h3>
        <span className="onboarding-card__progress">{doneCount}/{steps.length}</span>
      </div>
      <div className="onboarding-card__bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
        <div className="onboarding-card__bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#555' }}>
        {allDone
          ? 'Parabéns! Você concluiu o básico para usar o sistema no dia a dia.'
          : 'Siga a lista abaixo na ordem. Cada item fica marcado automaticamente quando você conclui.'}
      </p>
      <ol className="onboarding-checklist">
        {steps.map((step, index) => (
          <li key={step.id} className={step.done ? 'done' : ''}>
            <div className="onboarding-checklist__marker" aria-hidden="true">
              {step.done ? <i className="fas fa-check" /> : index + 1}
            </div>
            <div className="onboarding-checklist__body">
              <strong>{step.label}</strong>
              <p>{step.hint}</p>
              {!step.done && (
                <button type="button" className="btn-secondary onboarding-checklist__action" onClick={step.action}>
                  {step.actionLabel}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="onboarding-card__footer">
        <EtiquetaGlossarioButton compact />
        <div className="onboarding-card__actions">
          {allDone && (
            <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={dismiss}>
              Concluir guia
            </button>
          )}
          <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={dismiss}>
            Ocultar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChecklist;
