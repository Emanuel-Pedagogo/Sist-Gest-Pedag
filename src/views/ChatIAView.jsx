import React, { useEffect, useRef, useState } from 'react';
import { sendChatMessage, confirmarEscritaChatIa, cancelarEscritaChatIa, userTextMessage } from '../services/chatIaApi';
import { exportChatRowsToPdf, exportChatRowsToWord, exportChatRowsToCsv } from '../utils/chatIaExport';
import { toast } from '../utils/appFeedback';

let nextDisplayId = 1;
const newId = () => nextDisplayId++;

const SUGESTOES = [
  'Quantos alunos estão com etiqueta vermelha hoje?',
  'Liste os alunos da turma X sem sondagem registrada este bimestre.',
  'Quais professores estão com entregas atrasadas?',
];

/**
 * Chat com IA (Claude) integrado ao SACP.
 * Consultas (SELECT) são executadas na hora; alterações de dados
 * (INSERT/UPDATE/DELETE) exigem confirmação explícita nesta tela.
 */
const ChatIAView = ({ isProfessor, activeSchoolId, activeSchoolName }) => {
  const [displayMessages, setDisplayMessages] = useState([]);
  const [history, setHistory] = useState([]); // formato Anthropic — enviado/recebido a cada turno
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [exportingKey, setExportingKey] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, sending]);

  // Ao trocar a escola selecionada no topo da tela, reinicia a conversa —
  // o histórico anterior pode conter dados/contexto da escola anterior.
  useEffect(() => {
    setDisplayMessages([]);
    setHistory([]);
  }, [activeSchoolId]);

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending || !activeSchoolId) return;

    const userDisplay = { id: newId(), role: 'user', text };
    setDisplayMessages((prev) => [...prev, userDisplay]);
    setInput('');
    setSending(true);

    const newHistory = [...history, userTextMessage(text)];

    try {
      const result = await sendChatMessage(newHistory, activeSchoolId);
      setHistory(result.messages || newHistory);
      setDisplayMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: result.reply || '(sem resposta)',
          pendingConfirmations: result.pendingConfirmations || [],
          queryResults: result.queryResults || [],
        },
      ]);
    } catch (error) {
      console.error('Erro no chat IA:', error);
      setDisplayMessages((prev) => [
        ...prev,
        { id: newId(), role: 'erro', text: error.message || 'Erro ao falar com o Chat IA.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmar = async (confirmacao, msgId) => {
    setConfirmingId(confirmacao.confirmacao_id);
    try {
      const result = await confirmarEscritaChatIa(confirmacao.confirmacao_id);
      toast.success(`Alteração executada (${result.linhas_afetadas ?? 0} linha(s) afetada(s)).`);
      setDisplayMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                pendingConfirmations: m.pendingConfirmations.map((c) =>
                  c.confirmacao_id === confirmacao.confirmacao_id
                    ? { ...c, _status: 'executada', _linhas: result.linhas_afetadas }
                    : c,
                ),
              }
            : m,
        ),
      );
    } catch (error) {
      console.error('Erro ao confirmar alteração:', error);
      toast.error(error.message || 'Erro ao confirmar alteração.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelar = async (confirmacao, msgId) => {
    setConfirmingId(confirmacao.confirmacao_id);
    try {
      await cancelarEscritaChatIa(confirmacao.confirmacao_id);
      setDisplayMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                pendingConfirmations: m.pendingConfirmations.map((c) =>
                  c.confirmacao_id === confirmacao.confirmacao_id ? { ...c, _status: 'cancelada' } : c,
                ),
              }
            : m,
        ),
      );
    } catch (error) {
      console.error('Erro ao cancelar alteração:', error);
      toast.error(error.message || 'Erro ao cancelar alteração.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleExport = async (formato, resultado, resultKey) => {
    const titulo = resultado.motivo || 'Dados do Chat IA';
    setExportingKey(resultKey);
    try {
      if (formato === 'pdf') await exportChatRowsToPdf(resultado.rows, titulo);
      else if (formato === 'word') await exportChatRowsToWord(resultado.rows, titulo);
      else await exportChatRowsToCsv(resultado.rows, titulo);
    } catch (error) {
      console.error('Erro ao exportar dados do chat:', error);
      toast.error(error.message || 'Erro ao gerar o arquivo.');
    } finally {
      setExportingKey(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="view-section chat-ia-view">
      <div className="chat-ia-header">
        <h2 style={{ margin: 0 }}>Chat IA</h2>
        <p style={{ color: 'var(--text-light)', margin: '4px 0 0', fontSize: '0.9em' }}>
          Pergunte sobre alunos, turmas, sondagens, notas, ocorrências e agenda. Consultas são só leitura;
          {isProfessor
            ? ' alterações de dados pelo chat estão disponíveis apenas para a coordenação.'
            : ' alterações de dados só executam depois da sua confirmação.'}
        </p>
        {activeSchoolId ? (
          <p style={{ color: 'var(--text-light)', margin: '4px 0 0', fontSize: '0.85em' }}>
            <i className="fas fa-school" /> Escola ativa: <strong>{activeSchoolName || '—'}</strong> — o chat só
            busca e altera dados desta escola. Troque a escola no topo da tela para consultar outra.
          </p>
        ) : (
          <p style={{ color: 'var(--danger, #c0392b)', margin: '4px 0 0', fontSize: '0.85em' }}>
            <i className="fas fa-triangle-exclamation" /> Selecione uma escola no seletor no topo da tela para usar
            o Chat IA.
          </p>
        )}
      </div>

      <div className="chat-ia-messages" ref={scrollRef}>
        {!activeSchoolId && (
          <div className="chat-ia-empty">
            <p>Escolha uma escola no topo da tela para começar a conversar.</p>
          </div>
        )}

        {activeSchoolId && displayMessages.length === 0 && (
          <div className="chat-ia-empty">
            <p style={{ marginBottom: 10 }}>Experimente perguntar:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGESTOES.map((s) => (
                <button key={s} type="button" className="btn-secondary" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((m) => (
          <div
            key={m.id}
            className={`chat-ia-msg chat-ia-msg--${m.role === 'user' ? 'user' : m.role === 'erro' ? 'erro' : 'assistant'}`}
          >
            <div className="chat-ia-msg__bubble">{m.text}</div>

            {m.pendingConfirmations?.map((c) => (
              <div key={c.confirmacao_id} className="chat-ia-confirm-card">
                <div className="chat-ia-confirm-card__titulo">
                  <i className="fas fa-triangle-exclamation" /> Confirmação necessária — {c.operacao?.toUpperCase()} em{' '}
                  {c.tabela}
                </div>
                <p style={{ margin: '6px 0' }}>{c.descricao}</p>
                <pre className="chat-ia-confirm-card__sql">{c.sql}</pre>

                {(!c._status || c._status === 'pendente') && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: 'auto' }}
                      disabled={confirmingId === c.confirmacao_id}
                      onClick={() => handleConfirmar(c, m.id)}
                    >
                      {confirmingId === c.confirmacao_id ? 'Executando...' : 'Confirmar e executar'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={confirmingId === c.confirmacao_id}
                      onClick={() => handleCancelar(c, m.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {c._status === 'executada' && (
                  <div className="chat-ia-confirm-card__status chat-ia-confirm-card__status--ok">
                    <i className="fas fa-check" /> Executado — {c._linhas ?? 0} linha(s) afetada(s).
                  </div>
                )}
                {c._status === 'cancelada' && (
                  <div className="chat-ia-confirm-card__status chat-ia-confirm-card__status--cancelado">
                    <i className="fas fa-xmark" /> Cancelado. Nenhuma alteração foi feita.
                  </div>
                )}
              </div>
            ))}

            {m.queryResults
              ?.filter((r) => r.rows?.length)
              .map((r, idx) => {
                const resultKey = `${m.id}-${idx}`;
                return (
                  <div key={resultKey} className="chat-ia-export-card">
                    <div className="chat-ia-export-card__label">
                      <i className="fas fa-table" /> {r.motivo || 'Resultado da consulta'} ({r.rows.length}{' '}
                      {r.rows.length === 1 ? 'linha' : 'linhas'})
                    </div>
                    <div className="chat-ia-export-card__actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={exportingKey === resultKey}
                        onClick={() => handleExport('pdf', r, resultKey)}
                      >
                        <i className="fas fa-file-pdf" /> PDF
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={exportingKey === resultKey}
                        onClick={() => handleExport('word', r, resultKey)}
                      >
                        <i className="fas fa-file-word" /> Word
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={exportingKey === resultKey}
                        onClick={() => handleExport('csv', r, resultKey)}
                      >
                        <i className="fas fa-file-csv" /> Excel/CSV
                      </button>
                      {exportingKey === resultKey && <span className="chat-ia-export-card__loading">Gerando...</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}

        {sending && (
          <div className="chat-ia-msg chat-ia-msg--assistant">
            <div className="chat-ia-msg__bubble chat-ia-msg__bubble--loading">Pensando...</div>
          </div>
        )}
      </div>

      <div className="chat-ia-input-row">
        <textarea
          className="chat-ia-input"
          placeholder={
            activeSchoolId
              ? 'Pergunte algo sobre os dados do SACP...'
              : 'Selecione uma escola no topo da tela para conversar...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending || !activeSchoolId}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ width: 'auto' }}
          onClick={() => handleSend()}
          disabled={sending || !input.trim() || !activeSchoolId}
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatIAView;
