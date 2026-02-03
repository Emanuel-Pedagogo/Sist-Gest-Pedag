import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import BoletimView from './BoletimView';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentTab, setCurrentTab] = useState('resumo');

  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState(null);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState(null);
  const [turmaEtiquetasCount, setTurmaEtiquetasCount] = useState({}); // { turmaId: { verde: 0, amarelo: 0, vermelho: 0, azul: 0 } }

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);

  const [occurrences, setOccurrences] = useState([]);
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);
  const [occurrencesError, setOccurrencesError] = useState(null);

  const [totalRisco, setTotalRisco] = useState(0);
  const [totalAtencao, setTotalAtencao] = useState(0);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'Pedagógico',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    descricao: '',
  });
  const [savingOccurrence, setSavingOccurrence] = useState(false);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    disciplina: '',
    periodo: '',
    ano: new Date().getFullYear(),
    valor: '',
  });
  const [savingNote, setSavingNote] = useState(false);

  const [frequencyHistory, setFrequencyHistory] = useState([]);
  const [frequencyLoading, setFrequencyLoading] = useState(false);
  const [frequencyError, setFrequencyError] = useState(null);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [frequencyFormData, setFrequencyFormData] = useState({
    mes_referencia: '',
    ano: new Date().getFullYear(),
    porcentagem: '',
  });
  const [savingFrequency, setSavingFrequency] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Escola ativa (Polo por padrão)
  const [activeSchoolId, setActiveSchoolId] = useState(null);
  const [activeSchool, setActiveSchool] = useState(null);

  // Ano letivo selecionado (padrão: ano atual)
  const [selectedYear, setSelectedYear] = useState(2026);

  // Modais e formulários de CRUD
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [schoolFormData, setSchoolFormData] = useState({
    nome: '',
    inep: '',
    endereco: '',
    tipo: 'Polo',
  });
  const [savingSchool, setSavingSchool] = useState(false);

  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classFormData, setClassFormData] = useState({
    nome: '',
    ano: [], // Array para suportar turmas multisseriadas
    codigo: '',
    professor_regente: '',
    aluno_representante: '',
    escola_id: '',
    ano_letivo: 2026,
  });
  const [savingClass, setSavingClass] = useState(false);
  const [classSearchTerm, setClassSearchTerm] = useState('');

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    nome: '',
    data_nascimento: '',
    turma_id: '',
    etiqueta_cor: 'azul',
    matricula: '',
    nome_responsavel: '',
    contato: '',
    aee_deficiencia: '',
    aee_cid: '',
    motivo_etiqueta: '',
  });

  // Dados AEE para a aba específica
  const [aeeFormData, setAeeFormData] = useState({
    aee_tem_laudo: false,
    aee_mediadora: '',
    aee_plano_individual: '',
  });
  const [savingAEE, setSavingAEE] = useState(false);

  // Estados para gerenciamento de documentos AEE
  const [aeeDocuments, setAeeDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Estados para Agenda e Planejamento
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState(null);
  const [agendaView, setAgendaView] = useState('month'); // 'month', 'week', 'day'
  const [agendaFilterNivel, setAgendaFilterNivel] = useState('');
  const [agendaFilterTurma, setAgendaFilterTurma] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventFormData, setEventFormData] = useState({
    titulo: '',
    descricao: '',
    data_inicio: '',
    hora_inicio: '08:00',
    data_fim: '',
    hora_fim: '09:00',
    cor_etiqueta: '#3498DB',
    anexo_nome: '',
    anexo_file: null, // Arquivo selecionado para upload
  });
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [todayEvents, setTodayEvents] = useState([]);
  const [eventAnexos, setEventAnexos] = useState([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setCurrentView('dashboard');
    // A escola Polo será carregada pelo useEffect de escolas
  };

  const navigate = (viewId) => {
    setCurrentView(viewId);
  };

  const selectSchool = (school) => {
    setSelectedSchool(school.nome);
    setSelectedSchoolId(school.id);
    setCurrentView('classes');
  };

  const selectClass = (turma) => {
    setSelectedClassId(turma.id);
    setSelectedClassName(turma.nome);
    // Mantém a aba Turmas selecionada; a lista de alunos da turma será exibida na própria view de turmas
  };

  const selectStudent = (aluno) => {
    setSelectedStudentId(aluno.id);
    setSelectedStudent(aluno);
    setCurrentTab('resumo');
    setCurrentView('student-detail');
    // Carregar dados AEE se existirem
    setAeeFormData({
      aee_tem_laudo: aluno.aee_tem_laudo || false,
      aee_mediadora: aluno.aee_mediadora || '',
      aee_plano_individual: aluno.aee_plano_individual || '',
    });
  };


  const switchTab = (tabName) => {
    setCurrentTab(tabName);
  };

  const getPageTitle = () => {
    const titles = {
      dashboard: 'Visão Geral',
      agenda: 'Agenda e Planejamento',
      schools: 'Gestão de Escolas',
      classes: 'Gestão de Turmas',
      students: 'Gestão de Alunos',
      'student-detail': 'Detalhes do Aluno',
      reports: 'Relatórios',
      settings: 'Configurações',
    };
    if (currentView === 'classes' && selectedSchool) {
      return `Gestão de Turmas - ${selectedSchool}`;
    }
    return titles[currentView] || 'SACP';
  };

  const getActiveNav = () => {
    if (currentView === 'student-detail') return 'students';
    return currentView;
  };

  // Função helper para formatar exibição dos anos escolares
  const formatAnosEscolares = (anoEscolar) => {
    if (!anoEscolar) return 'Ano não informado';
    
    // Se for array (turma multisseriada)
    if (Array.isArray(anoEscolar)) {
      if (anoEscolar.length === 0) return 'Ano não informado';
      if (anoEscolar.length <= 3) {
        return anoEscolar.join(', ');
      } else {
        // Mostrar os 3 primeiros e indicar que há mais
        const primeiros = anoEscolar.slice(0, 3).join(', ');
        return `Multisseriada (${primeiros}...)`;
      }
    }
    
    // Se for string (compatibilidade com dados antigos)
    return anoEscolar;
  };

  // Carregar escolas quando logado
  useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);
      const { data, error } = await supabase.from('escolas').select('*');
      if (error) {
        setSchoolsError('Erro ao carregar escolas.');
      } else {
        setSchools(data || []);
        // Se não há escola ativa, buscar Polo
        if (!activeSchoolId && data && data.length > 0) {
          const poloSchool = data.find((s) => s.tipo_estrutura === 'Polo');
          if (poloSchool) {
            setActiveSchoolId(poloSchool.id);
            setActiveSchool(poloSchool);
          } else if (data.length > 0) {
            // Se não há Polo, usar a primeira escola
            setActiveSchoolId(data[0].id);
            setActiveSchool(data[0]);
          }
        }
      }
      setSchoolsLoading(false);
    };

    if (isLoggedIn) {
      fetchSchools();
    }
  }, [isLoggedIn]);

  // Carregar turmas quando a view de turmas for aberta e houver uma escola ativa
  useEffect(() => {
    const fetchClasses = async () => {
      const schoolId = activeSchoolId || selectedSchoolId;
      if (!schoolId) return;
      setClassesLoading(true);
      setClassesError(null);
      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .eq('escola_id', schoolId)
        .eq('ano_letivo', selectedYear);
      if (error) {
        setClassesError('Erro ao carregar turmas.');
      } else {
        setClasses(data || []);
        // Buscar contagem de etiquetas para cada turma
        const counts = {};
        if (data && data.length > 0) {
          for (const turma of data) {
            const { data: alunos } = await supabase
              .from('alunos')
              .select('etiqueta_cor')
              .eq('turma_id', turma.id);
            counts[turma.id] = {
              verde: alunos?.filter((a) => a.etiqueta_cor === 'verde').length || 0,
              amarelo: alunos?.filter((a) => a.etiqueta_cor === 'amarelo').length || 0,
              vermelho: alunos?.filter((a) => a.etiqueta_cor === 'vermelho').length || 0,
              azul: alunos?.filter((a) => a.etiqueta_cor === 'azul').length || 0,
            };
          }
        }
        setTurmaEtiquetasCount(counts);
      }
      setClassesLoading(false);
    };

    // Carregar turmas na view Turmas ou na view Alunos (para o modal de novo aluno ter a lista de turmas)
    if ((currentView === 'classes' || currentView === 'students') && (activeSchoolId || selectedSchoolId)) {
      fetchClasses();
    }
  }, [currentView, activeSchoolId, selectedSchoolId, selectedYear]);

  // Recarregar turmas quando escola ativa mudar (Turmas ou Alunos, para o modal ter lista)
  useEffect(() => {
    if (activeSchoolId && (currentView === 'classes' || currentView === 'students')) {
      const fetchClasses = async () => {
        setClassesLoading(true);
        const { data, error } = await supabase
          .from('turmas')
          .select('*')
          .eq('escola_id', activeSchoolId)
          .eq('ano_letivo', selectedYear);
        if (!error && data) {
          setClasses(data);
          // Buscar contagem de etiquetas para cada turma
          const counts = {};
          for (const turma of data) {
            const { data: alunos } = await supabase
              .from('alunos')
              .select('etiqueta_cor')
              .eq('turma_id', turma.id);
            counts[turma.id] = {
              verde: alunos?.filter((a) => a.etiqueta_cor === 'verde').length || 0,
              amarelo: alunos?.filter((a) => a.etiqueta_cor === 'amarelo').length || 0,
              vermelho: alunos?.filter((a) => a.etiqueta_cor === 'vermelho').length || 0,
              azul: alunos?.filter((a) => a.etiqueta_cor === 'azul').length || 0,
            };
          }
          setTurmaEtiquetasCount(counts);
        }
        setClassesLoading(false);
      };
      fetchClasses();
    }
  }, [activeSchoolId, selectedYear, currentView]);

  // Recarregar alunos quando escola ativa mudar
  useEffect(() => {
    if (activeSchoolId && currentView === 'students' && !selectedClassId) {
      const fetchStudents = async () => {
        setStudentsLoading(true);
        const { data: turmas } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', activeSchoolId)
          .eq('ano_letivo', selectedYear);
        
        if (turmas && turmas.length > 0) {
          const turmaIds = turmas.map((t) => t.id);
          const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .in('turma_id', turmaIds);
          
          if (!error && data) {
            setStudents(data);
          }
        }
        setStudentsLoading(false);
      };
      fetchStudents();
    }
  }, [activeSchoolId, currentView, selectedClassId, selectedYear]);

  // Carregar alunos quando a view de alunos for aberta
  useEffect(() => {
    const fetchStudents = async () => {
      const schoolId = activeSchoolId || selectedSchoolId;
      if (!schoolId && !selectedClassId) return;
      
      setStudentsLoading(true);
      setStudentsError(null);
      
      let query;
      
      if (selectedClassId) {
        // Se há turma selecionada, filtrar por turma
        query = supabase.from('alunos').select('*').eq('turma_id', selectedClassId);
      } else if (schoolId) {
        // Se há escola ativa, buscar turmas da escola do ano selecionado e depois alunos
        const { data: turmas } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', schoolId)
          .eq('ano_letivo', selectedYear);
        
        if (turmas && turmas.length > 0) {
          const turmaIds = turmas.map((t) => t.id);
          query = supabase.from('alunos').select('*').in('turma_id', turmaIds);
        } else {
          setStudents([]);
          setStudentsLoading(false);
          return;
        }
      } else {
        setStudentsLoading(false);
        return;
      }
      
      const { data, error } = await query;
      
      if (error) {
        setStudentsError('Erro ao carregar alunos.');
      } else {
        setStudents(data || []);
      }
      setStudentsLoading(false);
    };

    if (currentView === 'students' || (currentView === 'classes' && selectedClassId)) {
      fetchStudents();
    }
  }, [currentView, activeSchoolId, selectedSchoolId, selectedClassId, selectedYear]);

  // Carregar dados do Dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      setDashboardLoading(true);
      try {
        // Buscar alunos da escola ativa
        const schoolId = activeSchoolId;
        if (!schoolId) {
          setDashboardLoading(false);
          return;
        }

        // Buscar turmas da escola do ano selecionado
        const { data: turmas } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', schoolId)
          .eq('ano_letivo', selectedYear);

        if (!turmas || turmas.length === 0) {
          setTotalAlunos(0);
          setTotalRisco(0);
          setTotalAtencao(0);
          setDashboardLoading(false);
          return;
        }

        const turmaIds = turmas.map((t) => t.id);
        const { data: alunos, error: alunosError } = await supabase
          .from('alunos')
          .select('id, etiqueta_cor')
          .in('turma_id', turmaIds);

        if (alunosError) {
          console.error('Erro ao carregar alunos:', alunosError);
          setDashboardLoading(false);
          return;
        }

        // Contar total de alunos
        setTotalAlunos(alunos?.length || 0);

        // Contar alunos em risco (vermelho)
        const risco = alunos?.filter((a) => a.etiqueta_cor === 'vermelho').length || 0;
        setTotalRisco(risco);

        // Contar alunos em atenção (amarelo)
        const atencao = alunos?.filter((a) => a.etiqueta_cor === 'amarelo').length || 0;
        setTotalAtencao(atencao);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setDashboardLoading(false);
      }
    };

    if (currentView === 'dashboard' && activeSchoolId) {
      fetchDashboardData();
      loadTodayEvents();
    }
  }, [currentView, activeSchoolId, selectedYear]);

  // Carregar eventos da agenda quando a view de agenda for aberta
  useEffect(() => {
    if (currentView === 'agenda' && activeSchoolId) {
      loadAgendaEvents();
    }
  }, [currentView, activeSchoolId, selectedYear]);

  // Carregar eventos do dia no Dashboard
  useEffect(() => {
    if (currentView === 'dashboard' && activeSchoolId) {
      loadTodayEvents();
    }
  }, [currentView, activeSchoolId, selectedYear]);

  // Carregar anexos quando abrir modal de edição
  useEffect(() => {
    if (showEventModal && editingEvent?.id) {
      loadEventAnexos(editingEvent.id);
    } else {
      setEventAnexos([]);
    }
  }, [showEventModal, editingEvent?.id]);

  // Carregar ocorrências quando a view de detalhes do aluno for aberta
  useEffect(() => {
    const fetchOccurrences = async () => {
      if (!selectedStudentId) return;
      setOccurrencesLoading(true);
      setOccurrencesError(null);
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('*')
        .eq('aluno_id', selectedStudentId);
      if (error) {
        setOccurrencesError('Erro ao carregar ocorrências.');
      } else {
        setOccurrences(data || []);
      }
      setOccurrencesLoading(false);
    };

    if (currentView === 'student-detail' && selectedStudentId) {
      fetchOccurrences();
    }
  }, [currentView, selectedStudentId]);

  // Carregar notas quando a view de detalhes do aluno for aberta
  useEffect(() => {
    const fetchNotes = async () => {
      if (!selectedStudentId) return;
      setNotesLoading(true);
      setNotesError(null);
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', selectedStudentId)
        .order('ano', { ascending: false })
        .order('periodo', { ascending: true });
      if (error) {
        setNotesError('Erro ao carregar notas.');
      } else {
        setNotes(data || []);
      }
      setNotesLoading(false);
    };

    if (currentView === 'student-detail' && selectedStudentId) {
      fetchNotes();
    }
  }, [currentView, selectedStudentId]);

  // Carregar histórico de frequência quando a view de detalhes do aluno for aberta
  useEffect(() => {
    const fetchFrequencyHistory = async () => {
      if (!selectedStudentId) return;
      setFrequencyLoading(true);
      setFrequencyError(null);
      const { data, error } = await supabase
        .from('frequencia_historico')
        .select('*')
        .eq('aluno_id', selectedStudentId)
        .order('ano', { ascending: false })
        .order('mes_referencia', { ascending: false });
      if (error) {
        setFrequencyError('Erro ao carregar histórico de frequência.');
      } else {
        setFrequencyHistory(data || []);
      }
      setFrequencyLoading(false);
    };

    if (currentView === 'student-detail' && selectedStudentId) {
      fetchFrequencyHistory();
    }
  }, [currentView, selectedStudentId]);

  // Carregar documentos AEE quando a aba AEE for aberta
  useEffect(() => {
    if (currentTab === 'aee' && selectedStudentId) {
      loadAeeDocuments();
    }
  }, [currentTab, selectedStudentId]);

  const getBadgeColorClass = (etiquetaCor) => {
    if (etiquetaCor === 'roxo') return 'bg-purple';
    switch (etiquetaCor) {
      case 'vermelho':
        return 'bg-red';
      case 'amarelo':
        return 'bg-yellow';
      case 'azul':
        return 'bg-blue';
      case 'verde':
        return 'bg-green';
      default:
        return 'bg-blue';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sem data';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const handleSaveOccurrence = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSavingOccurrence(true);
    const { data, error } = await supabase.from('ocorrencias').insert([
      {
        aluno_id: selectedStudentId,
        titulo: formData.titulo,
        tipo: formData.tipo,
        data_ocorrencia: formData.data_ocorrencia,
        descricao: formData.descricao,
      },
    ]);

    if (error) {
      alert('Erro ao salvar ocorrência: ' + error.message);
      setSavingOccurrence(false);
    } else {
      // Fechar modal e limpar formulário
      setShowModal(false);
      setFormData({
        titulo: '',
        tipo: 'Pedagógico',
        data_ocorrencia: new Date().toISOString().split('T')[0],
        descricao: '',
      });
      setSavingOccurrence(false);

      // Recarregar ocorrências
      const { data: newData, error: fetchError } = await supabase
        .from('ocorrencias')
        .select('*')
        .eq('aluno_id', selectedStudentId);
      if (!fetchError) {
        setOccurrences(newData || []);
      }
    }
  };

  const handleCancelModal = () => {
    setShowModal(false);
    setFormData({
      titulo: '',
      tipo: 'Pedagógico',
      data_ocorrencia: new Date().toISOString().split('T')[0],
      descricao: '',
    });
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSavingNote(true);
    const { data, error } = await supabase.from('notas').insert([
      {
        aluno_id: selectedStudentId,
        disciplina: noteFormData.disciplina,
        periodo: noteFormData.periodo,
        ano: parseInt(noteFormData.ano),
        nota: parseFloat(noteFormData.valor),
      },
    ]);

    if (error) {
      alert('Erro ao salvar nota: ' + error.message);
      setSavingNote(false);
    } else {
      setShowNoteModal(false);
      setNoteFormData({
        disciplina: '',
        periodo: '',
        ano: new Date().getFullYear(),
        valor: '',
      });
      setSavingNote(false);

      // Recarregar notas
      const { data: newData, error: fetchError } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', selectedStudentId)
        .order('ano', { ascending: false })
        .order('periodo', { ascending: true });
      if (!fetchError) {
        setNotes(newData || []);
      }
    }
  };

  const handleCancelNoteModal = () => {
    setShowNoteModal(false);
    setNoteFormData({
      disciplina: '',
      periodo: '',
      ano: new Date().getFullYear(),
      valor: '',
    });
  };

  const handleSaveFrequency = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSavingFrequency(true);
    const { data, error } = await supabase.from('frequencia_historico').insert([
      {
        aluno_id: selectedStudentId,
        mes_referencia: frequencyFormData.mes_referencia,
        ano: parseInt(frequencyFormData.ano),
        porcentagem: parseFloat(frequencyFormData.porcentagem),
      },
    ]);

    if (error) {
      alert('Erro ao salvar histórico de frequência: ' + error.message);
      setSavingFrequency(false);
    } else {
      setShowFrequencyModal(false);
      setFrequencyFormData({
        mes_referencia: '',
        ano: new Date().getFullYear(),
        porcentagem: '',
      });
      setSavingFrequency(false);

      // Recarregar histórico
      const { data: newData, error: fetchError } = await supabase
        .from('frequencia_historico')
        .select('*')
        .eq('aluno_id', selectedStudentId)
        .order('ano', { ascending: false })
        .order('mes_referencia', { ascending: false });
      if (!fetchError) {
        setFrequencyHistory(newData || []);
      }
    }
  };

  const handleCancelFrequencyModal = () => {
    setShowFrequencyModal(false);
    setFrequencyFormData({
      mes_referencia: '',
      ano: new Date().getFullYear(),
      porcentagem: '',
    });
  };

  // Agrupar notas por ano
  const groupNotesByYear = (notes) => {
    const grouped = {};
    notes.forEach((note) => {
      const year = note.ano;
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(note);
    });
    return grouped;
  };

  // Funções CRUD de Escolas
  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setSavingSchool(true);
    
    const schoolData = {
      nome: schoolFormData.nome,
      inep: schoolFormData.inep,
      endereco: schoolFormData.endereco,
      tipo_estrutura: schoolFormData.tipo,
    };

    let error;
    if (editingSchool) {
      const { error: updateError } = await supabase
        .from('escolas')
        .update(schoolData)
        .eq('id', editingSchool.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('escolas').insert([schoolData]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar escola: ' + error.message);
      setSavingSchool(false);
    } else {
      const editedId = editingSchool?.id;
      setShowSchoolModal(false);
      setEditingSchool(null);
      setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
      setSavingSchool(false);
      
      // Recarregar escolas e atualizar seletor / escola ativa
      const { data: newData } = await supabase.from('escolas').select('*');
      if (newData) {
        setSchools(newData);
        if (editedId != null && editedId === activeSchoolId) {
          const updated = newData.find((s) => String(s.id) === String(editedId));
          if (updated) {
            setActiveSchool(updated);
          }
        }
      }
    }
  };

  const handleEditSchool = (school) => {
    setEditingSchool(school);
    setSchoolFormData({
      nome: school.nome || '',
      inep: school.inep || '',
      endereco: school.endereco || '',
      tipo: school.tipo_estrutura || 'Polo',
    });
    setShowSchoolModal(true);
  };

  const handleDeleteSchool = async (schoolId) => {
    if (!confirm('Tem certeza que deseja excluir esta escola?')) return;
    
    const { error } = await supabase.from('escolas').delete().eq('id', schoolId);
    
    if (error) {
      alert('Erro ao excluir escola: ' + error.message);
    } else {
      // Recarregar escolas
      const { data: newData } = await supabase.from('escolas').select('*');
      if (newData) {
        setSchools(newData);
        // Se era a escola ativa, buscar Polo novamente
        if (schoolId === activeSchoolId) {
          const poloSchool = newData.find((s) => s.tipo_estrutura === 'Polo');
          if (poloSchool) {
            setActiveSchoolId(poloSchool.id);
            setActiveSchool(poloSchool);
          } else {
            setActiveSchoolId(null);
            setActiveSchool(null);
          }
        }
      }
    }
  };

  const handleChangeActiveSchool = (schoolId) => {
    if (schoolId == null || schoolId === '') return;
    const school = schools.find((s) => String(s.id) === String(schoolId));
    if (school) {
      setActiveSchoolId(school.id);
      setActiveSchool(school);
      // Turmas e alunos serão recarregados pelos useEffects ao mudar activeSchoolId
    }
  };

  // Função para gerar sugestão de nome da turma baseado nos anos selecionados
  const generateTurmaNome = (anos) => {
    if (!anos || anos.length === 0) return '';
    if (anos.length === 1) {
      return anos[0];
    } else if (anos.length === 2) {
      return `Bisseriada (${anos.join(', ')})`;
    } else {
      return `Multisseriada (${anos.join(', ')})`;
    }
  };

  // Funções CRUD de Turmas
  const handleSaveClass = async (e) => {
    e.preventDefault();
    const schoolId = classFormData.escola_id || activeSchoolId || selectedSchoolId;
    if (!schoolId) {
      alert('Selecione uma escola primeiro.');
      return;
    }

    if (!classFormData.ano || classFormData.ano.length === 0) {
      alert('Selecione pelo menos um ano escolar.');
      return;
    }

    setSavingClass(true);
    
    const classData = {
      nome: classFormData.nome || generateTurmaNome(classFormData.ano),
      ano_escolar: classFormData.ano,
      codigo: classFormData.codigo || null,
      professor_regente: classFormData.professor_regente,
      aluno_representante: classFormData.aluno_representante || null,
      escola_id: schoolId,
      ano_letivo: classFormData.ano_letivo || selectedYear,
    };

    let error;
    let updatedTurma = null;
    
    if (editingClass) {
      const { data: updatedData, error: updateError } = await supabase
        .from('turmas')
        .update(classData)
        .eq('id', editingClass.id)
        .select()
        .single();
      error = updateError;
      updatedTurma = updatedData;
    } else {
      const { data: insertedData, error: insertError } = await supabase
        .from('turmas')
        .insert([classData])
        .select()
        .single();
      error = insertError;
      updatedTurma = insertedData;
    }

    if (error) {
      alert('Erro ao salvar turma: ' + error.message);
      setSavingClass(false);
    } else {
      // Salvar o ID antes de limpar o estado
      const turmaId = editingClass?.id;
      const isEditing = !!editingClass;
      
      setShowClassModal(false);
      setEditingClass(null);
      setClassFormData({ nome: '', ano: [], codigo: '', professor_regente: '', aluno_representante: '', escola_id: activeSchoolId || '', ano_letivo: selectedYear });
      setSavingClass(false);
      
      // Atualizar estado imediatamente com os dados retornados
      if (updatedTurma) {
        // Garantir que ano_escolar seja um array
        const turmaComFormatoCorreto = {
          ...updatedTurma,
          ano_escolar: Array.isArray(updatedTurma.ano_escolar) 
            ? updatedTurma.ano_escolar 
            : updatedTurma.ano_escolar 
              ? [updatedTurma.ano_escolar] 
              : [],
        };
        
        if (isEditing && turmaId) {
          // Edição: substituir a turma antiga no array
          setClasses((prevClasses) => {
            const updated = prevClasses.map((t) => 
              String(t.id) === String(turmaId) ? turmaComFormatoCorreto : t
            );
            return updated;
          });
        } else {
          // Criação: adicionar nova turma ao array (apenas se for do ano letivo e escola corretos)
          if (turmaComFormatoCorreto.ano_letivo === selectedYear && String(turmaComFormatoCorreto.escola_id) === String(schoolId)) {
            setClasses((prevClasses) => {
              // Verificar se já existe para evitar duplicatas
              const exists = prevClasses.some((t) => String(t.id) === String(turmaComFormatoCorreto.id));
              if (!exists) {
                return [...prevClasses, turmaComFormatoCorreto];
              }
              return prevClasses;
            });
          }
        }
      } else {
        // Se não retornou dados, fazer fetch completo como fallback
        const { data: newData } = await supabase
          .from('turmas')
          .select('*')
          .eq('escola_id', schoolId)
          .eq('ano_letivo', selectedYear);
        if (newData) setClasses(newData);
      }
    }
  };

  const handleEditClass = (turma) => {
    setEditingClass(turma);
    // ano_escolar agora é um array (text[]), garantir que seja tratado como array
    const anosSelecionados = Array.isArray(turma.ano_escolar) 
      ? turma.ano_escolar 
      : turma.ano_escolar 
        ? [turma.ano_escolar] 
        : [];
    setClassFormData({
      nome: turma.nome || '',
      ano: anosSelecionados,
      codigo: turma.codigo || '',
      professor_regente: turma.professor_regente || '',
      aluno_representante: turma.aluno_representante || '',
      escola_id: turma.escola_id || '',
      ano_letivo: turma.ano_letivo || selectedYear,
    });
    setShowClassModal(true);
  };

  const handleDeleteClass = async (classId) => {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;
    
    const { error } = await supabase.from('turmas').delete().eq('id', classId);
    
    if (error) {
      alert('Erro ao excluir turma: ' + error.message);
    } else {
      // Recarregar turmas
      const schoolId = activeSchoolId || selectedSchoolId;
      if (schoolId) {
        const { data: newData } = await supabase
          .from('turmas')
          .select('*')
          .eq('escola_id', schoolId)
          .eq('ano_letivo', selectedYear);
        if (newData) setClasses(newData);
      }
    }
  };

  // Funções CRUD de Alunos
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentFormData.turma_id) {
      alert('Selecione uma turma.');
      return;
    }

    setSavingStudent(true);

    // Valores aceitos pela constraint alunos_etiqueta_cor_check no Supabase
    const ETIQUETAS_VALIDAS = ['azul', 'verde', 'amarelo', 'vermelho', 'roxo'];
    const etiquetaCorRaw = (studentFormData.etiqueta_cor || '').toLowerCase().trim();
    const etiquetaCor = ETIQUETAS_VALIDAS.includes(etiquetaCorRaw) ? etiquetaCorRaw : 'azul';

    const studentData = {
      nome: studentFormData.nome,
      data_nascimento: studentFormData.data_nascimento,
      turma_id: studentFormData.turma_id,
      etiqueta_cor: etiquetaCor,
      matricula: studentFormData.matricula || null,
      responsavel: studentFormData.nome_responsavel || null,
      contato: studentFormData.contato || null,
      aee_deficiencia: etiquetaCor === 'roxo' ? studentFormData.aee_deficiencia || null : null,
      aee_cid: etiquetaCor === 'roxo' ? studentFormData.aee_cid || null : null,
      motivo_etiqueta: etiquetaCor !== 'roxo' ? studentFormData.motivo_etiqueta || null : null,
    };

    let error;
    if (editingStudent) {
      const { error: updateError } = await supabase
        .from('alunos')
        .update(studentData)
        .eq('id', editingStudent.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('alunos').insert([studentData]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar aluno: ' + error.message);
      setSavingStudent(false);
    } else {
      setShowStudentModal(false);
      setEditingStudent(null);
      setStudentFormData({ nome: '', data_nascimento: '', turma_id: '', etiqueta_cor: 'azul', matricula: '', nome_responsavel: '', contato: '', aee_deficiencia: '', aee_cid: '', motivo_etiqueta: '' });
      setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
      setSavingStudent(false);
      
      // Recarregar alunos: se estiver na lista de uma turma (classes + selectedClassId), recarrega só essa turma
      if (currentView === 'classes' && selectedClassId) {
        const { data: newData } = await supabase
          .from('alunos')
          .select('*')
          .eq('turma_id', selectedClassId);
        if (newData) setStudents(newData);
      } else {
        const schoolId = activeSchoolId || selectedSchoolId;
        if (schoolId) {
          const { data: turmas } = await supabase
            .from('turmas')
            .select('id')
            .eq('escola_id', schoolId)
            .eq('ano_letivo', selectedYear);
          if (turmas && turmas.length > 0) {
            const turmaIds = turmas.map((t) => t.id);
            const { data: newData } = await supabase
              .from('alunos')
              .select('*')
              .in('turma_id', turmaIds);
            if (newData) setStudents(newData);
          }
        } else if (selectedClassId) {
          const { data: newData } = await supabase
            .from('alunos')
            .select('*')
            .eq('turma_id', selectedClassId);
          if (newData) setStudents(newData);
        }
      }
    }
  };

  const handleEditStudent = (aluno) => {
    setEditingStudent(aluno);
    setStudentFormData({
      nome: aluno.nome || '',
      data_nascimento: aluno.data_nascimento || '',
      turma_id: aluno.turma_id?.toString() || '',
      etiqueta_cor: (aluno.etiqueta_cor || 'azul').toLowerCase(),
      matricula: aluno.matricula || '',
      nome_responsavel: aluno.responsavel || '',
      contato: aluno.contato || '',
      aee_deficiencia: aluno.aee_deficiencia || '',
      aee_cid: aluno.aee_cid || '',
      motivo_etiqueta: aluno.motivo_etiqueta || '',
    });
    // Carregar dados AEE se existirem
    setAeeFormData({
      aee_tem_laudo: aluno.aee_tem_laudo || false,
      aee_mediadora: aluno.aee_mediadora || '',
      aee_plano_individual: aluno.aee_plano_individual || '',
    });
    setShowStudentModal(true);
  };

  // Função para salvar dados AEE
  const handleSaveAEE = async () => {
    if (!selectedStudentId) return;
    
    setSavingAEE(true);
    const { error } = await supabase
      .from('alunos')
      .update({
        aee_tem_laudo: aeeFormData.aee_tem_laudo,
        aee_mediadora: aeeFormData.aee_mediadora || null,
        aee_plano_individual: aeeFormData.aee_plano_individual || null,
      })
      .eq('id', selectedStudentId);
    
    if (error) {
      alert('Erro ao salvar dados AEE: ' + error.message);
    } else {
      alert('Dados AEE salvos com sucesso!');
      // Atualizar selectedStudent com os novos dados
      if (selectedStudent) {
        setSelectedStudent({
          ...selectedStudent,
          ...aeeFormData,
        });
      }
    }
    setSavingAEE(false);
  };

  // Função para carregar documentos AEE
  const loadAeeDocuments = async () => {
    if (!selectedStudentId) return;
    
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase.storage
        .from('documentos-aee')
        .list(selectedStudentId, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('Erro ao carregar documentos:', error);
        setAeeDocuments([]);
      } else {
        setAeeDocuments(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setAeeDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Função para fazer upload de documento
  const handleUploadDocument = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedStudentId) return;

    // Validar tipo de arquivo (PDF ou imagens)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Apenas arquivos PDF e imagens são permitidos.');
      return;
    }

    setUploadingDocument(true);
    try {
      const filePath = `${selectedStudentId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos-aee')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          alert('Um arquivo com este nome já existe. Renomeie o arquivo e tente novamente.');
        } else {
          alert('Erro ao fazer upload: ' + uploadError.message);
        }
      } else {
        // Recarregar lista de documentos
        await loadAeeDocuments();
      }
    } catch (error) {
      alert('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingDocument(false);
      // Limpar input
      event.target.value = '';
    }
  };

  // Função para excluir documento
  const handleDeleteDocument = async (fileName) => {
    if (!selectedStudentId || !confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const filePath = `${selectedStudentId}/${fileName}`;
      const { error } = await supabase.storage
        .from('documentos-aee')
        .remove([filePath]);

      if (error) {
        alert('Erro ao excluir documento: ' + error.message);
      } else {
        // Recarregar lista de documentos
        await loadAeeDocuments();
      }
    } catch (error) {
      alert('Erro ao excluir documento: ' + error.message);
    }
  };

  // Função para baixar/visualizar documento
  const handleDownloadDocument = async (fileName) => {
    if (!selectedStudentId) return;

    try {
      const filePath = `${selectedStudentId}/${fileName}`;
      const { data, error } = await supabase.storage
        .from('documentos-aee')
        .createSignedUrl(filePath, 60); // URL válida por 60 segundos

      if (error) {
        alert('Erro ao gerar link de download: ' + error.message);
      } else if (data) {
        // Abrir em nova aba
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      alert('Erro ao baixar documento: ' + error.message);
    }
  };

  // Funções CRUD de Agenda
  const loadAgendaEvents = async () => {
    setAgendaLoading(true);
    setAgendaError(null);
    try {
      let query = supabase.from('agenda_eventos').select('*');
      
      // Filtrar por escola (buscar eventos sem turma ou de turmas da escola)
      if (activeSchoolId) {
        // Buscar eventos da escola (turmas da escola ou eventos sem turma)
        const { data: turmas } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', activeSchoolId)
          .eq('ano_letivo', selectedYear);
        
        if (turmas && turmas.length > 0) {
          const turmaIds = turmas.map((t) => t.id);
          query = query.or(`turma_id.in.(${turmaIds.join(',')}),turma_id.is.null`);
        } else {
          query = query.is('turma_id', null);
        }
      }
      
      const { data, error } = await query.order('data_inicio', { ascending: true });
      
      if (error) {
        setAgendaError('Erro ao carregar eventos.');
      } else {
        setAgendaEvents(data || []);
      }
    } catch (error) {
      setAgendaError('Erro ao carregar eventos.');
    } finally {
      setAgendaLoading(false);
    }
  };

  const loadTodayEvents = async () => {
    if (!activeSchoolId) return;
    
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Buscar turmas da escola
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', activeSchoolId)
        .eq('ano_letivo', selectedYear);
      
      let query = supabase
        .from('agenda_eventos')
        .select('*')
        .gte('data_inicio', todayStart.toISOString())
        .lte('data_inicio', todayEnd.toISOString());
      
      if (turmas && turmas.length > 0) {
        const turmaIds = turmas.map((t) => t.id);
        query = query.or(`turma_id.in.(${turmaIds.join(',')}),turma_id.is.null`);
      } else {
        query = query.is('turma_id', null);
      }
      
      const { data } = await query.order('data_inicio', { ascending: true });
      setTodayEvents(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos do dia:', error);
      setTodayEvents([]);
    }
  };

  // Função helper para separar data e hora de uma string ISO
  const splitDateTime = (dateString) => {
    if (!dateString) return { date: '', time: '08:00' };
    try {
      // Garantir que estamos usando o objeto Date nativo, sem conversões intermediárias
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return { date: '', time: '08:00' };
      }
      
      // Formato de data: YYYY-MM-DD (usar métodos nativos do Date para evitar problemas de locale)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Formato de hora: HH:mm (arredondado para o intervalo de 30min mais próximo)
      const hours = date.getHours();
      const minutes = date.getMinutes();
      // Arredondar para 00 ou 30
      let roundedMinutes = minutes < 15 ? '00' : minutes < 45 ? '30' : '00';
      // Se minutos >= 45, incrementar hora (mas não passar de 22:30)
      let finalHours = hours;
      if (minutes >= 45 && hours < 22) {
        finalHours = hours + 1;
        roundedMinutes = '00';
      } else if (minutes >= 45 && hours >= 22) {
        finalHours = 22;
        roundedMinutes = '30';
      }
      const timeStr = `${String(finalHours).padStart(2, '0')}:${roundedMinutes}`;
      
      return { date: dateStr, time: timeStr };
    } catch (error) {
      console.error('Erro ao separar data/hora:', error, dateString);
      return { date: '', time: '08:00' };
    }
  };

  // Função helper para combinar data e hora em ISO string
  const combineDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date(dateStr);
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      if (isNaN(date.getTime())) return '';
      return date.toISOString();
    } catch (error) {
      console.error('Erro ao combinar data/hora:', error);
      return '';
    }
  };

  // Função para gerar opções de hora (intervalos de 30min)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour <= 22; hour++) {
      options.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < 22) {
        options.push(`${String(hour).padStart(2, '0')}:30`);
      }
    }
    return options;
  };

  // Função para sanitizar nome de arquivo (remover acentos, espaços e caracteres especiais)
  const sanitizeFileName = (fileName) => {
    if (!fileName) return '';
    
    // Separar nome e extensão
    const lastDotIndex = fileName.lastIndexOf('.');
    const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
    
    // Normalizar e remover acentos (NFD = Normalized Form Decomposed)
    let sanitized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
      .toLowerCase()
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .replace(/[^a-z0-9._-]/g, '') // Remove qualquer caractere que não seja letra, número, ponto, traço ou underscore
      .replace(/_{2,}/g, '_') // Remove underscores duplicados
      .replace(/^_+|_+$/g, ''); // Remove underscores no início e fim
    
    // Se o nome ficou vazio após sanitização, usar 'arquivo'
    if (!sanitized) {
      sanitized = 'arquivo';
    }
    
    return sanitized + extension;
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventFormData.titulo || !eventFormData.data_inicio) {
      alert('Preencha pelo menos o título e data de início.');
      return;
    }

    setSavingEvent(true);
    
    // Pega os valores puros dos inputs - data de início
    const [anoInicio, mesInicio, diaInicio] = eventFormData.data_inicio.split('-').map(Number);
    const [horaInicio, minutoInicio] = eventFormData.hora_inicio.split(':').map(Number);
    // Cria a data preservando o número exato que o usuário digitou (evita UTC no Brasil)
    const start = new Date(anoInicio, mesInicio - 1, diaInicio, horaInicio, minutoInicio);
    if (isNaN(start.getTime())) {
      alert('Data/hora de início inválida.');
      setSavingEvent(false);
      return;
    }
    const dataInicioISO = start.toISOString();

    // Data de fim (ou mesma de início se não informada)
    let dataFimISO;
    if (eventFormData.data_fim && eventFormData.hora_fim) {
      const [anoFim, mesFim, diaFim] = eventFormData.data_fim.split('-').map(Number);
      const [horaFim, minutoFim] = eventFormData.hora_fim.split(':').map(Number);
      const end = new Date(anoFim, mesFim - 1, diaFim, horaFim, minutoFim);
      dataFimISO = isNaN(end.getTime()) ? dataInicioISO : end.toISOString();
    } else {
      dataFimISO = dataInicioISO;
    }
    
    // Preparar dados do evento (sem anexo ainda)
    const eventData = {
      titulo: eventFormData.titulo,
      descricao: eventFormData.descricao || null,
      data_inicio: dataInicioISO,
      data_fim: dataFimISO,
      cor_etiqueta: eventFormData.cor_etiqueta,
      turma_id: null,
      nivel_planejamento: null,
      anexo_url: editingEvent?.anexo_url || null, // Manter anexo existente se não houver novo
    };

    // Criar ou atualizar evento primeiro para ter o ID
    let eventId;
    let error;
    if (editingEvent) {
      eventId = editingEvent.id;
      const { error: updateError } = await supabase
        .from('agenda_eventos')
        .update(eventData)
        .eq('id', editingEvent.id);
      error = updateError;
    } else {
      const { data: newEvent, error: insertError } = await supabase
        .from('agenda_eventos')
        .insert([eventData])
        .select()
        .single();
      error = insertError;
      if (!error && newEvent) {
        eventId = newEvent.id;
      }
    }

    // Se houver erro ou não conseguir obter ID, parar aqui
    if (error || !eventId) {
      alert('Erro ao salvar evento: ' + (error?.message || 'Erro desconhecido'));
      setSavingEvent(false);
      return;
    }

    // Upload de anexo se houver arquivo selecionado
    if (eventFormData.anexo_file) {
      try {
        const originalFileName = eventFormData.anexo_file.name;
        // Sanitizar o nome do arquivo para o upload
        const sanitizedFileName = sanitizeFileName(originalFileName);
        const fileName = `${Date.now()}_${sanitizedFileName}`;
        const filePath = `${eventId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('agenda-arquivos')
          .upload(filePath, eventFormData.anexo_file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          alert('Erro ao fazer upload do anexo: ' + uploadError.message);
          setSavingEvent(false);
          return;
        }

        // Obter URL pública do arquivo
        const { data: urlData } = supabase.storage
          .from('agenda-arquivos')
          .getPublicUrl(filePath);
        
        const anexoUrl = urlData?.publicUrl || filePath;

        // Atualizar evento com URL do anexo (caminho sanitizado) e nome original para exibição
        const { error: updateError } = await supabase
          .from('agenda_eventos')
          .update({ 
            anexo_url: anexoUrl,
            anexo_nome: originalFileName // Nome original para exibição bonita na tela
          })
          .eq('id', eventId);

        if (updateError) {
          console.warn('Erro ao atualizar URL do anexo:', updateError);
        }
      } catch (error) {
        console.error('Erro ao processar anexo:', error);
        alert('Erro no upload: ' + error.message);
        setSavingEvent(false);
        return;
      }
    }

    // Fechar modal e recarregar lista — NÃO alterar currentDate para o calendário manter o mês visível
    setShowEventModal(false);
    setEditingEvent(null);
    setEventFormData({
      titulo: '',
      descricao: '',
      data_inicio: '',
      hora_inicio: '08:00',
      data_fim: '',
      hora_fim: '09:00',
      cor_etiqueta: '#3498DB',
      anexo_nome: '',
      anexo_file: null,
    });
    setSavingEvent(false);
    await loadAgendaEvents();
    await loadTodayEvents();
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    
    const { error } = await supabase.from('agenda_eventos').delete().eq('id', eventId);
    
    if (error) {
      alert('Erro ao excluir evento: ' + error.message);
    } else {
      await loadAgendaEvents();
      await loadTodayEvents();
    }
  };

  const handleDeleteAgendaEvent = async () => {
    if (!editingEvent?.id) return;
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;

    const { error } = await supabase.from('agenda_eventos').delete().eq('id', editingEvent.id);

    if (error) {
      alert('Erro ao excluir evento: ' + error.message);
      return;
    }
    setAgendaEvents((prev) => prev.filter((ev) => ev.id !== editingEvent.id));
    setShowEventModal(false);
    setEditingEvent(null);
    await loadTodayEvents();
  };

  const handleUploadAnexo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Apenas arquivos PDF e imagens são permitidos.');
      return;
    }

    setUploadingAnexo(true);
    try {
      // Se estiver editando, usar o ID do evento. Se não, criar um evento temporário primeiro
      let eventId = editingEvent?.id;
      
      if (!eventId) {
        // Criar evento temporário para ter um ID
        const tempDataInicio = combineDateTime(eventFormData.data_inicio || new Date().toISOString().split('T')[0], eventFormData.hora_inicio || '08:00');
        const tempDataFim = eventFormData.data_fim 
          ? combineDateTime(eventFormData.data_fim, eventFormData.hora_fim || '09:00')
          : tempDataInicio;
        
        const tempEventData = {
          titulo: eventFormData.titulo || 'Temporário',
          descricao: eventFormData.descricao || '',
          data_inicio: tempDataInicio || new Date().toISOString(),
          data_fim: tempDataFim || tempDataInicio || new Date().toISOString(),
          nivel_planejamento: null,
          cor_etiqueta: eventFormData.cor_etiqueta,
          turma_id: null,
        };
        
        const { data: newEvent, error: createError } = await supabase
          .from('agenda_eventos')
          .insert([tempEventData])
          .select()
          .single();
        
        if (createError || !newEvent) {
          alert('Erro ao criar evento para anexo: ' + (createError?.message || 'Erro desconhecido'));
          setUploadingAnexo(false);
          return;
        }
        
        eventId = newEvent.id;
        setEditingEvent(newEvent);
      }

      const filePath = `${eventId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('agenda-arquivos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          alert('Um arquivo com este nome já existe. Renomeie o arquivo e tente novamente.');
        } else {
          alert('Erro ao fazer upload: ' + uploadError.message);
        }
      } else {
        await loadEventAnexos(eventId);
        alert('Anexo enviado com sucesso!');
      }
    } catch (error) {
      alert('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingAnexo(false);
      event.target.value = '';
    }
  };

  const handleDeleteAnexo = async (fileName) => {
    if (!editingEvent || !confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      const filePath = `${editingEvent.id}/${fileName}`;
      const { error } = await supabase.storage
        .from('agenda-arquivos')
        .remove([filePath]);

      if (error) {
        alert('Erro ao excluir anexo: ' + error.message);
      } else {
        await loadEventAnexos(editingEvent.id);
        alert('Anexo excluído com sucesso!');
      }
    } catch (error) {
      alert('Erro ao excluir anexo: ' + error.message);
    }
  };

  const loadEventAnexos = async (eventId) => {
    if (!eventId) {
      setEventAnexos([]);
      return;
    }

    setLoadingAnexos(true);
    try {
      const { data, error } = await supabase.storage
        .from('agenda-arquivos')
        .list(eventId, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('Erro ao carregar anexos:', error);
        setEventAnexos([]);
      } else {
        setEventAnexos(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
      setEventAnexos([]);
    } finally {
      setLoadingAnexos(false);
    }
  };

  const handleDownloadAnexo = async (fileName) => {
    if (!editingEvent) return;

    try {
      const filePath = `${editingEvent.id}/${fileName}`;
      const { data, error } = await supabase.storage
        .from('agenda-arquivos')
        .createSignedUrl(filePath, 60);

      if (error) {
        alert('Erro ao gerar link: ' + error.message);
      } else if (data) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      alert('Erro ao baixar anexo: ' + error.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
    
    const { error } = await supabase.from('alunos').delete().eq('id', studentId);
    
    if (error) {
      alert('Erro ao excluir aluno: ' + error.message);
    } else {
      // Recarregar alunos
      const schoolId = activeSchoolId || selectedSchoolId;
      if (schoolId) {
        const { data: turmas } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', schoolId)
          .eq('ano_letivo', selectedYear);
        
        if (turmas && turmas.length > 0) {
          const turmaIds = turmas.map((t) => t.id);
          const { data: newData } = await supabase
            .from('alunos')
            .select('*')
            .in('turma_id', turmaIds);
          if (newData) setStudents(newData);
        }
      } else if (selectedClassId) {
        const { data: newData } = await supabase
          .from('alunos')
          .select('*')
          .eq('turma_id', selectedClassId);
        if (newData) setStudents(newData);
      }
    }
  };

  // Ordem crescente: Pré I, Pré II, 1º ao 9º ano (para ordenar turmas e alunos por turma)
  const getTurmaSortOrder = (nome) => {
    if (!nome) return 999;
    const n = (nome || '').toLowerCase();
    if (n.includes('pré i') || n.includes('pre i')) return 0;
    if (n.includes('pré ii') || n.includes('pre ii')) return 1;
    for (let ano = 1; ano <= 9; ano++) {
      if (n.includes(`${ano}º`) || n.includes(ano + 'º')) return ano + 1;
    }
    return 999;
  };

  // Filtrar turmas e alunos por busca (classes pode estar vazio; evita erro ao voltar para lista de turmas)
  const classesList = classes || [];
  const filteredClasses = classesList.filter((turma) =>
    turma.nome?.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
    turma.codigo?.toLowerCase().includes(classSearchTerm.toLowerCase())
  );

  const filteredClassesSorted = [...filteredClasses].sort(
    (a, b) => getTurmaSortOrder(a.nome) - getTurmaSortOrder(b.nome)
  );

  const filteredStudents = students.filter((aluno) =>
    aluno.nome?.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  // Ordenar alunos: quando uma turma está selecionada, ordem alfabética por nome; quando "Alunos" (todas), por turma (Pré→9º) e depois alfabética
  const sortedFilteredStudents = [...filteredStudents].sort((a, b) => {
    if (selectedClassId) {
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    }
    const turmaA = classesList.find((c) => String(c.id) === String(a.turma_id));
    const turmaB = classesList.find((c) => String(c.id) === String(b.turma_id));
    const orderA = getTurmaSortOrder(turmaA?.nome);
    const orderB = getTurmaSortOrder(turmaB?.nome);
    if (orderA !== orderB) return orderA - orderB;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
  });

  return (
    <>
      {!isLoggedIn && (
        <div className="login-screen">
          <div className="login-box">
            <h2>SACP</h2>
            <p style={{ marginBottom: 20, color: '#666' }}>
              Sistema de Apoio à Coordenação Pedagógica
            </p>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>E-mail</label>
                <input type="email" defaultValue="coordenadora@escola.com" />
              </div>
              <div className="input-group">
                <label>Senha</label>
                <input type="password" defaultValue="********" />
              </div>
              <button type="submit" className="btn-primary">
                Entrar
              </button>
            </form>
            <p style={{ marginTop: 15, fontSize: '0.8em' }}>
              <a href="#">Recuperar senha</a>
            </p>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <div className="app-container">
          {/* Overlay para fechar menu no mobile */}
          {mobileMenuOpen && (
            <div
              className="mobile-overlay"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <aside className={mobileMenuOpen ? 'mobile-open' : ''}>
            <div className="brand">
              <h3>SACP</h3>
              <span>Coordenação Pedagógica</span>
            </div>
            <nav>
              <ul>
                <li
                  onClick={() => {
                    navigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'dashboard' ? 'active' : ''}
                >
                  <i className="fas fa-home" /> Dashboard
                </li>
                <li
                  onClick={() => {
                    navigate('agenda');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'agenda' ? 'active' : ''}
                >
                  <i className="fas fa-calendar-alt" /> Agenda
                </li>
                <li
                  onClick={() => {
                    navigate('schools');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'schools' ? 'active' : ''}
                >
                  <i className="fas fa-school" /> Escolas
                </li>
                <li
                  onClick={() => {
                    navigate('classes');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'classes' ? 'active' : ''}
                >
                  <i className="fas fa-users" /> Turmas
                </li>
                <li
                  onClick={() => {
                    setSelectedClassId(null);
                    setSelectedClassName('');
                    navigate('students');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'students' ? 'active' : ''}
                >
                  <i className="fas fa-user-graduate" /> Alunos
                </li>
                <li
                  onClick={() => {
                    navigate('reports');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'reports' ? 'active' : ''}
                >
                  <i className="fas fa-chart-bar" /> Relatórios
                </li>
                <li
                  onClick={() => {
                    navigate('settings');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'settings' ? 'active' : ''}
                >
                  <i className="fas fa-cog" /> Configurações
                </li>
              </ul>
            </nav>
          </aside>

          <main>
            <header>
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <i className="fas fa-bars" />
              </button>
              <h1>{getPageTitle()}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                {schools.length > 0 && (
                  <select
                    value={activeSchoolId ?? ''}
                    onChange={(e) => handleChangeActiveSchool(e.target.value || null)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: '0.9em',
                      background: 'white',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.nome} ({school.tipo_estrutura})
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: '0.9em',
                    background: 'white',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
                <div className="user-profile">
                  <span>Olá, Maria (Coord.)</span>
                  <div className="avatar">M</div>
                </div>
              </div>
            </header>

            {/* Dashboard */}
            {currentView === 'dashboard' && (
              <div id="view-dashboard" className="view-section">
                <div className="calendar-strip">
                  <div className="day-box">
                    SEG
                    <br />
                    20
                  </div>
                  <div className="day-box">
                    TER
                    <br />
                    21
                  </div>
                  <div className="day-box today">
                    QUA
                    <br />
                    22
                  </div>
                  <div className="day-box">
                    QUI
                    <br />
                    23
                  </div>
                  <div className="day-box">
                    SEX
                    <br />
                    24
                  </div>
                </div>

                <div className="cards-grid">
                  <div className="card">
                    <h4>Alunos em Risco (Vermelho)</h4>
                    <div className="number" style={{ color: 'var(--danger)' }}>
                      {dashboardLoading ? '...' : totalRisco}
                    </div>
                  </div>
                  <div className="card">
                    <h4>Alunos em Atenção (Amarelo)</h4>
                    <div className="number" style={{ color: 'var(--warning)' }}>
                      {dashboardLoading ? '...' : totalAtencao}
                    </div>
                  </div>
                  <div className="card">
                    <h4>Total de Alunos</h4>
                    <div className="number">
                      {dashboardLoading ? '...' : totalAlunos}
                    </div>
                  </div>
                </div>

                <h3 style={{ marginBottom: 15 }}>Atividades do Dia</h3>
                <div className="list-container">
                  {todayEvents.length === 0 ? (
                    <div className="list-item">
                      <div style={{ textAlign: 'center', padding: 20, color: '#666', width: '100%' }}>
                        <i className="fas fa-calendar-day" style={{ fontSize: '2em', marginBottom: 10, opacity: 0.3 }} />
                        <p style={{ margin: 0 }}>Nenhum evento agendado para hoje.</p>
                      </div>
                    </div>
                  ) : (
                    todayEvents.map((event) => {
                      const eventDate = new Date(event?.data_inicio);
                      if (!event?.id || isNaN(eventDate.getTime())) return null;
                      return (
                        <div
                          key={event.id}
                          className="list-item"
                          style={{
                            borderLeft: `4px solid ${event?.cor_etiqueta || '#3498DB'}`,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setCurrentView('agenda');
                            setCurrentDate(eventDate);
                            setAgendaView('day');
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <strong>{event?.titulo || 'Sem título'}</strong>
                            {event?.descricao && (
                              <div style={{ fontSize: '0.8em', color: 'gray', marginTop: 4 }}>
                                {event.descricao}
                              </div>
                            )}
                          </div>
                          <span
                            className="badge"
                            style={{
                              background: event?.cor_etiqueta || '#3498DB',
                              color: 'white',
                            }}
                          >
                            {eventDate.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Schools */}
            {currentView === 'schools' && (
              <div id="view-schools" className="view-section">
                <button
                  className="btn-primary"
                  style={{ width: 'auto', marginBottom: 20 }}
                  onClick={() => {
                    setEditingSchool(null);
                    setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
                    setShowSchoolModal(true);
                  }}
                >
                  + Nova Escola
                </button>
                <div className="list-container">
                  {schoolsLoading && (
                    <div className="list-item">
                      <span>Carregando escolas...</span>
                    </div>
                  )}
                  {schoolsError && (
                    <div className="list-item">
                      <span>{schoolsError}</span>
                    </div>
                  )}
                  {!schoolsLoading && !schoolsError && schools.length === 0 && (
                    <div className="list-item">
                      <span>Nenhuma escola encontrada.</span>
                    </div>
                  )}
                  {!schoolsLoading &&
                    !schoolsError &&
                    schools.map((school) => (
                      <div key={school.id} className="list-item">
                        <div style={{ flex: 1 }}>
                          <strong>{school.nome}</strong>
                          <div style={{ fontSize: '0.8em', color: 'gray' }}>
                            INEP: {school.inep || 'Não informado'} • {school.endereco || 'Endereço não informado'}
                          </div>
                          <span
                            className={`badge ${
                              school.tipo_estrutura === 'Polo' ? 'bg-blue' : 'bg-green'
                            }`}
                            style={{ marginTop: 5, display: 'inline-block' }}
                          >
                            {school.tipo_estrutura}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSchool(school);
                            }}
                            style={{
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchool(school.id);
                            }}
                            style={{
                              background: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Classes */}
            {currentView === 'classes' && (
              <div id="view-classes" className="view-section">
                {selectedClassId ? (
                  <React.Fragment key="alunos-da-turma">
                    <div
                      className="breadcrumb"
                      onClick={() => {
                        setSelectedClassId(null);
                        setSelectedClassName('');
                      }}
                    >
                      <i className="fas fa-arrow-left" /> Voltar para lista de turmas
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                        flexWrap: 'wrap',
                        gap: 15,
                      }}
                    >
                      <h2 style={{ margin: 0 }}>
                        Alunos - {selectedClassName}
                      </h2>
                      <button
                        className="btn-primary"
                        style={{ width: 'auto', padding: '10px 20px' }}
                        onClick={() => {
                          setEditingStudent(null);
                          setStudentFormData({
                            nome: '',
                            data_nascimento: '',
                            turma_id: selectedClassId,
                            etiqueta_cor: 'azul',
                            matricula: '',
                            nome_responsavel: '',
                            contato: '',
                            aee_deficiencia: '',
                            aee_cid: '',
                            motivo_etiqueta: '',
                          });
                          setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
                          setShowStudentModal(true);
                        }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: 5 }} />
                        Novo Aluno
                      </button>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <input
                        type="text"
                        placeholder="Buscar aluno por nome..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 10,
                          border: '1px solid #ddd',
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <div className="list-container">
                      {studentsLoading && (
                        <div className="list-item">
                          <span>Carregando alunos...</span>
                        </div>
                      )}
                      {studentsError && (
                        <div className="list-item">
                          <span>{studentsError}</span>
                        </div>
                      )}
                      {!studentsLoading && !studentsError && sortedFilteredStudents.length === 0 && students.length > 0 && (
                        <div className="list-item">
                          <span>Nenhum aluno encontrado com o termo "{studentSearchTerm}".</span>
                        </div>
                      )}
                      {!studentsLoading && !studentsError && students.length === 0 && (
                        <div className="list-item">
                          <span>Nenhum aluno nesta turma.</span>
                        </div>
                      )}
                      {!studentsLoading &&
                        !studentsError &&
                        sortedFilteredStudents.map((aluno) => {
                          const badgeClass = getBadgeColorClass(aluno.etiqueta_cor);
                          return (
                            <div
                              key={aluno.id}
                              className="list-item"
                              style={{
                                borderLeft: aluno.etiqueta_cor === 'roxo' ? '4px solid #9c27b0' : undefined,
                                paddingLeft: aluno.etiqueta_cor === 'roxo' ? '12px' : undefined,
                              }}
                            >
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
                                onClick={() => selectStudent(aluno)}
                              >
                                {aluno.etiqueta_cor === 'roxo' ? (
                                  <i className="fas fa-wheelchair" style={{ color: '#9c27b0', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Educação Especial" />
                                ) : aluno.etiqueta_cor === 'vermelho' ? (
                                  <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Prioridade" />
                                ) : aluno.etiqueta_cor === 'amarelo' ? (
                                  <i className="fas fa-exclamation-circle" style={{ color: '#ffc107', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Atenção" />
                                ) : aluno.etiqueta_cor === 'verde' ? (
                                  <i className="fas fa-star" style={{ color: '#28a745', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Avançado" />
                                ) : (
                                  <i className="fas fa-user" style={{ color: '#007bff', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Regular" />
                                )}
                                <div>
                                  <strong>{aluno.nome}</strong>
                                  <div style={{ fontSize: '0.8em', color: 'gray' }}>
                                    Frequência: {aluno.frequencia != null ? `${aluno.frequencia}%` : 'N/D'} • Nível de leitura: {aluno.nivel_leitura || 'Não informado'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span className={`badge ${badgeClass}`}>
                                  {aluno.etiqueta_cor === 'vermelho' ? 'Prioridade' : aluno.etiqueta_cor === 'amarelo' ? 'Atenção' : aluno.etiqueta_cor === 'verde' ? 'Avançado' : aluno.etiqueta_cor === 'roxo' ? 'Educação Especial' : 'Regular'}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditStudent(aluno); }}
                                  style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
                                >
                                  <i className="fas fa-edit" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteStudent(aluno.id); }}
                                  style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
                                >
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </React.Fragment>
                ) : (
                  <React.Fragment key="lista-turmas">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 15,
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    Turmas {(activeSchool && activeSchool.nome) ? `- ${activeSchool.nome}` : ''}
                  </h2>
                  <button
                    className="btn-primary"
                    style={{ width: 'auto', padding: '10px 20px' }}
                    onClick={() => {
                      setEditingClass(null);
                      setClassFormData({
                        nome: '',
                        ano: '',
                        codigo: '',
                        professor_regente: '',
                        aluno_representante: '',
                      });
                      setClassFormData({ 
                        nome: '', 
                        ano: [], 
                        codigo: '', 
                        professor_regente: '', 
                        aluno_representante: '', 
                        escola_id: activeSchoolId || '', 
                        ano_letivo: selectedYear 
                      });
                      setShowClassModal(true);
                    }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: 5 }} />
                    Nova Turma
                  </button>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <input
                    type="text"
                    placeholder="Buscar turma por nome ou código..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div className="list-container">
                  {classesLoading && (
                    <div className="list-item">
                      <span>Carregando turmas...</span>
                    </div>
                  )}
                  {classesError && (
                    <div className="list-item">
                      <span>{classesError}</span>
                    </div>
                  )}
                  {!classesLoading &&
                    !classesError &&
                    filteredClassesSorted.length === 0 &&
                    classesList.length > 0 && (
                      <div className="list-item">
                        <span>Nenhuma turma encontrada com o termo "{classSearchTerm}".</span>
                      </div>
                    )}
                  {!classesLoading && !classesError && classesList.length === 0 && (
                    <div className="list-item">
                      <span>Nenhuma turma encontrada para esta escola.</span>
                    </div>
                  )}
                  {!classesLoading &&
                    !classesError &&
                    filteredClassesSorted.map((turma) => {
                      const escola = (schools || []).find((s) => String(s.id) === String(turma.escola_id));
                      const etiquetas = turmaEtiquetasCount[turma.id] || { verde: 0, amarelo: 0, vermelho: 0, azul: 0 };
                      return (
                      <div key={turma.id} className="list-item">
                        <div
                          style={{ flex: 1, cursor: 'pointer' }}
                          onClick={() => selectClass(turma)}
                        >
                          <strong style={{ fontSize: '1.1em', display: 'block', marginBottom: 6 }}>{turma.nome}</strong>
                          <div style={{ fontSize: '0.85em', color: '#666', lineHeight: '1.6' }}>
                            {/* Linha 1: Escola, Ano Letivo, Código, Professor e Representante */}
                            <div style={{ marginBottom: 4 }}>
                              <strong>Escola:</strong> {escola?.nome || 'Não informada'} • <strong>Ano Letivo:</strong> {turma.ano_letivo}
                              {turma.codigo && <> • <strong>Código:</strong> {turma.codigo}</>}
                              <> • <strong>Professor:</strong> {turma.professor_regente || 'Não informado'}</>
                              {turma.aluno_representante && (
                                <> • <strong>Representante:</strong> {turma.aluno_representante}</>
                              )}
                            </div>
                            {/* Linha 2: Etiquetas com status e cores */}
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {etiquetas.vermelho > 0 && (
                                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                  🔴 Prioridade: {etiquetas.vermelho}
                                </span>
                              )}
                              {etiquetas.amarelo > 0 && (
                                <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                                  🟡 Atenção: {etiquetas.amarelo}
                                </span>
                              )}
                              {etiquetas.azul > 0 && (
                                <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                                  🔵 Regular: {etiquetas.azul}
                                </span>
                              )}
                              {etiquetas.verde > 0 && (
                                <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                  🟢 Avançado: {etiquetas.verde}
                                </span>
                              )}
                              {etiquetas.vermelho === 0 && etiquetas.amarelo === 0 && etiquetas.azul === 0 && etiquetas.verde === 0 && (
                                <span style={{ color: '#999' }}>Nenhum aluno cadastrado</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClass(turma);
                            }}
                            style={{
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClass(turma.id);
                            }}
                            style={{
                              background: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <i className="fas fa-trash" />
                          </button>
                          <i className="fas fa-chevron-right" style={{ color: '#999' }} />
                        </div>
                      </div>
                      );
                    })}
                </div>
                  </React.Fragment>
                )}
              </div>
            )}

            {/* Students */}
            {currentView === 'students' && (
              <div id="view-students" className="view-section">
                {selectedClassName && (
                  <div
                    className="breadcrumb"
                    onClick={() => {
                      setSelectedClassId(null);
                      setSelectedClassName('');
                      setStudents([]);
                      navigate('classes');
                    }}
                  >
                    <i className="fas fa-arrow-left" /> Voltar para Turmas
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 15,
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    Alunos {selectedClassName ? `- ${selectedClassName}` : activeSchool ? `- ${activeSchool.nome}` : ''}
                  </h2>
                  <button
                    className="btn-primary"
                    style={{ width: 'auto', padding: '10px 20px' }}
                    onClick={() => {
                      setEditingStudent(null);
                      setStudentFormData({
                        nome: '',
                        data_nascimento: '',
                        turma_id: '',
                        etiqueta_cor: 'azul',
                        matricula: '',
                        nome_responsavel: '',
                        contato: '',
                        aee_deficiencia: '',
                        aee_cid: '',
                        motivo_etiqueta: '',
                      });
                      setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
                      setShowStudentModal(true);
                    }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: 5 }} />
                    Novo Aluno
                  </button>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <input
                    type="text"
                    placeholder="Buscar aluno por nome..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div className="list-container">
                  {studentsLoading && (
                    <div className="list-item">
                      <span>Carregando alunos...</span>
                    </div>
                  )}
                  {studentsError && (
                    <div className="list-item">
                      <span>{studentsError}</span>
                    </div>
                  )}
                  {!studentsLoading &&
                    !studentsError &&
                    filteredStudents.length === 0 &&
                    students.length > 0 && (
                      <div className="list-item">
                        <span>Nenhum aluno encontrado com o termo "{studentSearchTerm}".</span>
                      </div>
                    )}
                  {!studentsLoading && !studentsError && students.length === 0 && (
                    <div className="list-item">
                      <span>Nenhum aluno encontrado.</span>
                    </div>
                  )}
                  {!studentsLoading &&
                    !studentsError &&
                    sortedFilteredStudents.map((aluno) => {
                      const badgeClass = getBadgeColorClass(aluno.etiqueta_cor);
                      return (
                        <div 
                          key={aluno.id} 
                          className="list-item"
                          style={{
                            borderLeft: aluno.etiqueta_cor === 'roxo' ? '4px solid #9c27b0' : undefined,
                            paddingLeft: aluno.etiqueta_cor === 'roxo' ? '12px' : undefined,
                          }}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
                            onClick={() => selectStudent(aluno)}
                          >
                            {aluno.etiqueta_cor === 'roxo' ? (
                              <i className="fas fa-wheelchair" style={{ color: '#9c27b0', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Educação Especial" />
                            ) : aluno.etiqueta_cor === 'vermelho' ? (
                              <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Prioridade" />
                            ) : aluno.etiqueta_cor === 'amarelo' ? (
                              <i className="fas fa-exclamation-circle" style={{ color: '#ffc107', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Atenção" />
                            ) : aluno.etiqueta_cor === 'verde' ? (
                              <i className="fas fa-star" style={{ color: '#28a745', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Avançado" />
                            ) : (
                              <i className="fas fa-user" style={{ color: '#007bff', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Regular" />
                            )}
                            <div>
                              <strong>{aluno.nome}</strong>
                              <div style={{ fontSize: '0.8em', color: 'gray' }}>
                                Frequência:{' '}
                                {aluno.frequencia != null ? `${aluno.frequencia}%` : 'N/D'}{' '}
                                • Nível de leitura:{' '}
                                {aluno.nivel_leitura || 'Não informado'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span className={`badge ${badgeClass}`}>
                              {aluno.etiqueta_cor === 'vermelho'
                                ? 'Prioridade'
                                : aluno.etiqueta_cor === 'amarelo'
                                ? 'Atenção'
                                : aluno.etiqueta_cor === 'verde'
                                ? 'Avançado'
                                : aluno.etiqueta_cor === 'roxo'
                                ? 'Educação Especial'
                                : 'Regular'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStudent(aluno);
                              }}
                              style={{
                                background: 'var(--accent)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(aluno.id);
                              }}
                              style={{
                                background: 'var(--danger)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Student Detail */}
            {currentView === 'student-detail' && (
              <div id="view-student-detail" className="view-section">
                <div className="breadcrumb" onClick={() => navigate('students')}>
                  <i className="fas fa-arrow-left" /> Voltar para Lista
                </div>

                <div className="student-header">
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      background: selectedStudent?.etiqueta_cor === 'roxo' ? '#9c27b0' : '#ddd',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5em',
                      color: selectedStudent?.etiqueta_cor === 'roxo' ? 'white' : '#666',
                    }}
                  >
                    {selectedStudent?.etiqueta_cor === 'roxo' ? (
                      <i className="fas fa-wheelchair" />
                    ) : (
                      <i className="fas fa-user" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0 }}>{selectedStudent?.nome || 'Nome não informado'}</h2>
                    <span style={{ color: 'gray' }}>
                      {classes.find((c) => String(c.id) === String(selectedStudent?.turma_id))?.nome || 'Turma não informada'}
                      {selectedStudent?.matricula ? ` • Matrícula: ${selectedStudent.matricula}` : ''}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className={`badge ${getBadgeColorClass(selectedStudent?.etiqueta_cor)}`}
                      style={{ fontSize: '1em', padding: '8px 15px' }}
                    >
                      {selectedStudent?.etiqueta_cor === 'vermelho'
                        ? '🔴 Prioridade'
                        : selectedStudent?.etiqueta_cor === 'amarelo'
                        ? '🟡 Atenção'
                        : selectedStudent?.etiqueta_cor === 'verde'
                        ? '🟢 Avançado'
                        : selectedStudent?.etiqueta_cor === 'roxo'
                        ? '🟣 Educação Especial'
                        : '🔵 Regular'}
                    </span>
                  </div>
                </div>

                <div className="student-tabs">
                  <div
                    className={`tab ${currentTab === 'resumo' ? 'active' : ''}`}
                    onClick={() => switchTab('resumo')}
                  >
                    Resumo
                  </div>
                  <div
                    className={`tab ${currentTab === 'boletim' ? 'active' : ''}`}
                    onClick={() => switchTab('boletim')}
                  >
                    Boletim
                  </div>
                  <div
                    className={`tab ${currentTab === 'ocorrencias' ? 'active' : ''}`}
                    onClick={() => switchTab('ocorrencias')}
                  >
                    Ocorrências
                  </div>
                  <div
                    className={`tab ${currentTab === 'sondagem' ? 'active' : ''}`}
                    onClick={() => switchTab('sondagem')}
                  >
                    Sondagens
                  </div>
                  <div
                    className={`tab ${currentTab === 'evidencias' ? 'active' : ''}`}
                    onClick={() => switchTab('evidencias')}
                  >
                    Evidências (Anexos)
                  </div>
                  <div
                    className={`tab ${currentTab === 'aee' ? 'active' : ''}`}
                    onClick={() => switchTab('aee')}
                    style={{
                      borderLeft: selectedStudent?.etiqueta_cor === 'roxo' ? '3px solid #9c27b0' : undefined,
                      fontWeight: selectedStudent?.etiqueta_cor === 'roxo' ? 'bold' : undefined,
                    }}
                  >
                    AEE {selectedStudent?.etiqueta_cor === 'roxo' && '🟣'}
                  </div>
                </div>

                {/* Tab Boletim */}
                {currentTab === 'boletim' && selectedStudent?.id && (
                  <div id="tab-boletim" className="tab-content active">
                    <BoletimView
                      alunoId={selectedStudent.id}
                      nivelEnsino={classes.find((c) => String(c.id) === String(selectedStudent?.turma_id))?.nivel || 'fundamental1'}
                    />
                  </div>
                )}

                {/* Tab Resumo */}
                {currentTab === 'resumo' && (
                  <div id="tab-resumo" className="tab-content active">
                    <div className="cards-grid">
                      <div className="card">
                        <h4>Frequência Geral</h4>
                        <div className="number" style={{ color: 'var(--danger)' }}>
                          {selectedStudent?.frequencia != null
                            ? `${selectedStudent.frequencia}%`
                            : 'N/D'}
                        </div>
                        <small>
                          {selectedStudent?.frequencia != null && selectedStudent.frequencia < 85
                            ? 'Abaixo da meta de 85%'
                            : 'Meta de frequência: 85%'}
                        </small>
                      </div>
                      <div className="card">
                        <h4>Nível de Leitura (Alfabetiza Pará)</h4>
                        <div
                          className="number"
                          style={{ fontSize: '1.5em', color: 'var(--warning)' }}
                        >
                          {selectedStudent?.nivel_leitura || 'Não informado'}
                        </div>
                        <small>Fonte: Avaliações Alfabetiza Pará</small>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Ocorrências */}
                {currentTab === 'ocorrencias' && (
                  <div id="tab-ocorrencias" className="tab-content active">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                      }}
                    >
                      <h3 style={{ margin: 0 }}>Ocorrências</h3>
                      <button
                        className="btn-primary"
                        style={{ width: 'auto', padding: '10px 20px' }}
                        onClick={() => setShowModal(true)}
                      >
                        <i className="fas fa-plus" style={{ marginRight: 5 }} />
                        Nova Ocorrência
                      </button>
                    </div>
                    {occurrencesLoading && (
                      <div className="list-item" style={{ marginTop: 15 }}>
                        <span>Carregando ocorrências...</span>
                      </div>
                    )}
                    {occurrencesError && (
                      <div className="list-item" style={{ marginTop: 15 }}>
                        <span>{occurrencesError}</span>
                      </div>
                    )}
                    {!occurrencesLoading && !occurrencesError && occurrences.length === 0 && (
                      <div className="list-item" style={{ marginTop: 15 }}>
                        <span>Nenhuma ocorrência registrada.</span>
                      </div>
                    )}
                    {!occurrencesLoading && !occurrencesError && occurrences.length > 0 && (
                      <div className="cards-grid" style={{ marginTop: 15 }}>
                        {occurrences.map((ocorrencia) => (
                          <div key={ocorrencia.id} className="card">
                            <div style={{ marginBottom: 10 }}>
                              <strong style={{ fontSize: '1.1em', color: 'var(--primary)' }}>
                                {ocorrencia.titulo || 'Sem título'}
                              </strong>
                            </div>
                            <div style={{ fontSize: '0.9em', color: 'var(--text-light)', marginBottom: 10 }}>
                              <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                              {ocorrencia.data_ocorrencia
                                ? new Date(ocorrencia.data_ocorrencia).toLocaleDateString('pt-BR')
                                : 'Data não informada'}
                            </div>
                            <div style={{ fontSize: '0.9em', color: 'var(--text)', lineHeight: '1.5' }}>
                              {ocorrencia.descricao || 'Sem descrição'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Sondagem */}
                {currentTab === 'sondagem' && (
                  <div id="tab-sondagem" className="tab-content active">
                    <h3>Histórico Alfabetiza Pará</h3>
                    <table
                      style={{
                        width: '100%',
                        marginTop: 15,
                        borderCollapse: 'collapse',
                        background: 'white',
                      }}
                    >
                      <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                          <th style={{ padding: 10 }}>Data</th>
                          <th style={{ padding: 10 }}>Nível</th>
                          <th style={{ padding: 10 }}>Avaliador</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            10/02/2024
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            Pré-Silábico
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>Prof. Ana</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            15/05/2024
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            Silábico
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            Coord. Maria
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab Evidências */}
                {currentTab === 'evidencias' && (
                  <div id="tab-evidencias" className="tab-content active">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <h3>Portfólio Digital</h3>
                      <button className="btn-primary" style={{ width: 'auto' }}>
                        + Upload
                      </button>
                    </div>
                    <div
                      style={{
                        marginTop: 15,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 15,
                      }}
                    >
                      <div
                        style={{
                          background: 'white',
                          padding: 10,
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <i
                          className="fas fa-image"
                          style={{
                            fontSize: '2em',
                            color: 'var(--accent)',
                            marginBottom: 10,
                          }}
                        />
                        <p>Foto_Atividade.jpg</p>
                        <small>15/05/2024</small>
                      </div>
                      <div
                        style={{
                          background: 'white',
                          padding: 10,
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <i
                          className="fas fa-microphone"
                          style={{
                            fontSize: '2em',
                            color: 'var(--warning)',
                            marginBottom: 10,
                          }}
                        />
                        <p>Leitura_Audio.mp3</p>
                        <small>10/05/2024</small>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab AEE */}
                {currentTab === 'aee' && (
                  <div id="tab-aee" className="tab-content active">
                    <h3>Atendimento Educacional Especializado (AEE)</h3>
                    {selectedStudent?.etiqueta_cor === 'roxo' && (
                      <div style={{ 
                        padding: 10, 
                        background: '#f3e5f5', 
                        borderRadius: 6, 
                        marginBottom: 20,
                        border: '1px solid #9c27b0'
                      }}>
                        <strong style={{ color: '#9c27b0' }}>Aluno com Educação Especial</strong>
                        {selectedStudent?.aee_deficiencia && (
                          <div style={{ marginTop: 5 }}>
                            <strong>Deficiência/Condição:</strong> {selectedStudent.aee_deficiencia}
                            {selectedStudent?.aee_cid && <> • <strong>CID:</strong> {selectedStudent.aee_cid}</>}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ maxWidth: 800 }}>
                      <div className="input-group" style={{ marginBottom: 15 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={aeeFormData.aee_tem_laudo}
                            onChange={(e) => setAeeFormData({ ...aeeFormData, aee_tem_laudo: e.target.checked })}
                            style={{ width: 20, height: 20, cursor: 'pointer' }}
                          />
                          <span>Possui Laudo?</span>
                        </label>
                      </div>

                      <div className="input-group" style={{ marginBottom: 15 }}>
                        <label>Mediadora/Apoio</label>
                        <input
                          type="text"
                          value={aeeFormData.aee_mediadora}
                          onChange={(e) => setAeeFormData({ ...aeeFormData, aee_mediadora: e.target.value })}
                          placeholder="Nome da mediadora ou profissional de apoio"
                        />
                      </div>

                      <div className="input-group" style={{ marginBottom: 20 }}>
                        <label>Plano de Desenvolvimento Individual (PDI)</label>
                        <textarea
                          value={aeeFormData.aee_plano_individual}
                          onChange={(e) => setAeeFormData({ ...aeeFormData, aee_plano_individual: e.target.value })}
                          placeholder="Descreva o plano de desenvolvimento individual do aluno..."
                          rows={8}
                          style={{
                            width: '100%',
                            padding: 10,
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontFamily: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={handleSaveAEE}
                          className="btn-primary"
                          style={{ width: 'auto', padding: '10px 20px' }}
                          disabled={savingAEE}
                        >
                          {savingAEE ? 'Salvando...' : 'Salvar Dados AEE'}
                        </button>
                      </div>

                      {/* Seção de Documentos AEE */}
                      <div style={{ marginTop: 30, padding: 20, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ddd' }}>
                        <h4 style={{ marginBottom: 15, color: 'var(--primary)' }}>
                          Documentos Anexados (Laudos/Planos)
                        </h4>
                        
                        <div style={{ marginBottom: 15 }}>
                          <label
                            htmlFor="aee-document-upload"
                            style={{
                              display: 'inline-block',
                              padding: '10px 20px',
                              background: 'var(--primary)',
                              color: 'white',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '0.9em',
                            }}
                          >
                            <i className="fas fa-upload" style={{ marginRight: 8 }} />
                            {uploadingDocument ? 'Fazendo upload...' : 'Enviar Documento'}
                          </label>
                          <input
                            id="aee-document-upload"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,image/*,application/pdf"
                            onChange={handleUploadDocument}
                            disabled={uploadingDocument || !selectedStudentId}
                            style={{ display: 'none' }}
                          />
                          <span style={{ marginLeft: 10, fontSize: '0.85em', color: '#666' }}>
                            PDF ou Imagens
                          </span>
                        </div>

                        {loadingDocuments ? (
                          <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                            Carregando documentos...
                          </div>
                        ) : aeeDocuments.length === 0 ? (
                          <div style={{ padding: 20, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                            Nenhum documento anexado ainda.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {aeeDocuments.map((doc) => (
                              <div
                                key={doc.name}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 15,
                                  padding: 12,
                                  background: 'white',
                                  borderRadius: 6,
                                  border: '1px solid #ddd',
                                }}
                              >
                                <i
                                  className={`fas ${
                                    doc.name.toLowerCase().endsWith('.pdf')
                                      ? 'fa-file-pdf'
                                      : 'fa-file-image'
                                  }`}
                                  style={{
                                    fontSize: '1.5em',
                                    color: doc.name.toLowerCase().endsWith('.pdf') ? '#dc3545' : '#3498db',
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{doc.name}</div>
                                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                                    {doc.created_at
                                      ? new Date(doc.created_at).toLocaleDateString('pt-BR')
                                      : 'Data não disponível'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    onClick={() => handleDownloadDocument(doc.name)}
                                    style={{
                                      padding: '6px 12px',
                                      background: 'var(--accent)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      fontSize: '0.85em',
                                    }}
                                    title="Baixar/Visualizar"
                                  >
                                    <i className="fas fa-download" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.name)}
                                    style={{
                                      padding: '6px 12px',
                                      background: 'var(--danger)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      fontSize: '0.85em',
                                    }}
                                    title="Excluir"
                                  >
                                    <i className="fas fa-trash" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reports */}
            {currentView === 'reports' && (
              <div id="view-reports" className="view-section">
                <h2>Relatórios e Indicadores</h2>
                <div className="cards-grid" style={{ marginTop: 20 }}>
                  <div className="card" style={{ cursor: 'pointer' }}>
                    <i
                      className="fas fa-file-pdf"
                      style={{ fontSize: '2em', color: 'var(--danger)', marginBottom: 10 }}
                    />
                    <h4>Alunos em Risco</h4>
                    <small>Gerar PDF</small>
                  </div>
                  <div className="card" style={{ cursor: 'pointer' }}>
                    <i
                      className="fas fa-table"
                      style={{ fontSize: '2em', color: 'var(--success)', marginBottom: 10 }}
                    />
                    <h4>Resultados Alfabetiza Pará</h4>
                    <small>Exportar Excel</small>
                  </div>
                </div>
                <div
                  style={{
                    background: 'white',
                    padding: 20,
                    borderRadius: 8,
                    marginTop: 20,
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #ddd',
                  }}
                >
                  <p style={{ color: 'gray' }}>
                    [Gráfico: Evolução de Leitura por Turma]
                  </p>
                </div>
              </div>
            )}

            
            {/* --- INÍCIO DA AGENDA RECUPERADA --- */}
{currentView === 'agenda' && (
  <div id="view-agenda" className="view-section">
    {/* Botões de visualização: Mês, Semana, Dia à esquerda; Novo Evento à direita */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setAgendaView('month')}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: agendaView === 'month' ? 'var(--primary)' : 'white',
            color: agendaView === 'month' ? 'white' : '#333',
            cursor: 'pointer',
          }}
        >
          Mês
        </button>
        <button
          onClick={() => setAgendaView('week')}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: agendaView === 'week' ? 'var(--primary)' : 'white',
            color: agendaView === 'week' ? 'white' : '#333',
            cursor: 'pointer',
          }}
        >
          Semana
        </button>
        <button
          onClick={() => setAgendaView('day')}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: agendaView === 'day' ? 'var(--primary)' : 'white',
            color: agendaView === 'day' ? 'white' : '#333',
            cursor: 'pointer',
          }}
        >
          Dia
        </button>
      </div>
      <button
        onClick={() => {
          setEditingEvent(null);
          const hoje = new Date();
          const dateStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
          setEventFormData({
            titulo: '',
            descricao: '',
            data_inicio: dateStr,
            hora_inicio: '08:00',
            data_fim: dateStr,
            hora_fim: '09:00',
            cor_etiqueta: '#3498DB',
            anexo_nome: '',
            anexo_file: null,
          });
          setShowEventModal(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '8px 10px',
          border: '1px solid transparent',
          borderRadius: 6,
          background: 'var(--primary)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.8rem',
          lineHeight: 1,
        }}
      >
        <i className="fas fa-plus" style={{ fontSize: '0.75rem' }} /> Novo Evento
      </button>
    </div>

    {/* Cabeçalho do mês: Anterior | MÊS ANO | Próximo */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          setCurrentDate(new Date(year, month - 1, 1));
        }}
        style={{
          padding: '6px 10px',
          border: '1px solid #ddd',
          borderRadius: 6,
          background: 'white',
          cursor: 'pointer',
          fontSize: '1em',
          lineHeight: 1,
        }}
        aria-label="Mês anterior"
      >
        &lt;
      </button>
      <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#333', fontSize: '1rem' }}>
        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </h3>
      <button
        type="button"
        onClick={() => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          setCurrentDate(new Date(year, month + 1, 1));
        }}
        style={{
          padding: '6px 10px',
          border: '1px solid #ddd',
          borderRadius: 6,
          background: 'white',
          cursor: 'pointer',
          fontSize: '1em',
          lineHeight: 1,
        }}
        aria-label="Próximo mês"
      >
        &gt;
      </button>
    </div>

    {/* Calendário (grid usa currentDate) */}
    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#666', fontSize: '0.85rem' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '320px' }}>
        {(() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const slots = [];

            for (let i = 0; i < firstDay; i++) {
                slots.push(<div key={`empty-${i}`} style={{ background: '#fafafa', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}></div>);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dayEvents = agendaEvents.filter(ev => {
                    if (!ev.data_inicio) return false;
                    const evDate = new Date(ev.data_inicio);
                    return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === day;
                });

                slots.push(
                    <div key={day}
                         style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #eee', padding: '5px', height: '64px', position: 'relative', cursor: 'pointer', fontSize: '0.8rem' }}
                         onClick={() => {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            setEditingEvent(null);
                            setEventFormData({
                                titulo: '',
                                descricao: '',
                                data_inicio: dateStr,
                                hora_inicio: '08:00',
                                data_fim: dateStr,
                                hora_fim: '09:00',
                                cor_etiqueta: '#3498DB',
                                anexo_nome: '',
                                anexo_file: null,
                            });
                            setShowEventModal(true);
                         }}
                    >
                        <span style={{ fontWeight: 'bold', color: '#333' }}>{day}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px' }}>
                            {dayEvents.map(ev => {
                                const inicio = splitDateTime(ev.data_inicio);
                                const fim = splitDateTime(ev.data_fim);
                                const cor = (typeof ev.cor_etiqueta === 'string' && ev.cor_etiqueta.startsWith('#')) ? ev.cor_etiqueta : (ev.cor_etiqueta === 'vermelho' ? '#ef4444' : ev.cor_etiqueta === 'verde' ? '#10b981' : ev.cor_etiqueta === 'amarelo' ? '#eab308' : '#3b82f6');
                                return (
                                <div key={ev.id}
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         setEditingEvent(ev);
                                         setEventFormData({
                                             titulo: ev.titulo || '',
                                             descricao: ev.descricao || '',
                                             data_inicio: inicio.date,
                                             hora_inicio: inicio.time,
                                             data_fim: fim.date,
                                             hora_fim: fim.time,
                                             cor_etiqueta: cor,
                                             anexo_nome: ev.anexo_nome || '',
                                             anexo_file: null,
                                         });
                                         setShowEventModal(true);
                                     }}
                                     style={{
                                         fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', color: 'white',
                                         background: cor,
                                         whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                     }}>
                                    {ev.titulo}
                                </div>
                            );})}
                        </div>
                    </div>
                );
            }
            return slots;
        })()}
      </div>
    </div>

  </div>
)}
{/* --- FIM DA AGENDA RECUPERADA --- */}

            {/* Settings placeholder */}
            {currentView === 'settings' && (
              <div className="view-section">
                <p>Conteúdo de settings ainda não implementado.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Modal de Nova Ocorrência */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={handleCancelModal}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>Nova Ocorrência</h2>
            <form onSubmit={handleSaveOccurrence}>
              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Título *</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Dificuldade de Leitura"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Tipo *</label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                  }}
                >
                  <option value="Pedagógico">Pedagógico</option>
                  <option value="Comportamental">Comportamental</option>
                  <option value="Família">Família</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Data *</label>
                <input
                  type="date"
                  required
                  value={formData.data_ocorrencia}
                  onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
                />
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Descrição *</label>
                <textarea
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva a ocorrência..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelModal}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  disabled={savingOccurrence}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={savingOccurrence}
                >
                  {savingOccurrence ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Nota */}
      {showNoteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={handleCancelNoteModal}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>Adicionar Nota</h2>
            <form onSubmit={handleSaveNote}>
              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Disciplina *</label>
                <input
                  type="text"
                  required
                  value={noteFormData.disciplina}
                  onChange={(e) => setNoteFormData({ ...noteFormData, disciplina: e.target.value })}
                  placeholder="Ex: Matemática, Português"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Período *</label>
                <input
                  type="text"
                  required
                  value={noteFormData.periodo}
                  onChange={(e) => setNoteFormData({ ...noteFormData, periodo: e.target.value })}
                  placeholder="Ex: 1º Bimestre, 2º Bimestre"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Ano *</label>
                <input
                  type="number"
                  required
                  value={noteFormData.ano}
                  onChange={(e) => setNoteFormData({ ...noteFormData, ano: e.target.value })}
                  placeholder="Ex: 2025"
                  min="2000"
                  max="2100"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Valor da Nota *</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  min="0"
                  max="10"
                  value={noteFormData.valor}
                  onChange={(e) => setNoteFormData({ ...noteFormData, valor: e.target.value })}
                  placeholder="Ex: 8.5"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelNoteModal}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  disabled={savingNote}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={savingNote}
                >
                  {savingNote ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Frequência */}
      {showFrequencyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={handleCancelFrequencyModal}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>Adicionar Histórico de Frequência</h2>
            <form onSubmit={handleSaveFrequency}>
              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Mês de Referência *</label>
                <input
                  type="text"
                  required
                  value={frequencyFormData.mes_referencia}
                  onChange={(e) =>
                    setFrequencyFormData({ ...frequencyFormData, mes_referencia: e.target.value })
                  }
                  placeholder="Ex: Janeiro, Fevereiro, Março"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Ano *</label>
                <input
                  type="number"
                  required
                  value={frequencyFormData.ano}
                  onChange={(e) => setFrequencyFormData({ ...frequencyFormData, ano: e.target.value })}
                  placeholder="Ex: 2025"
                  min="2000"
                  max="2100"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Porcentagem *</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  min="0"
                  max="100"
                  value={frequencyFormData.porcentagem}
                  onChange={(e) =>
                    setFrequencyFormData({ ...frequencyFormData, porcentagem: e.target.value })
                  }
                  placeholder="Ex: 85.5"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelFrequencyModal}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  disabled={savingFrequency}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={savingFrequency}
                >
                  {savingFrequency ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Escola */}
      {showSchoolModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setShowSchoolModal(false);
            setEditingSchool(null);
            setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>
              {editingSchool ? 'Editar Escola' : 'Nova Escola'}
            </h2>
            <form onSubmit={handleSaveSchool}>
              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Nome *</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.nome}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, nome: e.target.value })}
                  placeholder="Nome da escola"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>INEP *</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.inep}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, inep: e.target.value })}
                  placeholder="Código INEP"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 15 }}>
                <label>Endereço *</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.endereco}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, endereco: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Tipo *</label>
                <select
                  required
                  value={schoolFormData.tipo}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, tipo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                  }}
                >
                  <option value="Polo">Polo</option>
                  <option value="Anexa">Anexa</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSchoolModal(false);
                    setEditingSchool(null);
                    setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  disabled={savingSchool}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={savingSchool}
                >
                  {savingSchool ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Turma */}
      {showClassModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setShowClassModal(false);
            setEditingClass(null);
            setClassFormData({ nome: '', ano: [], codigo: '', professor_regente: '', aluno_representante: '', escola_id: activeSchoolId || '', ano_letivo: selectedYear });
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 12,
              width: '90%',
              maxWidth: 750,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 12, color: 'var(--primary)', fontSize: '1.3em' }}>
              {editingClass ? 'Editar Turma' : 'Nova Turma'}
            </h2>
            <form onSubmit={handleSaveClass}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                {/* Linha 1: Escola | Ano Letivo */}
                <div className="input-group">
                  <label>Escola *</label>
                  <select
                    required
                    value={classFormData.escola_id || activeSchoolId || ''}
                    onChange={(e) => {
                      const newEscolaId = e.target.value;
                      setClassFormData({ ...classFormData, escola_id: newEscolaId });
                    }}
                    style={{
                      width: '100%',
                      padding: 8,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  >
                    <option value="">Selecione uma escola...</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.nome} ({school.tipo_estrutura})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Ano Letivo *</label>
                  <select
                    required
                    value={classFormData.ano_letivo || selectedYear}
                    onChange={(e) => {
                      setClassFormData({ ...classFormData, ano_letivo: parseInt(e.target.value) });
                    }}
                    style={{
                      width: '100%',
                      padding: 8,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>

                {/* Linha 2: Anos Escolares (2 colunas) */}
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.9em' }}>Anos Escolares * (selecione um ou mais)</label>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'nowrap',
                      gap: '2px',
                      marginTop: 4,
                      padding: '4px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#f9f9f9',
                    }}
                  >
                    {['Pré I', 'Pré II', '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'].map((anoOption) => (
                      <label
                        key={anoOption}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: 4,
                          transition: 'background 0.2s',
                          fontSize: '0.75em',
                          flex: '1 1 0',
                          minWidth: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <input
                          type="checkbox"
                          checked={classFormData.ano.includes(anoOption)}
                          onChange={(e) => {
                            const newAnos = e.target.checked
                              ? [...classFormData.ano, anoOption]
                              : classFormData.ano.filter((a) => a !== anoOption);
                            const suggestedNome = generateTurmaNome(newAnos);
                            // Aplicar sugestão automaticamente apenas se o campo estiver vazio
                            setClassFormData({
                              ...classFormData,
                              ano: newAnos,
                              nome: !classFormData.nome ? suggestedNome : classFormData.nome,
                            });
                          }}
                          style={{ cursor: 'pointer', width: '14px', height: '14px', margin: 0, flexShrink: 0 }}
                        />
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>{anoOption}</span>
                      </label>
                    ))}
                  </div>
                  {classFormData.ano.length === 0 && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8em', marginTop: 3 }}>
                      Selecione pelo menos um ano escolar
                    </div>
                  )}
                </div>

                {/* Linha 3: Nome | Código */}
                <div className="input-group">
                  <label>Nome da Turma *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      required
                      value={classFormData.nome}
                      onChange={(e) => setClassFormData({ ...classFormData, nome: e.target.value })}
                      placeholder={generateTurmaNome(classFormData.ano) || "Ex: 3º Ano A"}
                      style={{ flex: 1 }}
                    />
                    {classFormData.ano.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const suggestedNome = generateTurmaNome(classFormData.ano);
                          setClassFormData({ ...classFormData, nome: suggestedNome });
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          background: '#f0f0f0',
                          cursor: 'pointer',
                          color: 'var(--text)',
                          fontSize: '0.85em',
                          whiteSpace: 'nowrap',
                        }}
                        title="Usar sugestão automática"
                      >
                        Usar Sugestão
                      </button>
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label>Código da Turma</label>
                  <input
                    type="text"
                    value={classFormData.codigo}
                    onChange={(e) => setClassFormData({ ...classFormData, codigo: e.target.value })}
                    placeholder="Ex: 301, 302 (opcional)"
                  />
                </div>

                {/* Linha 4: Professor Regente | Aluno Representante */}
                <div className="input-group">
                  <label>Professor Regente *</label>
                  <input
                    type="text"
                    required
                    value={classFormData.professor_regente}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, professor_regente: e.target.value })
                    }
                    placeholder="Nome do professor"
                  />
                </div>

                <div className="input-group">
                  <label>Aluno Representante</label>
                  <input
                    type="text"
                    value={classFormData.aluno_representante}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, aluno_representante: e.target.value })
                    }
                    placeholder="Nome do aluno representante (opcional)"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowClassModal(false);
                    setEditingClass(null);
                    setClassFormData({ nome: '', ano: [], codigo: '', professor_regente: '', aluno_representante: '', escola_id: activeSchoolId || '', ano_letivo: selectedYear });
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: '0.9em',
                  }}
                  disabled={savingClass}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9em' }}
                  disabled={savingClass}
                >
                  {savingClass ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aluno */}
      {showStudentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setShowStudentModal(false);
            setEditingStudent(null);
            setStudentFormData({ nome: '', data_nascimento: '', turma_id: '', etiqueta_cor: 'azul', matricula: '', nome_responsavel: '', contato: '', aee_deficiencia: '', aee_cid: '', motivo_etiqueta: '' });
      setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>
              {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
            </h2>
            <form onSubmit={handleSaveStudent}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                }}
              >
                {/* Linha 1: Nome | Data de Nascimento */}
                <div className="input-group">
                  <label>Nome *</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.nome}
                    onChange={(e) => setStudentFormData({ ...studentFormData, nome: e.target.value })}
                    placeholder="Nome completo do aluno"
                  />
                </div>

                <div className="input-group">
                  <label>Data de Nascimento *</label>
                  <input
                    type="date"
                    required
                    value={studentFormData.data_nascimento}
                    onChange={(e) =>
                      setStudentFormData({ ...studentFormData, data_nascimento: e.target.value })
                    }
                  />
                </div>

                {/* Linha 2: Turma | Matrícula */}
                <div className="input-group">
                  <label>Turma *</label>
                  <select
                    required
                    value={studentFormData.turma_id}
                    onChange={(e) => setStudentFormData({ ...studentFormData, turma_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  >
                    <option value="">Selecione uma turma...</option>
                    {classes.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.nome} - {turma.codigo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Matrícula</label>
                  <input
                    type="text"
                    value={studentFormData.matricula}
                    onChange={(e) => setStudentFormData({ ...studentFormData, matricula: e.target.value })}
                    placeholder="Número da matrícula (opcional)"
                  />
                </div>

                {/* Linha 3: Responsável | Contato */}
                <div className="input-group">
                  <label>Nome do Responsável</label>
                  <input
                    type="text"
                    value={studentFormData.nome_responsavel}
                    onChange={(e) => setStudentFormData({ ...studentFormData, nome_responsavel: e.target.value })}
                    placeholder="Nome do responsável (opcional)"
                  />
                </div>

                <div className="input-group">
                  <label>Contato</label>
                  <input
                    type="text"
                    value={studentFormData.contato}
                    onChange={(e) => setStudentFormData({ ...studentFormData, contato: e.target.value })}
                    placeholder="Telefone ou email (opcional)"
                  />
                </div>

                {/* Linha 4: Etiqueta | Motivo/Deficiência/Condição/CID (2 colunas) */}
                <div className="input-group">
                  <label>Etiqueta (Cor) *</label>
                  <select
                    required
                    value={studentFormData.etiqueta_cor}
                    onChange={(e) =>
                      setStudentFormData({ ...studentFormData, etiqueta_cor: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                    }}
                  >
                    <option value="vermelho">🔴 Vermelho: Prioridade</option>
                    <option value="amarelo">🟡 Amarelo: Atenção</option>
                    <option value="azul">🔵 Azul: Regular</option>
                    <option value="verde">🟢 Verde: Avançado</option>
                    <option value="roxo">🟣 Roxo: Educação Especial</option>
                  </select>
                </div>

                <div className="input-group">
                  {studentFormData.etiqueta_cor === 'roxo' ? (
                    <>
                      <label>Deficiência/Condição/CID</label>
                      <input
                        type="text"
                        value={
                          studentFormData.aee_deficiencia || studentFormData.aee_cid
                            ? `${studentFormData.aee_deficiencia || ''}${studentFormData.aee_cid ? (studentFormData.aee_deficiencia ? ' - ' : '') + `CID: ${studentFormData.aee_cid}` : ''}`
                            : ''
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          // Separar deficiência e CID se houver "CID:" no texto
                          const cidMatch = value.match(/CID:\s*([A-Z0-9.]+)/i);
                          let cid = '';
                          let deficiencia = value;
                          
                          if (cidMatch) {
                            cid = cidMatch[1].trim();
                            // Remover a parte do CID do texto
                            deficiencia = value.replace(/CID:\s*[A-Z0-9.]+/i, '').replace(/\s*-\s*$/, '').trim();
                          }
                          
                          setStudentFormData({
                            ...studentFormData,
                            aee_deficiencia: deficiencia,
                            aee_cid: cid,
                          });
                        }}
                        placeholder="Ex: Autismo, Síndrome de Down - CID: F84.0"
                        style={{
                          width: '100%',
                          padding: 10,
                          border: '1px solid #ddd',
                          borderRadius: 6,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <label>Motivo</label>
                      <input
                        type="text"
                        value={studentFormData.motivo_etiqueta}
                        onChange={(e) => setStudentFormData({ ...studentFormData, motivo_etiqueta: e.target.value })}
                        placeholder={
                          studentFormData.etiqueta_cor === 'vermelho'
                            ? 'Ex: Frequência, Nota baixa...'
                            : studentFormData.etiqueta_cor === 'amarelo'
                            ? 'Ex: Dificuldade de aprendizagem...'
                            : studentFormData.etiqueta_cor === 'azul'
                            ? 'Ex: Desempenho regular...'
                            : studentFormData.etiqueta_cor === 'verde'
                            ? 'Ex: Bom desempenho...'
                            : 'Motivo da etiqueta'
                        }
                        style={{
                          width: '100%',
                          padding: 10,
                          border: '1px solid #ddd',
                          borderRadius: 6,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentModal(false);
                    setEditingStudent(null);
                    setStudentFormData({ nome: '', data_nascimento: '', turma_id: '', etiqueta_cor: 'azul', matricula: '', nome_responsavel: '', contato: '', aee_deficiencia: '', aee_cid: '', motivo_etiqueta: '' });
      setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  disabled={savingStudent}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={savingStudent}
                >
                  {savingStudent ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Evento da Agenda */}
      {showEventModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            if (!savingEvent) {
              setShowEventModal(false);
              setEditingEvent(null);
              // NÃO alterar currentDate ao fechar modal para evitar mudança de mês
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 8,
              padding: 30,
              width: '90%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </h2>
            <form onSubmit={handleSaveEvent}>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Título *</label>
                <input
                  type="text"
                  value={eventFormData.titulo}
                  onChange={(e) => setEventFormData({ ...eventFormData, titulo: e.target.value })}
                  required
                  placeholder="Ex: Reunião de Pais"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Descrição</label>
                <textarea
                  value={eventFormData.descricao}
                  onChange={(e) => setEventFormData({ ...eventFormData, descricao: e.target.value })}
                  placeholder="Descrição do evento..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                <div className="input-group">
                  <label>Data de Início *</label>
                  <input
                    type="date"
                    value={eventFormData.data_inicio}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setEventFormData({ 
                        ...eventFormData, 
                        data_inicio: newDate,
                        // Se não houver data de fim, usar a mesma data
                        data_fim: eventFormData.data_fim || newDate
                      });
                    }}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Hora de Início *</label>
                  <select
                    value={eventFormData.hora_inicio}
                    onChange={(e) => setEventFormData({ ...eventFormData, hora_inicio: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: '1em',
                    }}
                  >
                    {generateTimeOptions().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                <div className="input-group">
                  <label>Data de Fim</label>
                  <input
                    type="date"
                    value={eventFormData.data_fim}
                    onChange={(e) => setEventFormData({ ...eventFormData, data_fim: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Hora de Fim</label>
                  <select
                    value={eventFormData.hora_fim}
                    onChange={(e) => setEventFormData({ ...eventFormData, hora_fim: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: '1em',
                    }}
                  >
                    {generateTimeOptions().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Cor da Etiqueta</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22'].map((color) => (
                    <div
                      key={color}
                      onClick={() => setEventFormData({ ...eventFormData, cor_etiqueta: color })}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: color,
                        cursor: 'pointer',
                        border: eventFormData.cor_etiqueta === color ? '3px solid #333' : '2px solid #ddd',
                        transition: 'all 0.2s',
                      }}
                      title={color}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={eventFormData.cor_etiqueta}
                  onChange={(e) => setEventFormData({ ...eventFormData, cor_etiqueta: e.target.value })}
                  style={{ marginTop: 10, width: '100%', height: 40, cursor: 'pointer' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label>Anexo (PDF/Imagem)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEventFormData({
                        ...eventFormData,
                        anexo_file: file,
                        anexo_nome: file.name,
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                  }}
                />
                {eventFormData.anexo_file && (
                  <div style={{ marginTop: 10, padding: 10, background: '#f0f0f0', borderRadius: 6, fontSize: '0.9em' }}>
                    <i className="fas fa-file" /> {eventFormData.anexo_file.name}
                  </div>
                )}
                {editingEvent?.anexo_url && !eventFormData.anexo_file && (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={editingEvent.anexo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 15px',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: '0.9em',
                      }}
                    >
                      <i className="fas fa-paperclip" /> Baixar Documento Anexado
                      {editingEvent.anexo_nome && (
                        <span style={{ marginLeft: 8, fontSize: '0.85em', opacity: 0.9 }}>
                          ({editingEvent.anexo_nome})
                        </span>
                      )}
                    </a>
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteAgendaEvent}
                    style={{
                      marginRight: 'auto',
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: 6,
                      backgroundColor: '#ff4444',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                    setEventFormData({
                      titulo: '',
                      descricao: '',
                      data_inicio: '',
                      hora_inicio: '08:00',
                      data_fim: '',
                      hora_fim: '09:00',
                      cor_etiqueta: '#3498DB',
                      anexo_nome: '',
                      anexo_file: null,
                    });
                    // NÃO alterar currentDate ao cancelar para evitar mudança de mês
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  disabled={savingEvent}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={savingEvent}
                >
                  {savingEvent ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

