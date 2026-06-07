import { describe, expect, it } from 'vitest';
import {
  buildSondagemImportKey,
  getSondagemPersistenceAction,
  normalizeExtractedSondagens,
} from './sondagemImport';

describe('normalizeExtractedSondagens', () => {
  it('preserva a ordem original do array quando nao ha ordem explicita', () => {
    const result = normalizeExtractedSondagens([
      { nome_completo: 'Maria' },
      { nome_completo: 'Joao' },
      { nome_completo: 'Ana' },
    ]);

    expect(result.map((item) => item.nome_completo)).toEqual(['Maria', 'Joao', 'Ana']);
    expect(result.map((item) => item.ordem_ficha)).toEqual([1, 2, 3]);
  });

  it('ordena pela ordem da ficha quando o campo existe', () => {
    const result = normalizeExtractedSondagens([
      { nome_completo: 'Joao', ordem: 2 },
      { nome_completo: 'Ana', ordem_ficha: 3 },
      { nome_completo: 'Maria', linha: 1 },
    ]);

    expect(result.map((item) => item.nome_completo)).toEqual(['Maria', 'Joao', 'Ana']);
    expect(result.map((item) => item.ordem_ficha)).toEqual([1, 2, 3]);
  });
});

describe('getSondagemPersistenceAction', () => {
  it('retorna update quando ja existe registro e sobrescrita esta habilitada', () => {
    const existingKeys = new Set([buildSondagemImportKey('aluno-1', '2026-06-07')]);

    expect(
      getSondagemPersistenceAction({
        alunoId: 'aluno-1',
        dataSondagem: '2026-06-07',
        overwriteExisting: true,
        existingKeys,
      }),
    ).toBe('update');
  });

  it('nao atualiza registro existente quando sobrescrita esta desabilitada', () => {
    const existingKeys = new Set([buildSondagemImportKey('aluno-1', '2026-06-07')]);

    expect(
      getSondagemPersistenceAction({
        alunoId: 'aluno-1',
        dataSondagem: '2026-06-07',
        overwriteExisting: false,
        existingKeys,
      }),
    ).toBe('skip-existing');
  });
});
