import { describe, it, expect } from 'vitest';
import {
  filterStudents,
  countByEtiqueta,
  buildSondagemConsolidado,
  countOcorrenciasPorTipo,
  countOcorrenciasPorMes,
  calcPercent,
  enrichWithValueMode,
  getAlunosAbaixoMedia,
  alunoTemAee,
  countAeeAgregado,
} from './chartsData';

const students = [
  { id: 'a1', nome: 'Ana', turma_id: 't1', turma_nome: '3º A', etiqueta_cor: 'vermelho' },
  { id: 'a2', nome: 'Bruno', turma_id: 't1', turma_nome: '3º A', etiqueta_cor: 'azul' },
  { id: 'a3', nome: 'Carla', turma_id: 't2', turma_nome: '4º B', etiqueta_cor: 'amarelo', aee_tem_laudo: true },
];

describe('filterStudents', () => {
  it('filtra por turma e etiqueta', () => {
    expect(filterStudents(students, { turmaId: 't1' })).toHaveLength(2);
    expect(filterStudents(students, { etiquetaCor: 'vermelho' })).toHaveLength(1);
    expect(filterStudents(students, { aeeFilter: 'com_aee' })).toHaveLength(1);
    expect(filterStudents(students, { aeeFilter: 'sem_aee' })).toHaveLength(2);
  });
});

describe('countByEtiqueta', () => {
  it('agrupa por cor pedagógica', () => {
    const data = countByEtiqueta(students);
    expect(data.find((d) => d.cor === 'vermelho')?.value).toBe(1);
    expect(data.find((d) => d.cor === 'azul')?.value).toBe(1);
    expect(data.find((d) => d.cor === 'amarelo')?.value).toBe(1);
    expect(data.find((d) => d.cor === 'verde')).toBeUndefined();
  });
});

describe('buildSondagemConsolidado', () => {
  const sondagens = [
    { aluno_id: 'a1', data: '2026-06-05', nivel_leitura: 'L1', nivel_escrita: 'E1' },
    { aluno_id: 'a1', data: '2026-06-20', nivel_leitura: 'L2', nivel_escrita: 'E2' },
    { aluno_id: 'a2', data: '2026-06-10', nivel_leitura: 'L1', nivel_escrita: 'E1' },
  ];

  it('usa sondagem mais recente por aluno no mês', () => {
    const r = buildSondagemConsolidado(sondagens, students, '2026-06');
    expect(r.comSondagem).toBe(2);
    expect(r.semSondagem).toBe(1);
    expect(r.semSondagemAlunos).toHaveLength(1);
    expect(r.semSondagemAlunos[0].id).toBe('a3');
    expect(r.leituraData.find((d) => d.name === 'L2')?.value).toBe(1);
  });
});

describe('countOcorrenciasPorTipo', () => {
  const ocorrencias = [
    { aluno_id: 'a1', tipo: 'Pedagógico', data_ocorrencia: '2026-06-10' },
    { aluno_id: 'a1', tipo: 'Pedagógico', data_ocorrencia: '2026-06-12' },
    { aluno_id: 'a2', tipo: 'Comportamental', data_ocorrencia: '2026-05-01' },
  ];

  it('conta por tipo no período', () => {
    const todos = countOcorrenciasPorTipo(ocorrencias);
    expect(todos.find((d) => d.name === 'Pedagógico')?.value).toBe(2);
    expect(todos.find((d) => d.name === 'Comportamental')?.value).toBe(1);

    const junho = countOcorrenciasPorTipo(ocorrencias, { monthKey: '2026-06' });
    expect(junho).toHaveLength(1);
    expect(junho[0].value).toBe(2);
  });

  it('agrupa por mês', () => {
    const meses = countOcorrenciasPorMes(ocorrencias);
    expect(meses).toHaveLength(2);
    expect(meses[1].value).toBe(2);
  });
});

describe('calcPercent e enrichWithValueMode', () => {
  it('calcula percentual com total zero', () => {
    expect(calcPercent(5, 0)).toBe(0);
    expect(calcPercent(1, 4)).toBe(25);
  });

  it('enriquece dados conforme modo', () => {
    const rows = enrichWithValueMode([{ name: 'A', value: 2 }], 4, 'both');
    expect(rows[0].label).toBe('2 (50%)');
    expect(enrichWithValueMode([{ name: 'A', value: 2 }], 4, 'percent')[0].label).toBe('50%');
  });
});

describe('getAlunosAbaixoMedia', () => {
  it('lista alunos com média abaixo do limiar', () => {
    const notas = [
      { aluno_id: 'a1', disciplina: 'MAT', bimestre: '1', nota: '4,5' },
      { aluno_id: 'a1', disciplina: 'PORT', bimestre: '1', nota: '5' },
      { aluno_id: 'a2', disciplina: 'MAT', bimestre: '1', nota: '8' },
    ];
    const abaixo = getAlunosAbaixoMedia(notas, students, { threshold: 6, bimestre: '1' });
    expect(abaixo).toHaveLength(1);
    expect(abaixo[0].alunoId).toBe('a1');
  });
});

describe('alunoTemAee e countAeeAgregado', () => {
  it('detecta AEE sem expor dados sensíveis', () => {
    expect(alunoTemAee(students[2])).toBe(true);
    expect(alunoTemAee(students[0])).toBe(false);
    const agg = countAeeAgregado(students);
    expect(agg.comAee).toBe(1);
    expect(agg.semAee).toBe(2);
  });
});
