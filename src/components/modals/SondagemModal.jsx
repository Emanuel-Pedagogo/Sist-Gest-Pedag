import React from 'react';

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
  if (!showSondagemModal && !showSondagemMidiaModal) return null;

  return (
    <>
      {showSondagemModal && (
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
          onClick={(e) => handleBackdropClick(e, handleCancelSondagemModal)}
        >
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 12,
              width: '90%',
              maxWidth: 480,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 15, color: 'var(--primary)', fontSize: 18 }}>
              {editingSondagem ? 'Editar sondagem' : 'Nova sondagem'}
            </h2>
            <form onSubmit={handleSaveSondagem} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 5 }}>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13 }}>Data *</label>
                  <input
                    type="date"
                    required
                    value={sondagemFormData.data}
                    onChange={(e) =>
                      setSondagemFormData({ ...sondagemFormData, data: e.target.value })
                    }
                    style={{ padding: 8, fontSize: 13 }}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13 }}>Nível de leitura *</label>
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
                          {op}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13 }}>Nível de escrita *</label>
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
                          {op}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13 }}>Observações (opcional)</label>
                  <textarea
                    value={sondagemFormData.observacoes || ''}
                    onChange={(e) =>
                      setSondagemFormData({ ...sondagemFormData, observacoes: e.target.value })
                    }
                    placeholder="Anotações sobre a sondagem..."
                    rows={3}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, resize: 'vertical' }}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13 }}>Foto da escrita (opcional)</label>
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
                  <label style={{ fontSize: 13 }}>Áudio da leitura (opcional)</label>
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
                  <label style={{ fontSize: 13 }}>Arquivo (PDF/Word) (opcional)</label>
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
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                <button
                  type="button"
                  onClick={handleCancelSondagemModal}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 13,
                  }}
                  disabled={savingSondagem}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
                  disabled={savingSondagem}
                >
                  {savingSondagem ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver foto ou ouvir áudio da sondagem */}
      {showSondagemMidiaModal && sondagemMidiaUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2100,
          }}
          onMouseDown={handleBackdropMouseDown}
          onClick={(e) => handleBackdropClick(e, () => setShowSondagemMidiaModal(false))}
        >
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 12,
              maxWidth: '95vw',
              maxHeight: '95vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setShowSondagemMidiaModal(false)}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Fechar
              </button>
            </div>
            {sondagemMidiaTipo === 'foto' ? (
              <img
                src={sondagemMidiaUrl}
                alt="Foto da escrita"
                style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }}
              />
            ) : (
              <audio controls src={sondagemMidiaUrl} style={{ minWidth: 280 }}>
                Seu navegador não suporta áudio.
              </audio>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SondagemModal;
