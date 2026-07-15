import React, { useEffect, useRef, useState } from 'react';
import { sendChatMessage, confirmarEscritaChatIa, cancelarEscritaChatIa, userTextMessage } from '../services/chatIaApi';
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
const ChatIAView = ({ isProfessor }) => {
  const [displayMessages, setDisplayMessages] = useState([]);
  const [history, setHistory] = useState([]); // formato Anthropic — enviado/recebido a cada turno
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, sending]);

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    const userDisplay = { id: newId(), role: 'user', text };
    setDisplayMessages((prev) => [...prev, userDisplay]);
    setInput('');
    setSending(true);

    const newHistory = [...history, userTextMessage(text)];

    try {
      const result = await sendChatMessage(newHistory);
      setHistory(result.messages || newHistory);
      setDisplayMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: result.reply || '(sem resposta)',
          pendingConfirmations: result.pendingConfirmations || [],
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
      </div>

      <div className="chat-ia-messages" ref={scrollRef}>
        {displayMessages.length === 0 && (
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
          placeholder="Pergunte algo sobre os dados do SACP..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ width: 'auto' }}
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatIAView;
