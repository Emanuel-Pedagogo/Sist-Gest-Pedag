import React, { useMemo, useState } from 'react';
import ModalShell from '../ModalShell';
import {
  getItensPadraoSelecionados,
  groupSemedItensPorTipo,
  persistSemedImport,
  SEMED_CALENDARIO_META,
} from '../../utils/semEdCalendarImport';
import { getSemedTipoLabel } from '../../utils/semEdCalendar2026Santarem';

const STEP_INTRO = 0;
const STEP_CHOOSE = 1;
const STEP_REVIEW = 2;
const STEP_DONE = 3;

const SemedCalendarImportWizard = ({
  open,
  onClose,
  supabase,
  escolaId,
  onSuccess,
  handleBackdropMouseDown,
  handleBackdropClick,
}) => {
  const [step, setStep] = useState(STEP_INTRO);
  const [itens, setItens] = useState(() => getItensPadraoSelecionados());
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const groups = useMemo(() => groupSemedItensPorTipo(itens), [itens]);
  const selectedCount = itens.filter((i) => i.selecionado).length;

  const reset = () => {
    setStep(STEP_INTRO);
    setItens(getItensPadraoSelecionados());
    setPdfFile(null);
    setError('');
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleItem = (id) => {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, selecionado: !i.selecionado } : i)));
  };

  const toggleGroup = (tipo, checked) => {
    setItens((prev) => prev.map((i) => (i.tipo === tipo ? { ...i, selecionado: checked } : i)));
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    const res = await persistSemedImport(supabase, { itens, pdfFile, escolaId });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(res);
    setStep(STEP_DONE);
    onSuccess?.(res);
  };

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      disabled={loading}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <div style={{ maxWidth: 600 }}>
      {step === STEP_INTRO && (
        <>
          <h2 style={{ marginTop: 0 }}>Configurar calendário da cidade</h2>
          <p style={{ color: '#555', lineHeight: 1.6 }}>
            Em poucos passos, o sistema coloca no calendário os <strong>feriados</strong>,{' '}
            <strong>férias</strong> e <strong>marcos do ano letivo</strong> da SEMED — sem misturar com o
            seu planejamento pessoal.
          </p>
          <ul style={{ color: '#444', paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Marcos oficiais em cor discreta (cinza/roxo)</li>
            <li>Seus compromissos você adiciona depois com &quot;Novo Evento&quot;</li>
            <li>O PDF oficial fica guardado para consulta</li>
          </ul>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Agora não
            </button>
            <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={() => setStep(STEP_CHOOSE)}>
              Começar
            </button>
          </div>
        </>
      )}

      {step === STEP_CHOOSE && (
        <>
          <h2 style={{ marginTop: 0 }}>Calendário SEMED 2026</h2>
          <p style={{ color: '#666', fontSize: '0.95em' }}>
            {SEMED_CALENDARIO_META.municipio}/{SEMED_CALENDARIO_META.uf} — {SEMED_CALENDARIO_META.rede}
          </p>
          <div
            style={{
              padding: 16,
              background: '#f0f7ff',
              borderRadius: 8,
              border: '1px solid #cce5ff',
              marginBottom: 16,
            }}
          >
            <strong>Opção recomendada:</strong> usar o calendário já preparado para Santarém 2026
            (baseado no PDF oficial).
          </div>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label>Anexar PDF oficial (opcional)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            {pdfFile && (
              <p style={{ margin: '8px 0 0', fontSize: '0.85em', color: '#666' }}>
                <i className="fas fa-file-pdf" /> {pdfFile.name}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button type="button" onClick={() => setStep(STEP_INTRO)}>
              Voltar
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto' }}
              onClick={() => setStep(STEP_REVIEW)}
            >
              Revisar o que será importado
            </button>
          </div>
        </>
      )}

      {step === STEP_REVIEW && (
        <>
          <h2 style={{ marginTop: 0 }}>O que entra no calendário?</h2>
          <p style={{ color: '#666', fontSize: '0.9em' }}>
            Desmarque o que não quiser. Semanas de avaliação e recomposição vêm{' '}
            <strong>desligadas</strong> para não poluir — ative só se precisar.
          </p>
          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
            {groups.map(({ tipo, itens: grupoItens }) => (
              <div key={tipo} style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={grupoItens.every((i) => i.selecionado)}
                    onChange={(e) => toggleGroup(tipo, e.target.checked)}
                  />
                  {getSemedTipoLabel(tipo)} ({grupoItens.length})
                </label>
                <ul style={{ listStyle: 'none', padding: '6px 0 0 24px', margin: 0 }}>
                  {grupoItens.map((item) => (
                    <li key={item.id} style={{ marginBottom: 4 }}>
                      <label style={{ display: 'flex', gap: 8, fontSize: '0.9em', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!item.selecionado}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span>
                          {item.titulo}
                          <span style={{ color: '#888', marginLeft: 6 }}>
                            {item.data_fim
                              ? `${item.data_inicio} → ${item.data_fim}`
                              : item.data_inicio}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ fontWeight: 600 }}>
            {selectedCount} item(ns) selecionado(s)
          </p>
          {error && <p style={{ color: '#c00' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button type="button" onClick={() => setStep(STEP_CHOOSE)} disabled={loading}>
              Voltar
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto' }}
              disabled={loading || selectedCount === 0}
              onClick={handleImport}
            >
              {loading ? 'Importando...' : 'Importar no calendário'}
            </button>
          </div>
        </>
      )}

      {step === STEP_DONE && (
        <>
          <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>
            <i className="fas fa-check-circle" /> Calendário configurado!
          </h2>
          <p style={{ lineHeight: 1.6 }}>
            Foram adicionados <strong>{result?.count ?? 0}</strong> marcos oficiais. Agora use{' '}
            <strong>Novo Evento</strong> para seu planejamento (reuniões, visitas, prazos).
          </p>
          <p style={{ fontSize: '0.9em', color: '#666' }}>
            Marcos SEMED aparecem em tons discretos. Você pode ocultá-los com o filtro &quot;Calendário
            SEMED&quot; na agenda.
          </p>
          <button type="button" className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={handleClose}>
            Ir para a agenda
          </button>
        </>
      )}
      </div>
    </ModalShell>
  );
};

export default SemedCalendarImportWizard;
