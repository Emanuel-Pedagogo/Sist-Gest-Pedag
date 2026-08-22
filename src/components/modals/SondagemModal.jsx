import React from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';
import { formatNivel } from '../../utils/sondagemNiveis';

const SondagemModal = ({
  showSondagemModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  handleCancelSondagemModal,
  editingSondagem,
  handleSaveSondagem,
  sondagemFormData,
  setSondagemFormData,
  getSondagemNivelSet,
  NIVEL_LEITURA_OPCOES_1_2,
  NIVEL_LEITURA_OPCOES_3_5,
  NIVEL_LEITURA_OPCOES_FUNDAMENTAL2,
  NIVEL_ESCRITA_OPCOES_1_2,
  NIVEL_ESCRITA_OPCOES_3_5,
  NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2,
  savingSondagem,
  showSondagemMidiaModal,
  sondagemMidiaUrl,
  setShowSondagemMidiaModal,
  sondagemMidiaTipo,
}) => {
  return (
    <>
      <ModalShell
        open={showSondagemModal}
        disabled={savingSondagem}
        onClose={handleCancelSondagemModal}
        maxWidth={480}
        panelClassName="modal-panel--flex"
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      >
        <h2 style={{ fontSize: 18 }}>{editingSondagem ? 'Editar sondagem' : 'Nova sondagem'}</h2>
        <form onSubmit={handleSaveSondagem} className="modal-form-flex">
          <div className="modal-form-scroll">
            <FormField label="Data" required style={{ marginBottom: 12 }} labelStyle={{ fontSize: 13 }}>
              <input
                type="date"
                required
                value={sondagemFormData.data}
                onChange={(e) =>
                  setSondagemFormData({ ...sondagemFormData, data: e.target.value })
                }
                style={{ padding: 8, fontSize: 13 }}
              />
            </FormField>
            <FormField label="Nível de leitura" required style={{ marginBottom: 12 }} labelStyle={{ fontSize: 13 }}>
              <select
                required
                value={sondagemFormData.nivel_leitura}
                onChange={(e) =>
                  setSondagemFormData({ ...sondagemFormData, nivel_leitura: e.target.value })
                }
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
              >
                <option value="">Selecione...</option>
                {(() => {
                  const nivelSet = getSondagemNivelSet();
                  const opcoes = nivelSet === '3-5' ? NIVEL_LEITURA_OPCOES_3_5 : nivelSet === '6-9' ? NIVEL_LEITURA_OPCOES_FUNDAMENTAL2 : NIVEL_LEITURA_OPCOES_1_2;
                  return opcoes.map((op) => (
                    <option key={op} value={op}>
                      {formatNivel(op)}
                    </option>
                  ));
                })()}
              </select>
            </FormField>
            <FormField label="Nível de escrita" required style={{ marginBottom: 12 }} labelStyle={{ fontSize: 13 }}>
              <select
                required
                value={sondagemFormData.nivel_escrita}
                onChange={(e) =>
                  setSondagemFormData({ ...sondagemFormData, nivel_escrita: e.target.value })
                }
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
              >
                <option value="">Selecione...</option>
                {(() => {
                  const nivelSet = getSondagemNivelSet();
                  const opcoes = nivelSet === '3-5' ? NIVEL_ESCRITA_OPCOES_3_5 : nivelSet === '6-9' ? NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 : NIVEL_ESCRITA_OPCOES_1_2;
                  return opcoes.map((op) => (
                    <option key={op} value={op}>
                      {formatNivel(op)}
                    </option>
                  ));
                })()}
              </select>
            </FormField>
            <FormField label="Observações (opcional)" style={{ marginBottom: 12 }} labelStyle={{ fontSize: 13 }}>
              <textarea
                value={sondagemFormData.observacoes || ''}
                onChange={(e) =>
                  setSondagemFormData({ ...sondagemFormData, observacoes: e.target.value })
                }
                placeholder="Anotações sobre a sondagem..."
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, resize: 'vertical' }}
              />
            </FormField>
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label htmlFor="sondagem-foto" style={{ fontSize: 13 }}>Foto da escrita (opcional)</label>
              {(sondagemFormData.foto_escrita_url || sondagemFormData.foto_file) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {sondagemFormData.foto_file
                      ? sondagemFormData.foto_file.name
                      : 'Foto anexada'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSondagemFormData({
                        ...sondagemFormData,
                        foto_escrita_url: '',
                        foto_file: null,
                      })
                    }
                    style={{
                      padding: '2px 8px',
                      fontSize: 11,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <input
                  id="sondagem-foto"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) =>
                    setSondagemFormData({
                      ...sondagemFormData,
                      foto_file: e.target.files?.[0] || null,
                    })
                  }
                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                />
              )}
            </div>
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label htmlFor="sondagem-audio" style={{ fontSize: 13 }}>Áudio da leitura (opcional)</label>
              {(sondagemFormData.audio_leitura_url || sondagemFormData.audio_file) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {sondagemFormData.audio_file
                      ? sondagemFormData.audio_file.name
                      : 'Áudio anexado'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSondagemFormData({
                        ...sondagemFormData,
                        audio_leitura_url: '',
                        audio_file: null,
                      })
                    }
                    style={{
                      padding: '2px 8px',
                      fontSize: 11,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <input
                  id="sondagem-audio"
                  type="file"
                  accept="audio/*"
                  capture
                  onChange={(e) =>
                    setSondagemFormData({
                      ...sondagemFormData,
                      audio_file: e.target.files?.[0] || null,
                    })
                  }
                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                />
              )}
            </div>
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label htmlFor="sondagem-arquivo" style={{ fontSize: 13 }}>Arquivo (PDF/Word) (opcional)</label>
              {(sondagemFormData.arquivo_url || sondagemFormData.arquivo_file) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {sondagemFormData.arquivo_file
                      ? sondagemFormData.arquivo_file.name
                      : 'Arquivo anexado'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSondagemFormData({
                        ...sondagemFormData,
                        arquivo_url: '',
                        arquivo_file: null,
                      })
                    }
                    style={{
                      padding: '2px 8px',
                      fontSize: 11,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <input
                  id="sondagem-arquivo"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) =>
                    setSondagemFormData({
                      ...sondagemFormData,
                      arquivo_file: e.target.files?.[0] || null,
                    })
                  }
                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                />
              )}
            </div>
          </div>
          <div className="modal-actions modal-actions--bordered">
            <button type="button" className="btn-secondary" onClick={handleCancelSondagemModal} disabled={savingSondagem}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingSondagem}>
              {savingSondagem ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={showSondagemMidiaModal && Boolean(sondagemMidiaUrl)}
        onClose={() => setShowSondagemMidiaModal(false)}
        maxWidth={900}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      >
        <div className="modal-actions" style={{ marginTop: 0, marginBottom: 10 }}>
          <button type="button" className="btn-secondary" onClick={() => setShowSondagemMidiaModal(false)}>
            Fechar
          </button>
        </div>
        {sondagemMidiaTipo === 'foto' ? (
          <img
            src={sondagemMidiaUrl}
            alt="Foto da escrita"
            style={{ maxWidth: '100%', maxHeight: '70dvh', display: 'block' }}
          />
        ) : (
          <audio controls src={sondagemMidiaUrl} style={{ minWidth: 280, width: '100%' }}>
            Seu navegador não suporta áudio.
          </audio>
        )}
      </ModalShell>
    </>
  );
};

export default SondagemModal;
