export const evaluateStudentColor = (tagConfig, data) => {
  let newColor = 'azul'; // Cor padrão (Adequado)
  
  // Avalia na ordem de prioridade: Roxo > Vermelho > Amarelo > Verde > Azul
  const colorsOrder = ['roxo', 'vermelho', 'amarelo', 'verde', 'azul'];
  
  for (const cor of colorsOrder) {
    const criteria = tagConfig[cor];
    if (!criteria) continue;
    
    let matches = false;
    
    // Verifica notas (se tiver nota_min e nota_max, verifica se a média ou alguma nota cai no range)
    if (criteria.notaMin !== '' && criteria.notaMax !== '' && data.notas && data.notas.length > 0) {
      const media = data.notas.reduce((a, b) => a + b, 0) / data.notas.length;
      if (media >= parseFloat(criteria.notaMin) && media <= parseFloat(criteria.notaMax)) {
        matches = true;
      }
    }
    
    // Verifica sondagem
    if (data.sondagem) {
      if (criteria.niveisLeitura && criteria.niveisLeitura.length > 0 && criteria.niveisLeitura.includes(data.sondagem.nivel_leitura?.toUpperCase())) {
        matches = true;
      }
      if (criteria.niveisEscrita && criteria.niveisEscrita.length > 0 && criteria.niveisEscrita.includes(data.sondagem.nivel_escrita?.toUpperCase())) {
        matches = true;
      }
    }
    
    // Verifica ocorrencias
    if (criteria.tiposOcorrencia && criteria.tiposOcorrencia.length > 0 && data.ocorrencias && data.ocorrencias.some(tipo => criteria.tiposOcorrencia.includes(tipo))) {
      matches = true;
    }
    
    if (matches) {
      newColor = cor;
      break; // Para na primeira cor que der match (maior prioridade)
    }
  }
  
  return newColor;
};
