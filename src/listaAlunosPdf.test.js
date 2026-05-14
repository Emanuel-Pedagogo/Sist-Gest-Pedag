import { describe, it, expect } from 'vitest';
import { parseLinhasListaAlunos, dataBrParaIso } from './listaAlunosPdf';

describe('dataBrParaIso', () => {
  it('converte DD/MM/AAAA', () => {
    expect(dataBrParaIso('31/10/2011')).toBe('2011-10-31');
  });
});

describe('parseLinhasListaAlunos', () => {
  it('lê lista com cabeçalho SEMED (linhas)', () => {
    const texto = `LISTA DE ALUNOS
Mat. Coletor Nome Data Nascimento Responsável/Filiação
70 ADRIELE BEATRIZ SOUZA FREIRE 31/10/2011 Alcione Nascimento Sousa (Mãe)
156 CARLOS EDUARDO DA COSTA DE JESUS 10/02/2012 Erivalda Da Costa De Jesus (Mãe)
112 LUNA ARIELA TEIXEIRA CORREA 06/09/2012 Nenhum responsável
`;
    const rows = parseLinhasListaAlunos(texto);
    expect(rows.length).toBe(3);
    expect(rows[0].matriculaColetor).toBe('70');
    expect(rows[0].nome).toContain('ADRIELE');
    expect(rows[0].data_nascimento).toBe('2011-10-31');
    expect(rows[2].nome_responsavel).toBeNull();
  });
});
