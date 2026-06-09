import { describe, expect, it } from 'vitest';
import {
  aggregateAee,
  aggregateEtiquetas,
  aggregateNotasPorDisciplina,
  alunosAbaixoMedia,
  attachTurmaInfo,
  buildSondagemComparison,
  countByField,
  filterAlunosForCharts,
  filterNotas,
  latestSondagensForMonth,
  scopeTurmas,
  studentsWithoutSondagem,
  withPercent,
} from './chartsData';

describe('chartsData', () => {
  const turmas = [
    { id: 't1', nome: '1º Ano', escola_id: 'e1', ano_letivo: 2026 },
    { id: 't2', nome: '2º Ano', escola_id: 'e1', ano_letivo: 2025 },
    { id: 't3', nome: '3º Ano', escola_id: 'e2', ano_letivo: 2026 },
  ];

  it('filtra turmas por escola e ano quando existe ano letivo correspondente', () => {
    const result = scopeTurmas(turmas, { schoolId: 'e1', year: 2026 });
    expect(result.yearFallback).toBe(false);
    expect(result.turmas.map((t) => t.id)).toEqual(['t1']);
  });

  it('usa fallback de ano quando nenhuma turma bate com o ano selecionado', () => {
    const result = scopeTurmas(turmas, { schoolId: 'e1', year: 2030 });
    expect(result.yearFallback).toBe(true);
    expect(result.turmas.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('anexa nome da turma aos alunos e descarta alunos fora do escopo', () => {
    const alunos = [
      { id: 'a1', turma_id: 't1', nome: 'Ana' },
      { id: 'a2', turma_id: 'fora', nome: 'Bia' },
    ];
    expect(attachTurmaInfo(alunos, turmas)).toEqual([
      expect.objectContaining({ id: 'a1', turma_nome: '1º Ano', escola_id: 'e1' }),
    ]);
  });

  it('filtra alunos por turma, etiqueta e AEE', () => {
    const alunos = [
      { id: 'a1', turma_id: 't1', etiqueta_cor: 'vermelho' },
      { id: 'a2', turma_id: 't1', etiqueta_cor: 'roxo' },
      { id: 'a3', turma_id: 't2', etiqueta_cor: 'vermelho' },
    ];
    const result = filterAlunosForCharts(alunos, {
      turmaId: 't1',
      etiqueta: 'roxo',
      aee: 'com',
    });
    expect(result.map((a) => a.id)).toEqual(['a2']);
  });

  it('seleciona a sondagem mais recente por aluno dentro do mês', () => {
    const sondagens = [
      { aluno_id: 'a1', data: '2026-06-01', nivel_leitura: 'Inicial' },
      { aluno_id: 'a1', data: '2026-06-20', nivel_leitura: 'Fluente' },
      { aluno_id: 'a1', data: '2026-05-20', nivel_leitura: 'Outro mês' },
      { aluno_id: 'a2', data: '2026-06-02', nivel_leitura: 'Inicial' },
    ];
    const result = latestSondagensForMonth(sondagens, ['a1', 'a2'], '2026-06');
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.aluno_id === 'a1').nivel_leitura).toBe('Fluente');
  });

  it('conta níveis e identifica alunos sem sondagem', () => {
    const alunos = [{ id: 'a1', nome: 'Ana' }, { id: 'a2', nome: 'Bia' }];
    const latest = [{ aluno_id: 'a1', nivel_leitura: 'Fluente' }];
    expect(countByField(latest, 'nivel_leitura')).toEqual([{ name: 'Fluente', total: 1 }]);
    expect(studentsWithoutSondagem(alunos, latest).map((a) => a.nome)).toEqual(['Bia']);
  });

  it('agrega etiquetas respeitando cores conhecidas', () => {
    const result = aggregateEtiquetas([
      { etiqueta_cor: 'vermelho' },
      { etiqueta_cor: 'vermelho' },
      { etiqueta_cor: 'azul' },
      { etiqueta_cor: 'desconhecida' },
    ]);
    expect(result.find((r) => r.cor === 'vermelho').total).toBe(2);
    expect(result.find((r) => r.cor === 'azul').total).toBe(2);
  });

  it('filtra notas e calcula média por disciplina', () => {
    const notas = [
      { aluno_id: 'a1', disciplina: 'Matemática', bimestre: 1, nota: '4,5' },
      { aluno_id: 'a2', disciplina: 'Matemática', bimestre: 1, nota: 7.5 },
      { aluno_id: 'a2', disciplina: 'Português', bimestre: 2, nota: 8 },
    ];
    const filtradas = filterNotas(notas, ['a1', 'a2'], { bimestre: '1' });
    expect(filtradas).toHaveLength(2);
    expect(aggregateNotasPorDisciplina(filtradas)).toEqual([
      { disciplina: 'Matemática', media: 6, totalNotas: 2 },
    ]);
    expect(alunosAbaixoMedia(filtradas)).toBe(1);
  });

  it('calcula AEE agregado, comparativo e percentuais', () => {
    expect(aggregateAee([{ etiqueta_cor: 'roxo' }, { etiqueta_cor: 'azul' }])).toEqual([
      { name: 'Com AEE', total: 1, color: '#9B59B6' },
      { name: 'Sem AEE', total: 1, color: '#94A3B8' },
    ]);
    expect(buildSondagemComparison([{ name: 'Inicial', total: 2 }], [{ name: 'Inicial', total: 1 }])).toEqual([
      { name: 'Inicial', leitura: 2, escrita: 1 },
    ]);
    expect(withPercent([{ name: 'A', total: 1 }], 4)).toEqual([{ name: 'A', total: 1, percent: 25 }]);
  });
});
