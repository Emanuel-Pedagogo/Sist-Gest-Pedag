import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import FormField from './FormField';

/**
 * Tela de boas-vindas para quem se cadastra sem estar vinculado a nenhuma
 * escola/coordenação existente. Cria, numa tacada só, um espaço isolado
 * (conta), a primeira escola e a primeira turma — o usuário vira coordenador
 * do próprio espaço (mesma RPC sacp_criar_conta_autonoma usada no banco).
 */
const OnboardingAutonomo = ({ onCreated }) => {
  const [nomeEscola, setNomeEscola] = useState('');
  const [nomeTurma, setNomeTurma] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nomeEscola.trim() || !nomeTurma.trim()) {
      setError('Preencha os dois campos para continuar.');
      return;
    }

    setLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'sacp_criar_conta_autonoma',
        { p_nome_escola: nomeEscola.trim(), p_nome_turma: nomeTurma.trim() },
      );

      if (rpcError) {
        setError('Não foi possível criar seu espaço: ' + rpcError.message);
        setLoading(false);
        return;
      }

      const resultado = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const escolaId = resultado?.escola_id;
      if (!escolaId) {
        setError('Não foi possível criar seu espaço. Tente novamente.');
        setLoading(false);
        return;
      }

      const { data: escola, error: escolaError } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', escolaId)
        .single();

      if (escolaError || !escola) {
        setError('Seu espaço foi criado, mas houve um erro ao carregá-lo. Recarregue a página.');
        setLoading(false);
        return;
      }

      onCreated(escola);
    } catch (err) {
      setError('Erro inesperado: ' + (err?.message || String(err)));
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        <h2>Bem-vindo(a) ao SACP!</h2>
        <p className="login-subtitle">
          Vamos criar seu espaço próprio, isolado de qualquer outra escola. Depois é só cadastrar seus
          alunos e começar a usar.
        </p>

        {error && <div className="auth-message auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <FormField label="Como você quer chamar sua escola ou projeto?" required>
            <input
              type="text"
              value={nomeEscola}
              onChange={(e) => setNomeEscola(e.target.value)}
              placeholder="Ex: Escola Municipal Aurora, ou seu nome"
              disabled={loading}
              autoFocus
            />
          </FormField>

          <FormField label="Nome da primeira turma" required>
            <input
              type="text"
              value={nomeTurma}
              onChange={(e) => setNomeTurma(e.target.value)}
              placeholder="Ex: 3º ano A"
              disabled={loading}
            />
          </FormField>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Criando seu espaço...' : 'Começar a usar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingAutonomo;
