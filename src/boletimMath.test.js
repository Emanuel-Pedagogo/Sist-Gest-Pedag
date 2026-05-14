import { describe, it, expect } from 'vitest';
import { toNum, computeMF, isAprovado } from './boletimMath';

describe('toNum (teste de robustez)', () => {
  it('trata null/undefined/vazio como null', () => {
    expect(toNum(null)).toBeNull();
    expect(toNum(undefined)).toBeNull();
    expect(toNum('')).toBeNull();
  });

  it('converte strings numéricas e números', () => {
    expect(toNum('5')).toBe(5);
    expect(toNum('5.5')).toBe(5.5);
    expect(toNum(0)).toBe(0);
    expect(toNum(-3)).toBe(-3);
  });

  it('rejeita NaN/Infinity e lixo', () => {
    expect(toNum(NaN)).toBeNull();
    expect(toNum(Infinity)).toBeNull();
    expect(toNum(-Infinity)).toBeNull();
    expect(toNum('abc')).toBeNull();
    expect(toNum({})).toBeNull();
    expect(toNum([])).toBe(0); // Number([]) === 0 (documenta comportamento do JS)
  });
});

describe('computeMF (tentando quebrar)', () => {
  it('retorna null se faltar qualquer bimestre', () => {
    expect(computeMF({ b1: 10, b2: 10, b3: 10, b4: null })).toBeNull();
    expect(computeMF({ b1: '', b2: 10, b3: 10, b4: 10 })).toBeNull();
  });

  it('retorna null com tipos errados/valores não finitos', () => {
    expect(computeMF({ b1: 10, b2: 10, b3: 10, b4: Infinity })).toBeNull();
    expect(computeMF({ b1: 10, b2: 10, b3: {}, b4: 10 })).toBeNull();
  });

  it('calcula sem recuperação (pesos 2/3/2/3)', () => {
    // (b1*2 + b2*3 + b3*2 + b4*3)/10
    expect(computeMF({ b1: 10, b2: 0, b3: 10, b4: 0 })).toBe((20 + 0 + 20 + 0) / 10);
  });

  it('RS1 substitui a menor nota entre B1/B2 com o peso correto', () => {
    // B1 menor (peso 2) -> RS1 entra com peso 2; B2 mantém peso 3
    const mf1 = computeMF({ b1: 2, b2: 9, b3: 10, b4: 10, rs1: 10 });
    expect(mf1).toBe(((9 * 3 + 10 * 2) + (10 * 2 + 10 * 3)) / 10);

    // B2 menor (peso 3) -> RS1 entra com peso 3; B1 mantém peso 2
    const mf2 = computeMF({ b1: 9, b2: 2, b3: 10, b4: 10, rs1: 10 });
    expect(mf2).toBe(((9 * 2 + 10 * 3) + (10 * 2 + 10 * 3)) / 10);
  });

  it('RS2 substitui a menor nota entre B3/B4 com o peso correto', () => {
    const mf = computeMF({ b1: 10, b2: 10, b3: 2, b4: 9, rs2: 10 });
    expect(mf).toBe(((10 * 2 + 10 * 3) + (9 * 3 + 10 * 2)) / 10);
  });

  it('não muta o objeto de entrada (evita bugs em condições concorrentes)', async () => {
    const input = Object.freeze({ b1: '9', b2: '8', b3: '7', b4: '6', rs1: '10', rs2: '10' });
    const runs = Array.from({ length: 200 }, () => Promise.resolve().then(() => computeMF(input)));
    const results = await Promise.all(runs);
    expect(new Set(results).size).toBe(1);
  });

  it('aguenta valores extremos sem explodir (resultado finito ou null)', () => {
    const mf = computeMF({ b1: Number.MAX_VALUE, b2: Number.MAX_VALUE, b3: Number.MAX_VALUE, b4: Number.MAX_VALUE });
    // Pode virar Infinity dependendo da soma; nesse caso a função deve devolver null
    expect(mf === null || Number.isFinite(mf)).toBe(true);
  });
});

describe('isAprovado (tentando quebrar)', () => {
  it('retorna null para entradas inválidas', () => {
    expect(isAprovado(null)).toBeNull();
    expect(isAprovado(undefined)).toBeNull();
    expect(isAprovado({})).toBeNull();
  });

  it('retorna null se nada for calculável', () => {
    expect(isAprovado([null, undefined, '', 'abc', NaN])).toBeNull();
  });

  it('retorna true/false corretamente', () => {
    expect(isAprovado([5, 6, 10])).toBe(true);
    expect(isAprovado([5, 4.9999, 10])).toBe(false);
  });
});

