export const INITIAL_EVENT_FORM_DATA = {
  titulo: '',
  descricao: '',
  data_inicio: '',
  hora_inicio: '08:00',
  data_fim: '',
  hora_fim: '09:00',
  cor_etiqueta: '#3498DB',
  anexo_nome: '',
  anexo_file: null,
  recorrencia_tipo: 'nenhuma',
  recorrencia_ate: '',
  incluir_sabado: false,
  incluir_domingo: false,
};

export const RECORRENCIA_OPCOES = [
  { value: 'nenhuma', label: 'Não repetir' },
  { value: 'diaria', label: 'Diariamente' },
  { value: 'semanal', label: 'Semanalmente' },
  { value: 'mensal', label: 'Mensalmente' },
];
