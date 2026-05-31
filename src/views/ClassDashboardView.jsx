import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';

const ClassDashboardView = ({ classId, className, students }) => {
  const [loading, setLoading] = useState(true);
  const [sondagens, setSondagens] = useState([]);
  const [notas, setNotas] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!classId || !students || students.length === 0) {
        setLoading(false);
        return;
      }
      
      const studentIds = students.map(s => s.id);
      
      // Fetch latest sondagens
      const { data: sondagensData } = await supabase
        .from('sondagens')
        .select('aluno_id, nivel_leitura, nivel_escrita, data')
        .in('aluno_id', studentIds)
        .order('data', { ascending: false });
        
      const latestSondagens = {};
      (sondagensData || []).forEach(s => {
        if (!latestSondagens[s.aluno_id]) {
          latestSondagens[s.aluno_id] = s;
        }
      });
      setSondagens(Object.values(latestSondagens));

      // Fetch notas_boletim
      const { data: notasData } = await supabase
        .from('notas_boletim')
        .select('aluno_id, disciplina, bimestre, nota')
        .in('aluno_id', studentIds);
        
      setNotas(notasData || []);
      setLoading(false);
    };
    
    fetchData();
  }, [classId, students]);

  // Calculate data for charts

  // 1. Tags de cores
  const colorTagsData = [
    { name: 'Risco', value: students.filter(s => s.etiqueta_cor === 'vermelho').length, color: '#dc3545' },
    { name: 'Atenção', value: students.filter(s => s.etiqueta_cor === 'amarelo').length, color: '#ffc107' },
    { name: 'Adequado', value: students.filter(s => s.etiqueta_cor === 'azul').length, color: '#007bff' },
    { name: 'Avançado', value: students.filter(s => s.etiqueta_cor === 'verde').length, color: '#28a745' },
    { name: 'AEE', value: students.filter(s => s.etiqueta_cor === 'roxo').length, color: '#9c27b0' },
  ].filter(item => item.value > 0);

  // 2. Notas (Abaixo de 5, Entre 5 e 6, Acima de 6)
  const alunosNotas = {
    abaixo5: new Set(),
    entre5e6: new Set(),
    acima6: new Set()
  };

  notas.forEach(n => {
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
  ].filter(item => item.value > 0);

  // 3. Níveis de Leitura
  const leituraCounts = {};
  sondagens.forEach(s => {
    const nivel = s.nivel_leitura || 'Não informado';
    leituraCounts[nivel] = (leituraCounts[nivel] || 0) + 1;
  });
  const leituraData = Object.keys(leituraCounts).map(key => ({ name: key, value: leituraCounts[key] })).sort((a, b) => b.value - a.value);

  // 4. Níveis de Escrita
  const escritaCounts = {};
  sondagens.forEach(s => {
    const nivel = s.nivel_escrita || 'Não informado';
    escritaCounts[nivel] = (escritaCounts[nivel] || 0) + 1;
  });
  const escritaData = Object.keys(escritaCounts).map(key => ({ name: key, value: escritaCounts[key] })).sort((a, b) => b.value - a.value);

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
          {notasData.some(d => d.value > 0) ? (
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

        {/* Gráfico de Níveis de Leitura */}
        <div className="class-dashboard-chart">
          <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Níveis de Leitura (Alfabetiza Pará)</h4>
          {leituraData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leituraData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" name="Alunos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>Sem sondagens de leitura cadastradas.</p>
          )}
        </div>

        {/* Gráfico de Níveis de Escrita */}
        <div className="class-dashboard-chart">
          <h4 style={{ textAlign: 'center', marginBottom: 20 }}>Níveis de Escrita (Alfabetiza Pará)</h4>
          {escritaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={escritaData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" name="Alunos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>Sem sondagens de escrita cadastradas.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDashboardView;
