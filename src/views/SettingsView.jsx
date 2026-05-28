import React, { useState, useEffect } from 'react';
import { evaluateStudentColor } from '../utils/studentColorEvaluator';
import {
  GRUPOS_NIVEIS_LEITURA,
  GRUPOS_NIVEIS_ESCRITA,
  TODOS_NIVEIS_LEITURA,
  TODOS_NIVEIS_ESCRITA,
  matchNivelOficial,
  normalizeNivelKey,
} from '../utils/sondagemNiveis';

const migrateNiveisSalvos = (lista, todasOpcoes) =>
  [...new Set(
    (lista || [])
      .map((v) => matchNivelOficial(v, todasOpcoes) || v)
      .filter(Boolean),
  )];

const checkboxGroupStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  padding: 10,
  border: '1px solid #eee',
  borderRadius: 4,
};

const NivelCheckboxGrupos = ({ grupos, field, selecionados, onToggle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    {grupos.map((grupo) => (
      <div key={grupo.id}>
        <h5 style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#444' }}>{grupo.label}</h5>
        <div style={checkboxGroupStyle}>
          {grupo.opcoes.map((nivel) => (
            <label
              key={nivel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.9em',
                background: '#f9f9f9',
                padding: '4px 8px',
                borderRadius: 4,
              }}
            >
              <input
                type="checkbox"
                checked={(selecionados || []).some(
                  (sel) => normalizeNivelKey(sel) === normalizeNivelKey(nivel),
                )}
                onChange={() => onToggle(field, nivel)}
              />
              {nivel}
            </label>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const SettingsView = ({ activeSchoolId, supabase }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    vermelho: { notaMin: '', notaMax: '', niveisLeitura: [], niveisEscrita: [], tiposOcorrencia: [] },
    amarelo: { notaMin: '', notaMax: '', niveisLeitura: [], niveisEscrita: [], tiposOcorrencia: [] },
    verde: { notaMin: '', notaMax: '', niveisLeitura: [], niveisEscrita: [], tiposOcorrencia: [] },
    azul: { notaMin: '', notaMax: '', niveisLeitura: [], niveisEscrita: [], tiposOcorrencia: [] },
    roxo: { notaMin: '', notaMax: '', niveisLeitura: [], niveisEscrita: [], tiposOcorrencia: [] },
  });

  const [activeTab, setActiveTab] = useState('vermelho');

  const cores = [
    { id: 'vermelho', label: 'Vermelho (Risco)', color: '#e74c3c' },
    { id: 'amarelo', label: 'Amarelo (Atenção)', color: '#f1c40f' },
    { id: 'verde', label: 'Verde (Avançado)', color: '#2ecc71' },
    { id: 'azul', label: 'Azul (Adequado)', color: '#3498db' },
    { id: 'roxo', label: 'Roxo (AEE)', color: '#9b59b6' },
  ];

  const tiposOcorrencia = ['Comportamental', 'Pedagógico', 'Saúde', 'Outros'];

  const normalizarTagsConfig = (tags) => {
    if (!tags) return tags;
    const cores = ['vermelho', 'amarelo', 'verde', 'azul', 'roxo'];
    const out = { ...tags };
    for (const cor of cores) {
      if (!out[cor]) continue;
      out[cor] = {
        ...out[cor],
        niveisLeitura: migrateNiveisSalvos(out[cor].niveisLeitura, TODOS_NIVEIS_LEITURA),
        niveisEscrita: migrateNiveisSalvos(out[cor].niveisEscrita, TODOS_NIVEIS_ESCRITA),
      };
    }
    return out;
  };

  useEffect(() => {
    if (activeSchoolId) {
      loadConfig();
    }
  }, [activeSchoolId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('configuracoes')
        .eq('id', activeSchoolId)
        .single();

      if (error) {
        if (error.message && error.message.includes('configuracoes')) {
          console.warn('Coluna configuracoes não existe na tabela escolas. Por favor, execute o script SQL.');
          return;
        }
        throw error;
      }

      if (data?.configuracoes?.tags) {
        setConfig((prev) => ({ ...prev, ...normalizarTagsConfig(data.configuracoes.tags) }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Primeiro, pega as configurações atuais para não sobrescrever outras coisas
      const { data: escolaData } = await supabase
        .from('escolas')
        .select('configuracoes')
        .eq('id', activeSchoolId)
        .single();

      const currentConfig = escolaData?.configuracoes || {};
      const newConfig = {
        ...currentConfig,
        tags: config
      };

      const { error } = await supabase
        .from('escolas')
        .update({ configuracoes: newConfig })
        .eq('id', activeSchoolId);

      if (error) {
        if (error.message && error.message.includes('configuracoes')) {
          alert('Erro: A coluna "configuracoes" não existe no banco de dados. Por favor, execute o script SQL "supabase_escolas_configuracoes.sql" no Supabase.');
          return;
        }
        throw error;
      }
      alert('Configurações salvas com sucesso! As cores dos alunos serão atualizadas em breve.');
      
      // Chamar função para atualizar cores dos alunos
      await updateStudentsColors(config);
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const updateStudentsColors = async (tagConfig) => {
    try {
      // 1. Buscar todos os alunos da escola
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id, nome, ano_escolar')
        .eq('escola_id', activeSchoolId);
      if (!turmas || turmas.length === 0) return;
      const turmaIds = turmas.map(t => t.id);
      const turmaById = Object.fromEntries(turmas.map((t) => [t.id, t]));

      const { data: alunos } = await supabase
        .from('alunos')
        .select('id, etiqueta_cor, turma_id')
        .in('turma_id', turmaIds);

      if (!alunos) return;

      // 2. Buscar dados necessários para avaliação (notas, sondagens, ocorrencias)
      const alunoIds = alunos.map(a => a.id);
      
      const [
        { data: notas },
        { data: sondagens },
        { data: ocorrencias }
      ] = await Promise.all([
        supabase.from('notas_boletim').select('aluno_id, nota').in('aluno_id', alunoIds),
        supabase.from('sondagens').select('aluno_id, nivel_leitura, nivel_escrita').in('aluno_id', alunoIds).order('data', { ascending: false }),
        supabase.from('ocorrencias').select('aluno_id, tipo').in('aluno_id', alunoIds)
      ]);

      // Agrupar dados por aluno
      const dataByAluno = {};
      alunoIds.forEach(id => {
        dataByAluno[id] = { notas: [], sondagem: null, ocorrencias: [] };
      });

      notas?.forEach(n => {
        if (n.nota !== null) dataByAluno[n.aluno_id].notas.push(parseFloat(n.nota));
      });

      sondagens?.forEach(s => {
        if (!dataByAluno[s.aluno_id].sondagem) {
          dataByAluno[s.aluno_id].sondagem = s; // Pega a mais recente
        }
      });

      ocorrencias?.forEach(o => {
        dataByAluno[o.aluno_id].ocorrencias.push(o.tipo);
      });

      // 3. Avaliar cada aluno
      const updates = [];
      
      for (const aluno of alunos) {
        const data = dataByAluno[aluno.id];
        const turma = turmaById[aluno.turma_id];
        const newColor = evaluateStudentColor(tagConfig, data, {
          turmaNome: turma?.nome || '',
          anoEscolar: turma?.ano_escolar ?? null,
        });
        
        if (newColor !== aluno.etiqueta_cor) {
          updates.push({ id: aluno.id, etiqueta_cor: newColor });
        }
      }

      // 4. Atualizar no banco em lotes
      if (updates.length > 0) {
        for (const update of updates) {
          await supabase.from('alunos').update({ etiqueta_cor: update.etiqueta_cor }).eq('id', update.id);
        }
        console.log(`Atualizadas as cores de ${updates.length} alunos.`);
      }
      
    } catch (error) {
      console.error('Erro ao atualizar cores dos alunos:', error);
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value
      }
    }));
  };

  const toggleArrayItem = (field, item) => {
    setConfig((prev) => {
      const currentArray = prev[activeTab][field] || [];
      const itemKey = normalizeNivelKey(item);
      const exists = currentArray.some((i) => normalizeNivelKey(i) === itemKey);
      const newArray = exists
        ? currentArray.filter((i) => normalizeNivelKey(i) !== itemKey)
        : [...currentArray, item];

      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          [field]: newArray,
        },
      };
    });
  };

  if (!activeSchoolId) {
    return (
      <div className="view-section">
        <p>Selecione uma escola para configurar as tags.</p>
      </div>
    );
  }

  const currentConfig = config[activeTab] || { notaMin: '', notaMax: '', niveisLeitura: [], niveisEscrita: [], tiposOcorrencia: [] };

  return (
    <div className="view-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Configurações de Tags</h2>
        <button 
          className="btn-primary" 
          onClick={handleSave} 
          disabled={saving || loading}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      <p style={{ marginBottom: 20, color: '#666' }}>
        Defina os critérios para que um aluno receba cada tag automaticamente. 
        A prioridade de atribuição é: Roxo &gt; Vermelho &gt; Amarelo &gt; Verde &gt; Azul.
        Se um aluno atender a critérios de múltiplas tags, ele receberá a de maior prioridade.
      </p>

      {loading ? (
        <p>Carregando configurações...</p>
      ) : (
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Menu lateral de cores */}
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cores.map(cor => (
              <button
                key={cor.id}
                onClick={() => setActiveTab(cor.id)}
                style={{
                  padding: '12px 15px',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeTab === cor.id ? cor.color : '#f5f5f5',
                  color: activeTab === cor.id ? 'white' : '#333',
                  fontWeight: activeTab === cor.id ? 'bold' : 'normal',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <span style={{ 
                  width: 16, height: 16, borderRadius: '50%', 
                  background: activeTab === cor.id ? 'white' : cor.color 
                }}></span>
                {cor.label}
              </button>
            ))}
          </div>

          {/* Área de configuração */}
          <div style={{ flex: 1, background: '#fff', padding: 25, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: cores.find(c => c.id === activeTab)?.color }}>
              Critérios para a Tag {cores.find(c => c.id === activeTab)?.label}
            </h3>
            
            <div style={{ marginTop: 20 }}>
              <h4>1. Média de Notas</h4>
              <p style={{ fontSize: '0.85em', color: '#666', marginBottom: 10 }}>
                Aplica-se do 2º ano em diante. Alunos de Pré I, Pré II e 1º ano recebem a etiqueta
                apenas com base em nível de leitura, escrita e ocorrências.
              </p>
              <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginTop: 10 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em' }}>Nota Mínima</label>
                  <input 
                    type="number" 
                    min="0" max="10" step="0.1"
                    value={currentConfig.notaMin}
                    onChange={(e) => handleConfigChange('notaMin', e.target.value)}
                    style={{ width: 100, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                    placeholder="Ex: 0"
                  />
                </div>
                <span style={{ marginTop: 25 }}>até</span>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em' }}>Nota Máxima</label>
                  <input 
                    type="number" 
                    min="0" max="10" step="0.1"
                    value={currentConfig.notaMax}
                    onChange={(e) => handleConfigChange('notaMax', e.target.value)}
                    style={{ width: 100, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                    placeholder="Ex: 4.9"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 30 }}>
              <h4>2. Níveis de Leitura</h4>
              <p style={{ fontSize: '0.85em', color: '#666', marginBottom: 12 }}>
                Descritores iguais aos da sondagem, separados por etapa. Marque os níveis que enquadram o aluno nesta tag.
              </p>
              <NivelCheckboxGrupos
                grupos={GRUPOS_NIVEIS_LEITURA}
                field="niveisLeitura"
                selecionados={currentConfig.niveisLeitura}
                onToggle={toggleArrayItem}
              />
            </div>

            <div style={{ marginTop: 30 }}>
              <h4>3. Níveis de Escrita</h4>
              <p style={{ fontSize: '0.85em', color: '#666', marginBottom: 12 }}>
                Descritores iguais aos da sondagem, separados por etapa.
              </p>
              <NivelCheckboxGrupos
                grupos={GRUPOS_NIVEIS_ESCRITA}
                field="niveisEscrita"
                selecionados={currentConfig.niveisEscrita}
                onToggle={toggleArrayItem}
              />
            </div>

            <div style={{ marginTop: 30 }}>
              <h4>4. Tipos de Ocorrência</h4>
              <p style={{ fontSize: '0.85em', color: '#666', marginBottom: 10 }}>Se o aluno tiver ocorrências destes tipos, ele receberá esta tag.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
                {tiposOcorrencia.map(tipo => (
                  <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input 
                      type="checkbox" 
                      checked={(currentConfig.tiposOcorrencia || []).includes(tipo)}
                      onChange={() => toggleArrayItem('tiposOcorrencia', tipo)}
                    />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
