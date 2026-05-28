import React from 'react';
import { formatEtiquetaMotivoTexto } from '../utils/studentColorEvaluator';

const subtitleStyle = { fontSize: '0.8em', color: 'gray' };

function nomeResponsavel(aluno) {
  return aluno?.responsavel || aluno?.nome_responsavel || 'Não informado';
}

function formatDataNascimento(iso) {
  if (!iso) return 'Não informada';
  const parte = String(iso).split('T')[0];
  const [y, m, d] = parte.split('-');
  if (!y || !m || !d) return 'Não informada';
  return `${d}/${m}/${y}`;
}

/**
 * Linha secundária da lista de alunos.
 */
export default function AlunoListSubtitle({
  aluno,
  showTurma = false,
  turmaNome,
  turmaEspecial = false,
  turmaRegularNome,
  professorNome,
}) {
  const partes = [];

  if (turmaEspecial && turmaRegularNome) {
    partes.push(`Turma regular: ${turmaRegularNome}`);
  }
  if (showTurma && turmaNome) {
    partes.push(`Turma: ${turmaNome}`);
  }
  if (aluno?.matricula) {
    partes.push(`Matrícula: ${aluno.matricula}`);
  }

  partes.push(`Responsável: ${nomeResponsavel(aluno)}`);
  partes.push(`Professora: ${professorNome || 'Não informada'}`);
  partes.push(`Nascimento: ${formatDataNascimento(aluno?.data_nascimento)}`);

  const etiquetaMotivo = formatEtiquetaMotivoTexto(aluno);
  if (etiquetaMotivo) partes.push(etiquetaMotivo);

  return <div style={subtitleStyle}>{partes.join(' • ')}</div>;
}
