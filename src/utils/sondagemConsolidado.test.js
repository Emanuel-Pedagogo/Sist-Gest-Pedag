import { describe, it, expect } from 'vitest';
import {
  formatMonthKey,
  isDateInMonth,
  pickLatestSondagemPerAlunoInMonth,
  countByNivel,
  consolidateSondagensMes,
} from './sondagemConsolidado';

describe('formatMonthKey', () => {
  it('formata mês com zero à esquerda', () => {
    expect(formatMonthKey(new Date(2026, 5, 15))).toBe('2026-06');
    expect(formatMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
  });
});

describe('isDateInMonth', () => {
  it('aceita data ISO e YYYY-MM-DD', () => {
    expect(isDateInMonth('2026-06-10', '2026-06')).toBe(true);
    expect(isDateInMonth('2026-06-10T12:00:00.000Z', '2026-06')).toBe(true);
    expect(isDateInMonth('2026-05-31', '2026-06')).toBe(false);
  });
});

describe('pickLatestSondagemPerAlunoInMonth', () => {
  const rows = [
    { aluno_id: 'a1', data: '2026-06-05', nivel_leitura: 'L1', nivel_escrita: 'E1' },
    { aluno_id: 'a1', data: '2026-06-20', nivel_leitura: 'L2', nivel_escrita: 'E2' },
    { aluno_id: 'a2', data: '2026-06-01', nivel_leitura: 'L3', nivel_escrita: 'E3' },
    { aluno_id: 'a1', data: '2026-05-30', nivel_leitura: 'Antigo', nivel_escrita: 'Antigo' },
    { aluno_id: 'a3', data: '2026-07-01', nivel_leitura: 'L4', nivel_escrita: 'E4' },
  ];

  it('filtra pelo mês e mantém só a mais recente por aluno', () => {
    const result = pickLatestSondagemPerAlunoInMonth(rows, '2026-06');
    expect(result).toHaveLength(2);
    const a1 = result.find((r) => r.aluno_id === 'a1');
    expect(a1.nivel_leitura).toBe('L2');
    expect(result.some((r) => r.aluno_id === 'a3')).toBe(false);
  });

  it('retorna vazio sem registros no mês', () => {
    expect(pickLatestSondagemPerAlunoInMonth(rows, '2026-01')).toEqual([]);
  });
});

describe('countByNivel', () => {
  it('agrupa leitura na ordem pedagógica dos níveis', () => {
    const data = countByNivel(
      [
        { nivel_leitura: 'LEITOR FLUENTE' },
        { nivel_leitura: 'PRÉ – LEITOR 1' },
        { nivel_leitura: 'PRÉ – LEITOR 1' },
        { nivel_leitura: '' },
      ],
      'nivel_leitura',
      'Não informado'
    );
    expect(data[0].name).toBe('LEITOR FLUENTE');
    expect(data[1].name).toBe('PRÉ – LEITOR 1');
    expect(data[1].value).toBe(2);
    expect(data[data.length - 1].name).toBe('Não informado');
  });

  it('agrupa escrita com nível mais alto no topo', () => {
    const data = countByNivel(
      [
        { nivel_escrita: 'ALFABÉTICO' },
        { nivel_escrita: 'PRÉ-SILÁBICO' },
      ],
      'nivel_escrita'
    );
    expect(data[0].name).toBe('ALFABÉTICO');
    expect(data[1].name).toBe('PRÉ-SILÁBICO');
  });
});

describe('consolidateSondagensMes', () => {
  it('calcula leitura, escrita e alunos sem sondagem', () => {
    const sondagens = [
      { aluno_id: 'a1', data: '2026-06-10', nivel_leitura: 'L1', nivel_escrita: 'E1' },
      { aluno_id: 'a2', data: '2026-06-12', nivel_leitura: 'L1', nivel_escrita: 'E2' },
    ];
    const r = consolidateSondagensMes(sondagens, '2026-06', 4);
    expect(r.comSondagem).toBe(2);
    expect(r.semSondagem).toBe(2);
    expect(r.hasSondagens).toBe(true);
    expect(r.leituraData).toEqual([{ name: 'L1', value: 2 }]);
    expect(r.escritaData.map((d) => d.name).sort()).toEqual(['E1', 'E2']);
  });

  it('indica ausência de sondagens no mês', () => {
    const r = consolidateSondagensMes([], '2026-06', 10);
    expect(r.hasSondagens).toBe(false);
    expect(r.semSondagem).toBe(10);
  });
});
