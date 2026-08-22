import React from 'react';

/**
 * Painel de alertas do professor: mostra, na tela inicial, quem precisa de
 * atenção agora (faltas, nota baixa, sem sondagem). Cada nome leva direto
 * para a ficha do aluno.
 */
const AlertasTurmaPanel = ({ alertas, loading = false, onAbrirAluno }) => {
  const grupos = [
    {
      id: 'faltosos',
      titulo: 'Faltando muito',
      hint: 'Frequência abaixo de 85%',
      icone: 'fa-user-clock',
      cor: '#b45309',
      fundo: '#fffbeb',
      alunos: alertas?.faltosos || [],
    },
    {
      id: 'notaBaixa',
      titulo: 'Nota abaixo de 5',
      hint: 'Tem ao menos uma nota abaixo da média',
      icone: 'fa-triangle-exclamation',
      cor: '#b91c1c',
      fundo: '#fef2f2',
      alunos: alertas?.notaBaixa || [],
    },
    {
      id: 'semSondagem',
      titulo: 'Sem sondagem',
      hint: 'Nenhuma avaliação de leitura/escrita registrada',
      icone: 'fa-clipboard-question',
      cor: '#1d4ed8',
      fundo: '#eff6ff',
      alunos: alertas?.semSondagem || [],
    },
  ];

  const totalAlertas = grupos.reduce((acc, g) => acc + g.alunos.length, 0);

  if (loading) {
    return (
      <div className="onboarding-card">
        <div className="onboarding-card__header">
          <h3>Precisa da sua atenção</h3>
        </div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Conferindo sua turma...</p>
      </div>
    );
  }

  return (
    <div className="onboarding-card">
      <div className="onboarding-card__header">
        <h3>Precisa da sua atenção</h3>
        <span className="onboarding-card__progress">{totalAlertas}</span>
      </div>

      {totalAlertas === 0 ? (
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#15803d' }}>
          <i className="fas fa-circle-check" style={{ marginRight: 6 }} />
          Nenhum alerta no momento — sua turma está em dia.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {grupos
            .filter((g) => g.alunos.length > 0)
            .map((grupo) => (
              <div
                key={grupo.id}
                style={{
                  background: grupo.fundo,
                  borderRadius: 8,
                  padding: '10px 12px',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <i className={`fas ${grupo.icone}`} style={{ color: grupo.cor }} aria-hidden="true" />
                  <strong style={{ color: grupo.cor, fontSize: '0.92rem' }}>
                    {grupo.titulo} ({grupo.alunos.length})
                  </strong>
                </div>
                <p style={{ margin: '0 0 8px 22px', fontSize: '0.78rem', color: '#6b7280' }}>{grupo.hint}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 22 }}>
                  {grupo.alunos.map((aluno) => (
                    <button
                      key={aluno.id}
                      type="button"
                      onClick={() => onAbrirAluno?.(aluno.id)}
                      style={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: 'white',
                        borderRadius: 999,
                        padding: '4px 12px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      {aluno.nome}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AlertasTurmaPanel;
