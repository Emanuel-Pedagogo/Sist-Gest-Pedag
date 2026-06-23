import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import { formatMonthKey, consolidateSondagensMes } from '../utils/sondagemConsolidado';
import SondagemNivelBarChart from '../components/charts/SondagemNivelBarChart';

const ClassDashboardView = ({ classId, className, students }) => {
  const [loading, setLoading] = useState(true);
  const [allSondagens, setAllSondagens] = useState([]);
  const [notas, setNotas] = useState([]);
  const [referenceMonth, setReferenceMonth] = useState(() => formatMonthKey());

  useEffect(() => {
    const fetchData = async () => {
      if (!classId || !students || students.length === 0) {
        setAllSondagens([]);
        setNotas([]);
        setLoading(false);
        return;
      }

      const studentIds = students.map((s) => s.id);

      const { data: sondagensData } = await supabase
        .from('sondagens')
        .select('aluno_id, nivel_leitura, nivel_escrita, data')
        .in('aluno_id', studentIds)
        .order('data', { ascending: false });

      setAllSondagens(sondagensData || []);

      const { data: notasData } = await supabase
        .from('notas_boletim')
        .select('aluno_id, disciplina, bimestre, nota')
        .in('aluno_id', studentIds);

      setNotas(notasData || []);
      setLoading(false);
    };

    fetchData();
  }, [classId, students]);

  const consolidado = useMemo(
    () => consolidateSondagensMes(allSondagens, referenceMonth, students?.length || 0),
    [allSondagens, referenceMonth, students]
  );

  const { leituraData, escritaData, comSondagem, semSondagem, hasSondagens } = consolidado;

  const monthLabel = useMemo(() => {
    const [year, month] = referenceMonth.split('-').map(Number);
    if (!year || !month) return referenceMonth;
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [referenceMonth]);

  // 1. Tags de cores
  const colorTagsData = [
    { name: 'Risco', value: students.filter((s) => s.etiqueta_cor === 'vermelho').length, color: '#dc3545' },
    { name: 'Atenção', value: students.filter((s) => s.etiqueta_cor === 'amarelo').length, color: '#ffc107' },
    { name: 'Adequado', value: students.filter((s) => s.etiqueta_cor === 'azul').length, color: '#007bff' },
    { name: 'Avançado', value: students.filter((s) => s.etiqueta_cor === 'verde').length, color: '#28a745' },
    { name: 'AEE', value: students.filter((s) => s.etiqueta_cor === 'roxo').length, color: '#9c27b0' },
  ].filter((item) => item.value > 0);

  // 2. Notas (Abaixo de 5, Entre 5 e 6, Acima de 6)
  const alunosNotas = {
    abaixo5: new Set(),
    entre5e6: new Set(),
    acima6: new Set(),
  };

  notas.forEach((n) => {
    if (n.nota !== null && n.nota !== undefined && n.nota !== '') {
      const val = parseFloat(String(n.nota).replace(',', '.'));
      if (!isNaN(val)) {
        if (val < 5) alunosNotas.abaixo5.add(n.aluno_id);
        else if (val >= 5 && val <= 6) alunosNotas.entre5e6.add(n.aluno_id);
        else if (val > 6) alunosNotas.acima6.add(n.aluno_id);
      }
    }
  });

  const notasData = [
    { name: 'Abaixo de 5', value: alunosNotas.abaixo5.size, color: '#dc3545' },
    { name: 'Entre 5 e 6', value: alunosNotas.entre5e6.size, color: '#ffc107' },
    { name: 'Acima de 6', value: alunosNotas.acima6.size, color: '#007bff' },
  ].filter((item) => item.value > 0);

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando dashboard...</div>;
  }

  return (
    <div className="class-dashboard" style={{ padding: '10px 0' }}>
      <h3 style={{ marginBottom: 20 }}>Dashboard da Turma: {className}</h3>

      <div className="class-dashboard-grid">
        {/* Gráfico de Cores */}
        <div className="class-dashboard-chart">
          <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Etiquetas de Cores</h4>
          {colorTagsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={colorTagsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {colorTagsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>Sem dados de etiquetas.</p>
          )}
        </div>

        {/* Gráfico de Notas */}
        <div className="class-dashboard-chart">
          <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Classificação de Notas</h4>
          {notasData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={notasData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {notasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>Sem notas lançadas para a turma.</p>
          )}
        </div>

        {/* Consolidado mensal de sondagens */}
        <div className="class-dashboard-sondagens-section">
          <div className="class-dashboard-sondagens-header">
            <div>
              <h4 style={{ margin: '0 0 4px' }}>Consolidado de sondagens da turma</h4>
              <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>
                Quantidade de alunos por nível — {monthLabel}
              </p>
            </div>
            <label className="class-dashboard-month-picker">
              <span>Mês de referência</span>
              <input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                aria-label="Mês de referência das sondagens"
              />
            </label>
          </div>

          {hasSondagens ? (
            <p style={{ margin: '12px 0 0', color: '#444', fontSize: '0.9rem' }}>
              <strong>{comSondagem}</strong> aluno(s) com sondagem neste mês
              {semSondagem > 0 && (
                <>
                  {' '}
                  · <strong>{semSondagem}</strong> sem sondagem no mês
                </>
              )}
            </p>
          ) : (
            <p style={{ margin: '16px 0 0', textAlign: 'center', color: '#666' }}>
              Nenhuma sondagem cadastrada em {monthLabel}. Selecione outro mês ou cadastre sondagens na turma.
            </p>
          )}
        </div>

        {/* Gráfico de Níveis de Leitura */}
        <div className="class-dashboard-chart">
          <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Níveis de Leitura (Alfabetiza Pará)</h4>
          {hasSondagens && leituraData.length > 0 ? (
            <SondagemNivelBarChart data={leituraData} color="#8884d8" />
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>
              {hasSondagens ? 'Sem níveis de leitura informados.' : 'Sem dados para este mês.'}
            </p>
          )}
        </div>

        {/* Gráfico de Níveis de Escrita */}
        <div className="class-dashboard-chart">
          <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Níveis de Escrita (Alfabetiza Pará)</h4>
          {hasSondagens && escritaData.length > 0 ? (
            <SondagemNivelBarChart data={escritaData} color="#82ca9d" />
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>
              {hasSondagens ? 'Sem níveis de escrita informados.' : 'Sem dados para este mês.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDashboardView;
