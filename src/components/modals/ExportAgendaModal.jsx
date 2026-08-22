import React, { useState } from 'react';
import ModalShell from '../ModalShell';
import { ETIQUETA_CORES, ALL_ETIQUETA_IDS } from '../../utils/agendaConstants';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ExportAgendaModal = ({
  open,
  onClose,
  onExportPDF,
  onExportWord,
  exporting,
  periodLabel,
  anoLetivo,
  showSemedMarcos = false,
  setShowSemedMarcos,
  hasSemedImport = false,
  handleBackdropMouseDown,
  handleBackdropClick,
}) => {
  const [selectedIds, setSelectedIds] = useState([...ALL_ETIQUETA_IDS]);
  // 'visivel' = período que está na tela | 'meses' = escolher meses do ano
  const [modoPeriodo, setModoPeriodo] = useState('visivel');
  const anoBase = Number(anoLetivo) || new Date().getFullYear();
  const [ano, setAno] = useState(anoBase);
  const [mesesSelecionados, setMesesSelecionados] = useState([]);

  const toggleCategory = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = selectedIds.length === ALL_ETIQUETA_IDS.length;
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : [...ALL_ETIQUETA_IDS]);
  };

  const toggleMes = (indice) => {
    setMesesSelecionados((prev) =>
      prev.includes(indice) ? prev.filter((m) => m !== indice) : [...prev, indice].sort((a, b) => a - b)
    );
  };

  const porMeses = modoPeriodo === 'meses';
  const mesesParaExportar = porMeses
    ? mesesSelecionados.map((mes) => ({ ano, mes }))
    : null;

  const periodoValido = !porMeses || mesesSelecionados.length > 0;
  const canExport = selectedIds.length > 0 && periodoValido && !exporting;
  // O Word é gerado sempre para o período visível; vários meses só em PDF.
  const canExportWord = selectedIds.length > 0 && !porMeses && !exporting;

  const handleClose = () => {
    setSelectedIds([...ALL_ETIQUETA_IDS]);
    setModoPeriodo('visivel');
    setMesesSelecionados([]);
    setAno(anoBase);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      disabled={exporting}
      maxWidth={480}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2 style={{ marginTop: 0 }}>Exportar planejamento</h2>

      <span style={{ fontSize: '0.85em', fontWeight: 600, color: '#444' }}>Período</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 14px' }}>
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 8, fontSize: '0.88em',
            border: !porMeses ? '2px solid var(--primary)' : '1px solid #ddd',
            background: !porMeses ? '#f0f7ff' : '#fafafa',
            cursor: exporting ? 'default' : 'pointer',
          }}
        >
          <input
            type="radio"
            name="modo-periodo"
            checked={!porMeses}
            disabled={exporting}
            onChange={() => setModoPeriodo('visivel')}
          />
          <span>
            Período que está na tela
            <span style={{ display: 'block', fontSize: '0.85em', color: '#666', marginTop: 2 }}>
              {periodLabel}
            </span>
          </span>
        </label>

        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 8, fontSize: '0.88em',
            border: porMeses ? '2px solid var(--primary)' : '1px solid #ddd',
            background: porMeses ? '#f0f7ff' : '#fafafa',
            cursor: exporting ? 'default' : 'pointer',
          }}
        >
          <input
            type="radio"
            name="modo-periodo"
            checked={porMeses}
            disabled={exporting}
            onChange={() => setModoPeriodo('meses')}
          />
          <span>
            Escolher vários meses
            <span style={{ display: 'block', fontSize: '0.85em', color: '#666', marginTop: 2 }}>
              Cada mês sai numa página do PDF
            </span>
          </span>
        </label>
      </div>

      {porMeses && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <label style={{ fontSize: '0.85em', color: '#444', display: 'flex', alignItems: 'center', gap: 6 }}>
              Ano
              <select
                value={ano}
                disabled={exporting}
                onChange={(e) => setAno(Number(e.target.value))}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd' }}
              >
                {[anoBase - 1, anoBase, anoBase + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={exporting}
              onClick={() =>
                setMesesSelecionados(
                  mesesSelecionados.length === 12 ? [] : MESES.map((_, i) => i),
                )
              }
              style={{
                border: 'none', background: 'none', color: 'var(--primary)',
                cursor: exporting ? 'default' : 'pointer', fontSize: '0.8em', padding: 0,
              }}
            >
              {mesesSelecionados.length === 12 ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
            {MESES.map((nome, indice) => {
              const marcado = mesesSelecionados.includes(indice);
              return (
                <label
                  key={nome}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                    borderRadius: 8, fontSize: '0.82em',
                    border: marcado ? '2px solid var(--primary)' : '1px solid #ddd',
                    background: marcado ? '#f0f7ff' : '#fafafa',
                    cursor: exporting ? 'default' : 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={exporting}
                    onChange={() => toggleMes(indice)}
                  />
                  {nome}
                </label>
              );
            })}
          </div>

          {mesesSelecionados.length === 0 && (
            <p style={{ margin: '8px 0 0', fontSize: '0.8em', color: '#b45309' }}>
              Marque pelo menos um mês.
            </p>
          )}
        </div>
      )}

      <p style={{ margin: '0 0 10px', fontSize: '0.85em', color: '#555' }}>
        Selecione os tipos de evento que deseja incluir na exportação:
      </p>

      {hasSemedImport && setShowSemedMarcos && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 8,
            border: showSemedMarcos ? '2px solid #c4b5fd' : '1px solid #ddd',
            background: showSemedMarcos ? '#f5f3ff' : '#fafafa',
            cursor: exporting ? 'default' : 'pointer',
            fontSize: '0.9em',
          }}
        >
          <input
            type="checkbox"
            checked={showSemedMarcos}
            disabled={exporting}
            onChange={(e) => setShowSemedMarcos(e.target.checked)}
          />
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#9ca3af',
              flexShrink: 0,
            }}
          />
          <span>
            <strong>Incluir calendário SEMED</strong>
            <span style={{ display: 'block', fontSize: '0.85em', color: '#666', marginTop: 2 }}>
              Feriados e marcos oficiais (mesmo filtro da agenda)
            </span>
          </span>
        </label>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: '0.85em', fontWeight: 600, color: '#444' }}>Categorias</span>
        <button
          type="button"
          onClick={toggleAll}
          disabled={exporting}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--primary)',
            cursor: exporting ? 'default' : 'pointer',
            fontSize: '0.8em',
            padding: 0,
          }}
        >
          {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {ETIQUETA_CORES.map((cat) => {
          const checked = selectedIds.includes(cat.id);
          return (
            <label
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                border: checked ? '2px solid var(--primary)' : '1px solid #ddd',
                background: checked ? '#f0f7ff' : '#fafafa',
                cursor: exporting ? 'default' : 'pointer',
                fontSize: '0.85em',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={exporting}
                onChange={() => toggleCategory(cat.id)}
              />
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              {cat.label}
            </label>
          );
        })}
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '0.8em', color: '#888' }}>
        O arquivo será gerado em formato de calendário (paisagem), com cores, título, observação e
        legenda.
        {porMeses && ' Vários meses estão disponíveis apenas em PDF.'}
      </p>

      <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="button"
          onClick={handleClose}
          disabled={exporting}
          style={{
            padding: '10px 20px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: 'white',
            cursor: exporting ? 'default' : 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onExportWord(selectedIds)}
          disabled={!canExportWord}
          title={porMeses ? 'Vários meses só em PDF' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: 'white',
            cursor: canExportWord ? 'pointer' : 'not-allowed',
            opacity: canExportWord ? 1 : 0.6,
          }}
        >
          <i className="fas fa-file-word" style={{ color: '#2b579a' }} />
          Word
        </button>
        <button
          type="button"
          onClick={() => onExportPDF(selectedIds, mesesParaExportar)}
          disabled={!canExport}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'auto',
            padding: '10px 16px',
            opacity: canExport ? 1 : 0.6,
            cursor: canExport ? 'pointer' : 'not-allowed',
          }}
        >
          <i className="fas fa-file-pdf" />
          {exporting ? 'Exportando...' : 'PDF'}
        </button>
      </div>
    </ModalShell>
  );
};

export default ExportAgendaModal;
