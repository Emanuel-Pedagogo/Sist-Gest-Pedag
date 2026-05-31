import React, { useRef } from 'react';

const ACCEPTED_TYPES =
  '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const getFileIcon = (name) => {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'fa-image';
  if (ext === 'pdf') return 'fa-file-pdf';
  if (['doc', 'docx'].includes(ext)) return 'fa-file-word';
  return 'fa-file';
};

const isImageFile = (name) => {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

const formatEventDateTime = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AgendaEventDetailView = ({
  navigate,
  selectedAgendaEvent,
  anotacoesText,
  setAnotacoesText,
  savingAnotacoes,
  onSaveAnotacoes,
  anexos,
  loadingAnexos,
  uploadingAnexos,
  onUploadFiles,
  onDeleteAnexo,
  onEditEvent,
}) => {
  const fileInputRef = useRef(null);

  if (!selectedAgendaEvent) {
    return (
      <div className="view-section">
        <p>Evento não encontrado.</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('agenda')}>
          Voltar à agenda
        </button>
      </div>
    );
  }

  const cor =
    typeof selectedAgendaEvent.cor_etiqueta === 'string' &&
    selectedAgendaEvent.cor_etiqueta.startsWith('#')
      ? selectedAgendaEvent.cor_etiqueta
      : '#3498DB';

  const handleFilesSelected = (fileList) => {
    if (!fileList?.length) return;
    onUploadFiles(Array.from(fileList));
  };

  return (
    <div id="view-agenda-event-detail" className="view-section agenda-event-detail">
      <div className="agenda-detail-toolbar">
        <button
          type="button"
          className="btn-secondary agenda-detail-toolbar__btn"
          onClick={() => navigate('agenda')}
        >
          <i className="fas fa-arrow-left" /> Voltar à agenda
        </button>
        <button
          type="button"
          className="btn-secondary agenda-detail-toolbar__btn"
          onClick={onEditEvent}
        >
          <i className="fas fa-pen" /> Editar evento
        </button>
      </div>

      <div
        style={{
          borderLeft: `5px solid ${cor}`,
          paddingLeft: 16,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: '0 0 8px', color: '#333' }}>{selectedAgendaEvent.titulo}</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.95em' }}>
          <i className="fas fa-clock" style={{ marginRight: 6 }} />
          {formatEventDateTime(selectedAgendaEvent.data_inicio)}
          {selectedAgendaEvent.data_fim &&
            selectedAgendaEvent.data_fim !== selectedAgendaEvent.data_inicio && (
              <>
                {' '}
                — {formatEventDateTime(selectedAgendaEvent.data_fim)}
              </>
            )}
        </p>
        {selectedAgendaEvent.descricao?.trim() && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: '#f8f9fa',
              borderRadius: 8,
              border: '1px solid #e9ecef',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#888',
                marginBottom: 6,
              }}
            >
              <i className="fas fa-sticky-note" style={{ marginRight: 6 }} />
              Observação do planejamento
            </div>
            <p style={{ margin: 0, color: '#444', fontSize: '0.95em', whiteSpace: 'pre-wrap' }}>
              {selectedAgendaEvent.descricao}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'linear-gradient(180deg, #fffef8 0%, #fff9e6 100%)',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid #e8e0c8',
          padding: 24,
          marginBottom: 24,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'repeating-linear-gradient(transparent, transparent 8px, #e0d5b0 8px, #e0d5b0 16px)',
            opacity: 0.5,
          }}
          aria-hidden
        />
        <label
          htmlFor="agenda-anotacoes"
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: 12,
            color: '#5c4a2a',
            fontSize: '1rem',
          }}
        >
          <i className="fas fa-book-open" style={{ marginRight: 8 }} />
          Anotações do dia
        </label>
        <p style={{ margin: '0 0 12px', fontSize: '0.85em', color: '#7a6a4a' }}>
          Registros feitos durante o evento. Não entram no planejamento exportado (PDF/Word).
        </p>
        <textarea
          id="agenda-anotacoes"
          value={anotacoesText}
          onChange={(e) => setAnotacoesText(e.target.value)}
          placeholder="O que aconteceu, participantes, combinados, encaminhamentos..."
          rows={14}
          style={{
            width: '100%',
            padding: '12px 12px 12px 20px',
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: '#333',
            resize: 'vertical',
            minHeight: 280,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div className="agenda-detail-save-row">
          <button
            type="button"
            className="btn-primary"
            onClick={onSaveAnotacoes}
            disabled={savingAnotacoes}
          >
            {savingAnotacoes ? 'Salvando...' : 'Salvar anotações'}
          </button>
        </div>
      </div>

      <section>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#333' }}>
          <i className="fas fa-paperclip" style={{ marginRight: 8 }} />
          Anexos
        </h3>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.background = '#f0f7ff';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = '#ccc';
            e.currentTarget.style.background = '#fafafa';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ccc';
            e.currentTarget.style.background = '#fafafa';
            handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #ccc',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
            background: '#fafafa',
            cursor: uploadingAnexos ? 'wait' : 'pointer',
            marginBottom: 20,
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            style={{ display: 'none' }}
            disabled={uploadingAnexos}
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />
          <i
            className="fas fa-cloud-upload-alt"
            style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: 12, display: 'block' }}
          />
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#333' }}>
            {uploadingAnexos ? 'Enviando arquivos...' : 'Clique ou arraste arquivos aqui'}
          </p>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#888' }}>
            Fotos (JPG, PNG, GIF), PDF e documentos Word (.doc, .docx)
          </p>
        </div>

        {loadingAnexos ? (
          <p style={{ color: '#666' }}>Carregando anexos...</p>
        ) : anexos.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9em' }}>Nenhum arquivo anexado a este evento.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {anexos.map((anexo) => (
              <div
                key={anexo.path || anexo.url}
                style={{
                  background: 'white',
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  border: '1px solid #eee',
                }}
              >
                {isImageFile(anexo.name) && anexo.url ? (
                  <a href={anexo.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={anexo.url}
                      alt={anexo.name}
                      style={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </a>
                ) : (
                  <div
                    style={{
                      height: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f5f5f5',
                    }}
                  >
                    <i
                      className={`fas ${getFileIcon(anexo.name)}`}
                      style={{ fontSize: '2.5rem', color: 'var(--primary)' }}
                    />
                  </div>
                )}
                <div style={{ padding: 12 }}>
                  <div
                    style={{
                      fontSize: '0.85em',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 10,
                    }}
                    title={anexo.displayName || anexo.name}
                  >
                    {anexo.displayName || anexo.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={anexo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '6px 10px',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: '0.8em',
                      }}
                    >
                      <i className="fas fa-external-link-alt" /> Abrir
                    </a>
                    {anexo.path && (
                      <button
                        type="button"
                        onClick={() => onDeleteAnexo(anexo.path, anexo.name)}
                        title="Remover anexo"
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #fcc',
                          borderRadius: 6,
                          background: '#fff5f5',
                          color: '#c33',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AgendaEventDetailView;
