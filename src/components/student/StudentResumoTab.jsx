import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { generateResumoPedagogico } from '../../services/geminiApi';
import { ETIQUETA_COLORS, getEtiquetaLabel } from '../../utils/etiquetas';

const ETIQUETA_INFO = Object.fromEntries(
  ['vermelho', 'amarelo', 'verde', 'roxo', 'azul'].map((cor) => [
    cor,
    {
      label: getEtiquetaLabel(cor),
      emoji: cor === 'vermelho' ? '🔴' : cor === 'amarelo' ? '🟡' : cor === 'verde' ? '🟢' : cor === 'roxo' ? '🟣' : '🔵',
      cor: ETIQUETA_COLORS[cor],
    },
  ]),
);

function formatDataBr(iso) {
  if (!iso) return null;
  const parte = String(iso).split('T')[0];
  const [y, m, d] = parte.split('-');
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

function calcularIdade(iso) {
  if (!iso) return null;
  const nasc = new Date(String(iso).split('T')[0]);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade -= 1;
  return idade >= 0 ? idade : null;
}

const sectionStyle = {
  background: 'white',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
};

const StudentResumoTab = ({
  selectedStudent,
  turmaNome,
  occurrences,
  occurrencesLoading,
  occurrencesError,
  sondagens,
  sondagensLoading,
  formatDate,
  switchTab,
}) => {
  const [boletimStats, setBoletimStats] = useState(null);
  const [boletimStatsLoading, setBoletimStatsLoading] = useState(false);
  const [resumoIa, setResumoIa] = useState('');
  const [resumoIaLoading, setResumoIaLoading] = useState(false);
  const [resumoIaError, setResumoIaError] = useState('');

  const etiquetaInfo = ETIQUETA_INFO[selectedStudent?.etiqueta_cor] || ETIQUETA_INFO.azul;

  const ultimaSondagem = useMemo(() => {
    if (!sondagens?.length) return null;
    return [...sondagens].sort((a, b) => new Date(b.data) - new Date(a.data))[0];
  }, [sondagens]);

  const ocorrenciasRecentes = useMemo(() => {
    if (!occurrences?.length) return [];
    return [...occurrences]
      .sort((a, b) => new Date(b.data_ocorrencia || 0) - new Date(a.data_ocorrencia || 0))
      .slice(0, 3);
  }, [occurrences]);

  const nivelLeituraExibicao =
    ultimaSondagem?.nivel_leitura || selectedStudent?.nivel_leitura || 'Não informado';
  const nivelEscritaExibicao = ultimaSondagem?.nivel_escrita || 'Não informado';

  useEffect(() => {
    if (!selectedStudent?.id) return undefined;
    let cancelled = false;
    (async () => {
      setBoletimStatsLoading(true);
      const { data, error } = await supabase
        .from('notas_boletim')
        .select('disciplina, nota')
        .eq('aluno_id', selectedStudent.id);
      if (cancelled) return;
      if (error || !data?.length) {
        setBoletimStats(null);
      } else {
        const notas = data
          .filter((r) => r.disciplina !== 'Faltas do Bimestre' && r.nota != null && r.nota !== '')
          .map((r) => Number(r.nota))
          .filter((n) => !Number.isNaN(n));
        const media =
          notas.length > 0
            ? (notas.reduce((acc, n) => acc + n, 0) / notas.length).toFixed(1)
            : null;
        const disciplinasAbaixo5 = [
          ...new Set(
            data
              .filter(
                (r) =>
                  r.disciplina !== 'Faltas do Bimestre' &&
                  r.nota != null &&
                  r.nota !== '' &&
                  Number(r.nota) < 5,
              )
              .map((r) => r.disciplina),
          ),
        ];
        setBoletimStats({
          qtdNotas: notas.length,
          media,
          abaixo5: notas.filter((n) => n < 5).length,
          disciplinasAbaixo5,
        });
      }
      setBoletimStatsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id]);

  const dataNascBr = formatDataBr(selectedStudent?.data_nascimento);
  const idade = calcularIdade(selectedStudent?.data_nascimento);
  const dataNascExibicao = dataNascBr
    ? idade != null
      ? `${dataNascBr} (${idade} anos)`
      : dataNascBr
    : 'Não informada';

  const historicoSondagens = useMemo(() => {
    if (!sondagens?.length) return [];
    return [...sondagens]
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 5)
      .map((s) => {
        const d = s.data ? formatDate(s.data) : '?';
        return `${d}: leitura ${s.nivel_leitura || '—'}, escrita ${s.nivel_escrita || '—'}`;
      });
  }, [sondagens, formatDate]);

  const gerarResumoIa = async () => {
    if (!selectedStudent?.id) return;
    setResumoIaLoading(true);
    setResumoIaError('');
    try {
      const ocorrenciasResumo = (occurrences || [])
        .slice(0, 5)
        .map((o) => `${o.tipo || '—'}: ${o.titulo || ''} (${o.data_ocorrencia || ''})`);

      const payload = {
        alunoNome: selectedStudent.nome,
        turmaNome,
        matricula: selectedStudent.matricula,
        etiquetaCor: selectedStudent.etiqueta_cor,
        frequencia: selectedStudent.frequencia,
        nivelLeitura: nivelLeituraExibicao,
        nivelEscrita: nivelEscritaExibicao,
        mediaBoletim: boletimStats?.media ?? null,
        disciplinasAbaixo5: boletimStats?.disciplinasAbaixo5 || [],
        ocorrenciasResumo,
        historicoSondagens,
      };

      const data = await generateResumoPedagogico(payload);
      setResumoIa(data?.resumo || 'Resumo não gerado.');
    } catch (err) {
      setResumoIaError(err?.message || 'Erro ao gerar resumo.');
    } finally {
      setResumoIaLoading(false);
    }
  };

  const atalhos = [
    { id: 'boletim', label: 'Boletim', icon: 'fa-graduation-cap' },
    { id: 'ocorrencias', label: 'Ocorrências', icon: 'fa-exclamation-circle' },
    { id: 'sondagem', label: 'Sondagens', icon: 'fa-chart-line' },
    { id: 'evidencias', label: 'Evidências', icon: 'fa-paperclip' },
    ...(selectedStudent?.etiqueta_cor === 'roxo'
      ? [{ id: 'aee', label: 'AEE', icon: 'fa-wheelchair' }]
      : []),
  ];

  return (
    <>
      <p style={{ margin: '0 0 20px', color: 'var(--text-light)', fontSize: '0.95em' }}>
        Visão geral do aluno. Use os atalhos ao final para abrir boletim, ocorrências e demais registros.
      </p>

      <section style={{ ...sectionStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.05em', color: '#5b21b6' }}>
            <i className="fas fa-magic" style={{ marginRight: 8 }} />
            Resumo pedagógico (IA)
          </h3>
          <button
            type="button"
            onClick={gerarResumoIa}
            disabled={resumoIaLoading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              background: '#7c3aed',
              color: 'white',
              fontWeight: 600,
              cursor: resumoIaLoading ? 'wait' : 'pointer',
              fontSize: 13,
            }}
          >
            {resumoIaLoading ? 'Gerando…' : resumoIa ? 'Atualizar resumo' : 'Gerar resumo'}
          </button>
        </div>
        {resumoIaError && <p style={{ color: '#b91c1c', fontSize: 14 }}>{resumoIaError}</p>}
        {resumoIa ? (
          <div style={{ fontSize: '0.95em', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {resumoIa}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-light)', fontSize: 14 }}>
            Gera um texto objetivo com base em boletim, sondagens, ocorrências e etiqueta. Revise antes de usar em
            documentos oficiais.
          </p>
        )}
      </section>

      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <h4>Frequência escolar</h4>
          <div
            className="number"
            style={{
              color:
                selectedStudent?.frequencia != null && selectedStudent.frequencia < 85
                  ? 'var(--danger)'
                  : 'var(--primary)',
            }}
          >
            {selectedStudent?.frequencia != null ? `${selectedStudent.frequencia}%` : 'N/D'}
          </div>
          <small>
            {selectedStudent?.frequencia != null && selectedStudent.frequencia < 85
              ? 'Abaixo da meta de 85%'
              : 'Meta: 85%'}
            {' — '}
            Turma de escolarização; não inclui turmas especiais voluntárias (ex.: Libras).
          </small>
        </div>
        <div className="card">
          <h4>Ocorrências</h4>
          <div className="number" style={{ color: occurrences.length > 0 ? 'var(--warning)' : 'var(--primary)' }}>
            {occurrencesLoading ? '…' : occurrences.length}
          </div>
          <small>{occurrences.length === 1 ? 'registro' : 'registros'}</small>
        </div>
        <div className="card">
          <h4>Sondagens</h4>
          <div className="number" style={{ color: 'var(--primary)' }}>
            {sondagensLoading ? '…' : sondagens.length}
          </div>
          <small>avaliações de leitura/escrita</small>
        </div>
        <div className="card">
          <h4>Boletim</h4>
          <div className="number" style={{ fontSize: '1.6em', color: 'var(--primary)' }}>
            {boletimStatsLoading ? '…' : boletimStats?.media ?? '—'}
          </div>
          <small>
            {boletimStatsLoading
              ? 'Calculando média…'
              : boletimStats?.qtdNotas
              ? `média em ${boletimStats.qtdNotas} nota${boletimStats.qtdNotas > 1 ? 's' : ''}`
              : 'sem notas lançadas'}
          </small>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <section style={sectionStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05em', color: 'var(--primary)' }}>
            <i className="fas fa-id-card" style={{ marginRight: 8 }} />
            Dados do aluno
          </h3>
          <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
            {[
              ['Data de nascimento', dataNascExibicao],
              ['Matrícula', selectedStudent?.matricula || '—'],
              ['Turma', turmaNome || 'Não informada'],
              ['Responsável', selectedStudent?.nome_responsavel || '—'],
              ['Contato', selectedStudent?.contato || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-light)', fontWeight: 600 }}>
                  {label}
                </dt>
                <dd style={{ margin: '4px 0 0', fontSize: '0.95em' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section style={sectionStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05em', color: 'var(--primary)' }}>
            <i className="fas fa-chart-line" style={{ marginRight: 8 }} />
            Situação pedagógica
          </h3>
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: `${etiquetaInfo.cor}14`,
              borderLeft: `4px solid ${etiquetaInfo.cor}`,
              marginBottom: 16,
            }}
          >
            <strong style={{ color: etiquetaInfo.cor }}>
              {etiquetaInfo.emoji} {etiquetaInfo.label}
            </strong>
            {(selectedStudent?.motivo_etiqueta ||
              (selectedStudent?.etiqueta_cor === 'roxo' && selectedStudent?.aee_deficiencia)) && (
              <p style={{ margin: '8px 0 0', fontSize: '0.9em', color: 'var(--text)' }}>
                {selectedStudent.etiqueta_cor === 'roxo'
                  ? [
                      selectedStudent.aee_deficiencia,
                      selectedStudent.aee_cid ? `CID: ${selectedStudent.aee_cid}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')
                  : selectedStudent.motivo_etiqueta}
              </p>
            )}
          </div>
          <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
            <div>
              <dt style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-light)', fontWeight: 600 }}>
                Nível de leitura
              </dt>
              <dd style={{ margin: '4px 0 0', fontSize: '0.9em', lineHeight: 1.4 }}>{nivelLeituraExibicao}</dd>
            </div>
            <div>
              <dt style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-light)', fontWeight: 600 }}>
                Nível de escrita
              </dt>
              <dd style={{ margin: '4px 0 0', fontSize: '0.9em', lineHeight: 1.4 }}>{nivelEscritaExibicao}</dd>
            </div>
            {ultimaSondagem && (
              <div>
                <dt style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-light)', fontWeight: 600 }}>
                  Última sondagem
                </dt>
                <dd style={{ margin: '4px 0 0', fontSize: '0.9em' }}>
                  {ultimaSondagem.data ? formatDate(ultimaSondagem.data) : '—'}
                </dd>
              </div>
            )}
            {boletimStats && boletimStats.abaixo5 > 0 && (
              <div>
                <dt style={{ margin: 0, fontSize: '0.8em', color: 'var(--danger)', fontWeight: 600 }}>
                  Alerta no boletim
                </dt>
                <dd style={{ margin: '4px 0 0', fontSize: '0.9em', color: 'var(--danger)' }}>
                  {boletimStats.abaixo5} nota{boletimStats.abaixo5 > 1 ? 's' : ''} abaixo de 5,0
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {selectedStudent?.etiqueta_cor === 'roxo' && (
        <section
          style={{
            background: '#f3e5f5',
            border: '1px solid #9c27b0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 10px', fontSize: '1em', color: '#9c27b0' }}>
            <i className="fas fa-wheelchair" style={{ marginRight: 8 }} />
            Atendimento Educacional Especializado
          </h3>
          <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text)' }}>
            {[
              selectedStudent.aee_mediadora && `Mediadora: ${selectedStudent.aee_mediadora}`,
              selectedStudent.aee_plano_individual && 'Plano individual registrado',
              selectedStudent.aee_tem_laudo && 'Laudo anexado',
            ]
              .filter(Boolean)
              .join(' • ') || 'Consulte a aba AEE para documentos e detalhes.'}
          </p>
        </section>
      )}

      <section style={{ ...sectionStyle, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05em', color: 'var(--primary)' }}>
            <i className="fas fa-clipboard-list" style={{ marginRight: 8 }} />
            Ocorrências recentes
          </h3>
          {occurrences.length > 0 && (
            <button
              type="button"
              onClick={() => switchTab('ocorrencias')}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--primary)',
                borderRadius: 6,
                background: 'white',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Ver todas
            </button>
          )}
        </div>
        {occurrencesLoading && (
          <p style={{ margin: 0, color: 'var(--text-light)' }}>Carregando ocorrências…</p>
        )}
        {occurrencesError && <p style={{ margin: 0, color: 'var(--danger)' }}>{occurrencesError}</p>}
        {!occurrencesLoading && !occurrencesError && ocorrenciasRecentes.length === 0 && (
          <p style={{ margin: 0, color: 'var(--text-light)', fontStyle: 'italic' }}>
            Nenhuma ocorrência registrada.
          </p>
        )}
        {!occurrencesLoading && !occurrencesError && ocorrenciasRecentes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ocorrenciasRecentes.map((oc) => (
              <div
                key={oc.id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #eee',
                  background: '#fafafa',
                }}
              >
                <strong style={{ color: 'var(--primary)' }}>{oc.titulo || 'Sem título'}</strong>
                <div style={{ fontSize: '0.85em', color: 'var(--text-light)', marginTop: 4 }}>
                  {oc.data_ocorrencia
                    ? (() => {
                        const [y, m, day] = oc.data_ocorrencia.split('-');
                        return `${day}/${m}/${y}`;
                      })()
                    : 'Data não informada'}
                  {oc.tipo ? ` • ${oc.tipo}` : ''}
                </div>
                {oc.descricao && (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: '0.9em',
                      color: 'var(--text)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {oc.descricao}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {atalhos.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchTab(item.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.9em',
              color: 'var(--text)',
            }}
          >
            <i className={`fas ${item.icon}`} style={{ color: 'var(--primary)' }} />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default StudentResumoTab;
