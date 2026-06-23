import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import './App.css';
import { supabase } from './supabaseClient';
import SchoolsView from './views/SchoolsView';
import ClassesView from './views/ClassesView';
import StudentsView from './views/StudentsView';
import TeachersView from './views/TeachersView';
import DashboardView from './views/DashboardView';
import ReportsView from './views/ReportsView';
import LibraryView from './views/LibraryView';
import ChartsView from './views/ChartsView';
import AgendaView from './views/AgendaView';
import AgendaEventDetailView from './views/AgendaEventDetailView';
import TeacherDetailView from './views/TeacherDetailView';
import StudentDetailView from './views/StudentDetailView';
import EventModal from './components/modals/EventModal';
import OccurrenceModal from './components/modals/OccurrenceModal';
import SondagemModal from './components/modals/SondagemModal';
import NoteModal from './components/modals/NoteModal';
import FrequencyModal from './components/modals/FrequencyModal';
import EntregaModal from './components/modals/EntregaModal';
import RegistroCoordModal from './components/modals/RegistroCoordModal';
import SchoolModal from './components/modals/SchoolModal';
import ClassModal from './components/modals/ClassModal';
import StudentModal from './components/modals/StudentModal';
import TeacherModal from './components/modals/TeacherModal';
import { isTurmaEspecial } from './utils/turmas';
import { INITIAL_EVENT_FORM_DATA, ETIQUETA_CORES, normalizeEventColor } from './utils/agendaConstants';
import {
  generateRecurringOccurrences,
  parseLocalDate,
  inferRecorrenciaFromSerie,
} from './utils/agendaRecorrencia';
import {
  getAgendaExportRange,
  getEventsForExport,
  exportAgendaPDF,
  exportAgendaWord,
} from './utils/agendaExport';
import {
  useSemedAgenda,
  USUARIO_EVENT_EXTRAS,
  SemedCalendarImportWizard,
} from './agendaSemed';
import { filterAgendaEvents } from './utils/semEdCalendarImport';
import { saveBlob, savePdfDocument } from './utils/nativeExport';
import {
  contarEtiquetasAlunos,
  desvincularAlunoTurmaEspecial,
  fetchAlunosDaTurma,
  fetchAlunoIdsTurmaEspecial,
  vincularAlunoTurmaEspecial,
} from './utils/alunosTurmas';
import SettingsView from './views/SettingsView';

import { evaluateStudentColor, getMotivoOrigemEtiqueta } from './utils/studentColorEvaluator';
import { enrichAlunosEtiquetaMotivo } from './utils/alunosEtiquetaMotivo';
import { Capacitor } from '@capacitor/core';
import { getAuthRedirectUrl } from './utils/authRedirect';
import { signInWithGoogleNative } from './utils/nativeAuth';

function App() {
  // Data local em YYYY-MM-DD (evita dia anterior por timezone)
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'recover'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  // Tela "Definir nova senha" quando o usuário abre o link do e-mail de recuperação
  const [showRecoveryPasswordForm, setShowRecoveryPasswordForm] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  );
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [authUser, setAuthUser] = useState(null); // usuário logado (Supabase auth)
  const [, setNavHydrated] = useState(false);
  const isLoggedInRef = useRef(false);
  // Inicializar estados - serão carregados do localStorage quando houver sessão
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentTab, setCurrentTab] = useState('resumo');
  const currentViewRef = useRef(currentView);
  const selectedClassIdRef = useRef(selectedClassId);

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
  const studentsCountRef = useRef(0);
  studentsCountRef.current = students.length;

  const [occurrences, setOccurrences] = useState([]);
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);
  const [occurrencesError, setOccurrencesError] = useState(null);

  const [totalRisco, setTotalRisco] = useState(0);
  const [totalAtencao, setTotalAtencao] = useState(0);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalVerde, setTotalVerde] = useState(0);
  const [totalAzul, setTotalAzul] = useState(0);
  const [totalRoxo, setTotalRoxo] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState(() => new Date());
  const [dashboardWeekStart, setDashboardWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  });
  const [dashboardDayEvents, setDashboardDayEvents] = useState([]);
  const [dashboardDayEventsLoading, setDashboardDayEventsLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState(null);
  const [formData, setFormData] = useState(() => ({
    titulo: '',
    tipo: 'Pedagógico',
    data_ocorrencia: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
    descricao: '',
  }));
  const [savingOccurrence, setSavingOccurrence] = useState(false);

  const [, setAeeFormData] = useState({
    aee_tem_laudo: false,
    aee_mediadora: '',
    aee_plano_individual: '',
  });
  const [, setNotes] = useState([]);
  const [, setFrequencyHistory] = useState([]);
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    disciplina: '',
    periodo: '',
    ano: new Date().getFullYear(),
    valor: '',
  });
  const [savingNote, setSavingNote] = useState(false);

  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [frequencyFormData, setFrequencyFormData] = useState({
    mes_referencia: '',
    ano: new Date().getFullYear(),
    porcentagem: '',
  });
  const [savingFrequency, setSavingFrequency] = useState(false);

  const [sondagens, setSondagens] = useState([]);
  const [sondagensLoading, setSondagensLoading] = useState(false);
  const [sondagensError, setSondagensError] = useState(null);
  const [showSondagemModal, setShowSondagemModal] = useState(false);
  const [editingSondagem, setEditingSondagem] = useState(null);
  const [sondagemFormData, setSondagemFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    nivel_escrita: '',
    nivel_leitura: '',
    observacoes: '',
    foto_escrita_url: '',
    audio_leitura_url: '',
    video_leitura_url: '',
    arquivo_url: '',
    foto_file: null,
    audio_file: null,
    video_file: null,
    arquivo_file: null,
  });
  const [savingSondagem, setSavingSondagem] = useState(false);
  const savingSondagemRef = useRef(false);
  const [showSondagemMidiaModal, setShowSondagemMidiaModal] = useState(false);
  const [sondagemMidiaTipo, setSondagemMidiaTipo] = useState('foto'); // 'foto' | 'audio' | 'video'
  const [sondagemMidiaUrl, setSondagemMidiaUrl] = useState('');

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
    turma_especial: false,
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

  // Estados para gerenciamento de documentos AEE
  const [aeeDocuments, setAeeDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [schoolStudentsPicker, setSchoolStudentsPicker] = useState([]);
  const [schoolStudentsPickerLoading, setSchoolStudentsPickerLoading] = useState(false);
  const [vinculadosTurmaEspecialIds, setVinculadosTurmaEspecialIds] = useState(() => new Set());
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filterStudentTurmaId, setFilterStudentTurmaId] = useState('');
  const [filterStudentEtiquetaCor, setFilterStudentEtiquetaCor] = useState('');

  // Professores
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherFormData, setTeacherFormData] = useState({
    nome: '',
    disciplina: '',
    turmas_ids: [],
  });
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherProfileTab, setTeacherProfileTab] = useState('entregas');
  const [entregasDocentes, setEntregasDocentes] = useState([]);
  const [entregasLoading, setEntregasLoading] = useState(false);
  const [entregasError, setEntregasError] = useState(null);
  const [entregaFilter, setEntregaFilter] = useState('todos');
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState(null);
  const [entregaFormData, setEntregaFormData] = useState({
    tipo_documento: 'Plano de Aula',
    referencia: '',
    status: 'pendente',
    prazo: '',
    observacoes: '',
  });
  const [savingEntrega, setSavingEntrega] = useState(false);
  const [registrosCoordenacao, setRegistrosCoordenacao] = useState([]);
  const [registrosCoordLoading, setRegistrosCoordLoading] = useState(false);
  const [registrosCoordError, setRegistrosCoordError] = useState(null);
  const [showRegistroCoordModal, setShowRegistroCoordModal] = useState(false);
  const [editingRegistroCoord, setEditingRegistroCoord] = useState(null);
  const [registroCoordFormData, setRegistroCoordFormData] = useState({
    data_conversa: '',
    assunto: '',
    relato: '',
    encaminhamentos: '',
  });
  const [savingRegistroCoord, setSavingRegistroCoord] = useState(false);
  const [teacherProfileMissing, setTeacherProfileMissing] = useState(false);

  // Biblioteca / Empréstimos de livros (estado apenas em memória)
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryBookForm, setLibraryBookForm] = useState({
    titulo: '',
    autor: '',
    codigo: '',
  });

  const [bookLoans, setBookLoans] = useState([]);
  const [loanForm, setLoanForm] = useState({
    livroId: '',
    alunoId: '',
    aluno: '',
    dataEmprestimo: getLocalDateString(),
    dataPrevistaDevolucao: '',
  });
  const [loanStudentQuery, setLoanStudentQuery] = useState('');

  const [libraryTab, setLibraryTab] = useState('loans'); // 'loans' | 'books'

  // Estados para Agenda e Planejamento
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [agendaView, setAgendaView] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventFormData, setEventFormData] = useState({ ...INITIAL_EVENT_FORM_DATA });
  const [savingEvent, setSavingEvent] = useState(false);
  const [exportingAgenda, setExportingAgenda] = useState(false);
  const [agendaBirthdayAlunos, setAgendaBirthdayAlunos] = useState([]); // alunos (id, nome, data_nascimento) para exibir aniversários na agenda
  const [selectedAgendaEvent, setSelectedAgendaEvent] = useState(null);
  const [agendaAnotacoesText, setAgendaAnotacoesText] = useState('');
  const [savingAgendaAnotacoes, setSavingAgendaAnotacoes] = useState(false);
  const [agendaEventAnexos, setAgendaEventAnexos] = useState([]);
  const [loadingAgendaAnexos, setLoadingAgendaAnexos] = useState(false);
  const [uploadingAgendaAnexos, setUploadingAgendaAnexos] = useState(false);

  const loadAgendaEventsRef = useRef(null);
  const semedAgenda = useSemedAgenda({
    currentView,
    agendaEvents,
    loadAgendaEvents: () => loadAgendaEventsRef.current?.(),
  });

  // Relatórios: filtros e lista gerada
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportSchoolId, setReportSchoolId] = useState('');
  const [reportGradeLevels, setReportGradeLevels] = useState(null); // null = todas, [] = nenhuma, [...] = selecionadas
  const [reportEtiqueta, setReportEtiqueta] = useState('');
  const [reportNivelLeitura, setReportNivelLeitura] = useState('');
  const [reportNotasFilter, setReportNotasFilter] = useState('nao');  // 'nao' | 'acima' | 'abaixo'
  const [reportFaltasFilter, setReportFaltasFilter] = useState('nao'); // 'nao' | 'sim'
  const [reportClasses, setReportClasses] = useState([]);
  const [reportList, setReportList] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  // Listener de sessão: mantém login ao recarregar e após OAuth
  useEffect(() => {
    const loadSavedState = () => {
      if (typeof window !== 'undefined') {
        const savedView = localStorage.getItem('sacp_currentView');
        const savedSchoolId = localStorage.getItem('sacp_selectedSchoolId');
        const savedClassId = localStorage.getItem('sacp_selectedClassId');
        const savedClassName = localStorage.getItem('sacp_selectedClassName');
        const savedStudentId = localStorage.getItem('sacp_selectedStudentId');
        const savedTeacherId = localStorage.getItem('sacp_selectedTeacherId');
        const savedTab = localStorage.getItem('sacp_currentTab');
        const savedTeacherTab = localStorage.getItem('sacp_teacherProfileTab');
        if (savedView) setCurrentView(savedView);
        if (savedSchoolId) setSelectedSchoolId(savedSchoolId);
        if (savedClassId) setSelectedClassId(savedClassId);
        if (savedClassName) setSelectedClassName(savedClassName);
        if (savedStudentId) setSelectedStudentId(savedStudentId);
        if (savedTeacherId) setSelectedTeacherId(savedTeacherId);
        if (savedTab) setCurrentTab(savedTab);
        if (savedTeacherTab === 'entregas' || savedTeacherTab === 'acompanhamento') {
          setTeacherProfileTab(savedTeacherTab);
        }
        setNavHydrated(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setAuthUser(session?.user ?? null);
      // Carregar estado salvo do localStorage quando houver sessão
      if (session) {
        loadSavedState();
      } else {
        setNavHydrated(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthUser(session?.user ?? null);
      // Carregar estado salvo do localStorage quando houver sessão
      if (session) {
        loadSavedState();
      } else {
        setNavHydrated(false);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Recuperação de senha via deep link (app Android)
  useEffect(() => {
    const onRecovery = () => setShowRecoveryPasswordForm(true);
    window.addEventListener('sacp:auth-recovery', onRecovery);
    return () => window.removeEventListener('sacp:auth-recovery', onRecovery);
  }, []);

  // Mantém refs sincronizadas (para handlers fora do React lifecycle)
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);
  useEffect(() => {
    selectedClassIdRef.current = selectedClassId;
  }, [selectedClassId]);

  // Ao voltar para a aba (focus/visibilidade), tenta restaurar a turma aberta a partir do localStorage
  // Útil quando o navegador descarta a aba ou algum estado foi resetado em memória.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readUrlState = () => {
      try {
        const url = new URL(window.location.href);
        const view = url.searchParams.get('view');
        const classId = url.searchParams.get('classId');
        return { view, classId };
      } catch {
        return { view: null, classId: null };
      }
    };

    const restoreNavFromStorage = () => {
      if (!isLoggedInRef.current) return;
      try {
        // 1) URL tem prioridade (sobrevive a descarte/reload sem depender de storage)
        const { view: urlView, classId: urlClassId } = readUrlState();
        if (urlView && currentViewRef.current !== urlView) {
          setCurrentView(urlView);
        }
        if (urlClassId && !selectedClassIdRef.current) {
          setSelectedClassId(urlClassId);
          const savedNameFromLs = localStorage.getItem('sacp_selectedClassName');
          if (savedNameFromLs) setSelectedClassName(savedNameFromLs);
        }

        // 2) Fallback: localStorage
        const savedView = localStorage.getItem('sacp_currentView');
        const savedClassId = localStorage.getItem('sacp_selectedClassId');
        const savedClassName = localStorage.getItem('sacp_selectedClassName');

        if (savedView && currentViewRef.current !== savedView) {
          setCurrentView(savedView);
        }

        if (savedClassId && !selectedClassIdRef.current) {
          setSelectedClassId(savedClassId);
          if (savedClassName) setSelectedClassName(savedClassName);
        } else if (savedClassId && selectedClassIdRef.current && savedClassName) {
          if (String(savedClassId) === String(selectedClassIdRef.current)) {
            setSelectedClassName((prev) => (prev ? prev : savedClassName));
          }
        }
      } catch {
        // Se o storage falhar, não quebrar a navegação
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') restoreNavFromStorage();
    };
    const onFocus = () => restoreNavFromStorage();
    const onPageShow = () => restoreNavFromStorage();

    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Sincroniza URL com a navegação atual para sobreviver a descarte/reload da aba
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn) return;

    try {
      const url = new URL(window.location.href);

      // Persistir apenas o que interessa para "voltar na mesma turma"
      if (currentView) url.searchParams.set('view', currentView);

      // Mantém classId na URL sempre que houver turma selecionada (ex.: view "students" com contexto de turma)
      if (selectedClassId) {
        url.searchParams.set('classId', String(selectedClassId));
      } else {
        url.searchParams.delete('classId');
      }

      // Não poluir o histórico (evita "voltar" ficar estranho)
      window.history.replaceState(null, '', url.toString());
    } catch {
      // ignore
    }
  }, [currentView, selectedClassId, isLoggedIn]);

  // Carregar estado do localStorage quando isLoggedIn mudar para true (para garantir que seja carregado)
  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      const savedView = localStorage.getItem('sacp_currentView');
      const savedSchoolId = localStorage.getItem('sacp_selectedSchoolId');
      const savedClassId = localStorage.getItem('sacp_selectedClassId');
      const savedClassName = localStorage.getItem('sacp_selectedClassName');
      const savedStudentId = localStorage.getItem('sacp_selectedStudentId');
      const savedTeacherId = localStorage.getItem('sacp_selectedTeacherId');
      const savedTab = localStorage.getItem('sacp_currentTab');
      const savedTeacherTab = localStorage.getItem('sacp_teacherProfileTab');
      if (savedView) setCurrentView(savedView);
      if (savedSchoolId) setSelectedSchoolId(savedSchoolId);
      if (savedClassId) setSelectedClassId(savedClassId);
      if (savedClassName) setSelectedClassName(savedClassName);
      if (savedStudentId) setSelectedStudentId(savedStudentId);
      if (savedTeacherId) setSelectedTeacherId(savedTeacherId);
      if (savedTab) setCurrentTab(savedTab);
      if (savedTeacherTab === 'entregas' || savedTeacherTab === 'acompanhamento') {
        setTeacherProfileTab(savedTeacherTab);
      }
      setNavHydrated(true);
    } else if (!isLoggedIn) {
      setNavHydrated(false);
    }
     
  }, [isLoggedIn]);

  // Salvar estado de navegação no localStorage quando mudar
  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      localStorage.setItem('sacp_currentView', currentView);
    }
  }, [currentView, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      if (selectedSchoolId) {
        localStorage.setItem('sacp_selectedSchoolId', selectedSchoolId.toString());
      } else {
        localStorage.removeItem('sacp_selectedSchoolId');
      }
    }
  }, [selectedSchoolId, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      if (selectedClassId) {
        localStorage.setItem('sacp_selectedClassId', selectedClassId.toString());
      }
      // Não remover sacp_selectedClassId aqui quando null: evita corrida antes do load do localStorage.
      // Limpeza explícita: logout, troca de escola no header e botões "voltar" da turma.
    }
  }, [selectedClassId, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      if (selectedClassName) {
        localStorage.setItem('sacp_selectedClassName', selectedClassName);
      } else if (!selectedClassId) {
        localStorage.removeItem('sacp_selectedClassName');
      }
    }
  }, [selectedClassName, selectedClassId, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      if (selectedStudentId) {
        localStorage.setItem('sacp_selectedStudentId', selectedStudentId.toString());
      } else {
        localStorage.removeItem('sacp_selectedStudentId');
      }
    }
  }, [selectedStudentId, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      if (selectedTeacherId) {
        localStorage.setItem('sacp_selectedTeacherId', selectedTeacherId.toString());
      } else {
        localStorage.removeItem('sacp_selectedTeacherId');
      }
    }
  }, [selectedTeacherId, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      localStorage.setItem('sacp_teacherProfileTab', teacherProfileTab);
    }
  }, [teacherProfileTab, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      localStorage.setItem('sacp_currentTab', currentTab);
    }
  }, [currentTab, isLoggedIn]);

  const clearAuthMessages = () => {
    setAuthError('');
    setAuthSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    clearAuthMessages();
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
      return;
    }
    // Não forçar dashboard - manter a view salva no localStorage se existir
    const savedView = localStorage.getItem('sacp_currentView');
    if (savedView) {
      setCurrentView(savedView);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    clearAuthMessages();
    if (registerPassword !== registerConfirm) {
      setAuthError('As senhas não coincidem.');
      setAuthLoading(false);
      return;
    }
    if (registerPassword.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres.');
      setAuthLoading(false);
      return;
    }
       
       
       
      const { data, error } = await supabase.auth.signUp({
      email: registerEmail.trim(),
      password: registerPassword,
      options: registerName.trim() ? { data: { full_name: registerName.trim() } } : undefined,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data?.user && !data.user.identities?.length) {
      setAuthError('Este e-mail já está cadastrado. Faça login ou recupere a senha.');
      return;
    }
    setAuthSuccess('Conta criada! Verifique seu e-mail para confirmar (se habilitado) ou faça login.');
    setAuthMode('login');
    setLoginEmail(registerEmail.trim());
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirm('');
    setRegisterName('');
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      if (Capacitor.isNativePlatform()) {
        await signInWithGoogleNative();
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: getAuthRedirectUrl() },
        });
        if (error) setAuthError(error.message);
      }
    } catch (err) {
      setAuthError(err?.message || 'Erro ao entrar com Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    if (!recoverEmail.trim()) {
      setAuthError('Informe seu e-mail.');
      return;
    }
    setAuthLoading(true);
    clearAuthMessages();
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.auth.resetPasswordForEmail(recoverEmail.trim(), {
      redirectTo: getAuthRedirectUrl(),
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthSuccess('Enviamos um link para redefinir sua senha no e-mail informado.');
    setAuthMode('login');
    setRecoverEmail('');
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    clearAuthMessages();
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setAuthError('As senhas não coincidem.');
      return;
    }
    if (recoveryNewPassword.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setAuthLoading(true);
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.auth.updateUser({ password: recoveryNewPassword });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthSuccess('Senha definida com sucesso. Você já está logado.');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setShowRecoveryPasswordForm(false);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const navigate = (viewId) => {
    setCurrentView(viewId);
  };

  /** Remove turma persistida (localStorage). Usar ao sair da turma de propósito; não chamar em listeners de focus. */
  const clearPersistedTurmaNav = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sacp_selectedClassId');
      localStorage.removeItem('sacp_selectedClassName');
    }
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

  const selectStudent = (aluno, options = {}) => {
    const { keepTab = false } = options;
    setSelectedStudentId(aluno.id);
    setSelectedStudent(aluno);
    if (!keepTab) setCurrentTab('resumo');
    setCurrentView('student-detail');
    setAeeFormData({
      aee_tem_laudo: aluno.aee_tem_laudo || false,
      aee_mediadora: aluno.aee_mediadora || '',
      aee_plano_individual: aluno.aee_plano_individual || '',
    });
  };

  // Fechar modal só quando o clique foi no backdrop (não ao arrastar para selecionar texto)
  const backdropMouseDownRef = useRef(false);
  const handleBackdropClick = (e, onClose) => {
    if (e.target !== e.currentTarget) return;
    if (backdropMouseDownRef.current) onClose();
    backdropMouseDownRef.current = false;
  };
  const handleBackdropMouseDown = (e) => {
    backdropMouseDownRef.current = e.target === e.currentTarget;
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
      teachers: 'Gestão de Professores',
      'teacher-detail': 'Perfil do Professor',
      'student-detail': 'Detalhes do Aluno',
      'agenda-event-detail': 'Anotações do Evento',
      reports: 'Relatórios',
      emprestimos: 'Biblioteca e Empréstimos',
      settings: 'Configurações',
      profile: 'Meu perfil',
    };
    if (currentView === 'classes' && selectedSchool) {
      return `Gestão de Turmas - ${selectedSchool}`;
    }
    if (currentView === 'agenda-event-detail' && selectedAgendaEvent?.titulo) {
      return selectedAgendaEvent.titulo;
    }
    return titles[currentView] || 'SACP';
  };

  // Nome e função do usuário para o header e perfil
  const userName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Usuário';
  const userRole = authUser?.user_metadata?.role || 'Coord.';
  const userInitial = (userName && userName[0]) ? userName[0].toUpperCase() : 'U';

  const getActiveNav = () => {
    if (currentView === 'student-detail') return selectedClassId ? 'classes' : 'students';
    if (currentView === 'teacher-detail') return 'teachers';
    if (currentView === 'agenda-event-detail') return 'agenda';
    if (currentView === 'students' && selectedClassId) return 'classes';
    return currentView;
  };

  // Nome descritivo da etiqueta (em vez da cor)
  const getEtiquetaLabel = (etiquetaCor) => {
    const c = (etiquetaCor || '').toLowerCase();
    if (c === 'azul') return 'Adequado';
    if (c === 'verde') return 'Avançado';
    if (c === 'amarelo') return 'Atenção';
    if (c === 'vermelho') return 'Risco';
    if (c === 'roxo') return 'AEE';
    return etiquetaCor ? String(etiquetaCor) : '-';
  };

  // Carregar escolas quando logado
  useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);
       
       
       
      const { data, error } = await supabase.from('escolas').select('*');
      if (error) {
        setSchoolsError('Erro ao carregar escolas.');
        setSchools([]);
      } else {
        setSchools(data || []);
        const activeList = (data || []).filter((s) => !s.arquivada);
        // Se não há escola ativa, definir Polo (não arquivada) ou primeira escola ativa
        if (activeList.length > 0) {
          setActiveSchoolId((prev) => {
            if (prev) return prev;
            const poloSchool = activeList.find((s) => s.tipo_estrutura === 'Polo');
            return poloSchool ? poloSchool.id : activeList[0].id;
          });
          setActiveSchool((prev) => {
            if (prev) return prev;
            const poloSchool = activeList.find((s) => s.tipo_estrutura === 'Polo');
            return poloSchool || activeList[0];
          });
        } else {
          setActiveSchoolId(null);
          setActiveSchool(null);
        }
      }
      setSchoolsLoading(false);
    };

    if (isLoggedIn) {
      fetchSchools();
    }
  }, [isLoggedIn]);

  // Sincronizar activeSchool com a lista (para nome e dados atualizados)
  useEffect(() => {
    if (schools.length === 0 || !activeSchoolId) return;
    const school = schools.find((s) => String(s.id) === String(activeSchoolId));
    if (school) setActiveSchool(school);
  }, [schools, activeSchoolId]);

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
            try {
              const alunos = await fetchAlunosDaTurma(supabase, turma.id, turma);
              counts[turma.id] = contarEtiquetasAlunos(alunos);
            } catch {
              counts[turma.id] = { verde: 0, amarelo: 0, vermelho: 0, azul: 0 };
            }
          }
        }
        setTurmaEtiquetasCount(counts);
      }
      setClassesLoading(false);
    };

    // Carregar turmas na view Turmas/Alunos/Professores (para modais terem lista)
    if (
      (currentView === 'classes' || currentView === 'students' || currentView === 'teachers') &&
      (activeSchoolId || selectedSchoolId)
    ) {
      fetchClasses();
    }
  }, [currentView, activeSchoolId, selectedSchoolId, selectedYear]);

  // Recarregar turmas quando escola ativa mudar (Turmas ou Alunos, para o modal ter lista)
  useEffect(() => {
    if (activeSchoolId && (currentView === 'classes' || currentView === 'students' || currentView === 'teachers')) {
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
            try {
              const alunos = await fetchAlunosDaTurma(supabase, turma.id, turma);
              counts[turma.id] = contarEtiquetasAlunos(alunos);
            } catch {
              counts[turma.id] = { verde: 0, amarelo: 0, vermelho: 0, azul: 0 };
            }
          }
          setTurmaEtiquetasCount(counts);
        }
        setClassesLoading(false);
      };
      fetchClasses();
    }
  }, [activeSchoolId, selectedYear, currentView]);

  // Carregar professores quando a view de professores for aberta
  useEffect(() => {
    const fetchTeachers = async () => {
      const schoolId = activeSchoolId || selectedSchoolId;
      if (!schoolId) return;

      setTeachersLoading(true);
      setTeachersError(null);

       
       
       
      const { data, error } = await supabase
        .from('professores')
        .select('*')
        .eq('escola_id', schoolId)
        .eq('ano_letivo', selectedYear)
        .order('nome', { ascending: true });

      if (error) {
        setTeachersError('Erro ao carregar professores.');
      } else {
        setTeachers(data || []);
        setTeachersError(null);
      }
      setTeachersLoading(false);
    };

    if (currentView === 'teachers') {
      fetchTeachers();
    }
  }, [currentView, activeSchoolId, selectedSchoolId, selectedYear]);

  // Restaurar dados do professor ao reabrir o perfil (ex.: após recarregar a página)
  useEffect(() => {
    if (currentView !== 'teacher-detail') {
      setTeacherProfileMissing(false);
      return;
    }
    if (!selectedTeacherId || selectedTeacher) return;
    let cancelled = false;
    const fetchOne = async () => {
      setTeacherProfileMissing(false);
      const { data } = await supabase.from('professores').select('*').eq('id', selectedTeacherId).maybeSingle();
      if (cancelled) return;
      if (data) {
        setSelectedTeacher(data);
        setTeacherProfileMissing(false);
      } else {
        setTeacherProfileMissing(true);
      }
    };
    fetchOne();
    return () => {
      cancelled = true;
    };
  }, [currentView, selectedTeacherId, selectedTeacher]);

  // Entregas e registros de coordenação no perfil do professor
  useEffect(() => {
    if (currentView !== 'teacher-detail' || !selectedTeacherId) return;

    let cancelled = false;

    const loadEntregas = async () => {
      setEntregasLoading(true);
      setEntregasError(null);
       
       
       
      const { data, error } = await supabase
        .from('entregas_docentes')
        .select('*')
        .eq('professor_id', selectedTeacherId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) setEntregasError('Erro ao carregar entregas pedagógicas.');
      else setEntregasDocentes(data || []);
      setEntregasLoading(false);
    };

    const loadRegistros = async () => {
      setRegistrosCoordLoading(true);
      setRegistrosCoordError(null);
       
       
       
      const { data, error } = await supabase
        .from('registros_coordenacao')
        .select('*')
        .eq('professor_id', selectedTeacherId)
        .order('data_conversa', { ascending: false })
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) setRegistrosCoordError('Erro ao carregar registros de coordenação.');
      else setRegistrosCoordenacao(data || []);
      setRegistrosCoordLoading(false);
    };

    loadEntregas();
    loadRegistros();

    return () => {
      cancelled = true;
      setEntregasLoading(false);
      setRegistrosCoordLoading(false);
    };
  }, [currentView, selectedTeacherId]);

  // Carregar turmas para relatórios e gráficos (da escola selecionada ou de todas as escolas)
  useEffect(() => {
    if (currentView !== 'reports' && currentView !== 'graficos') {
      setReportClasses([]);
      return;
    }
    const fetch = async () => {
      let query = supabase.from('turmas').select('*, escolas(nome)').eq('ano_letivo', reportYear);
      if (reportSchoolId) query = query.eq('escola_id', reportSchoolId);
      const { data } = await query;
      const raw = data || [];
      const unique = [...new Map(raw.map((t) => [t.id, t])).values()];
      setReportClasses(unique);
    };
    fetch();
  }, [currentView, reportSchoolId, reportYear]);

  // Sincronizar filtros de Gráficos com escola e ano do cabeçalho
  useEffect(() => {
    if (currentView !== 'graficos') return;
    if (activeSchoolId) setReportSchoolId(String(activeSchoolId));
    setReportYear(selectedYear);
  }, [currentView, activeSchoolId, selectedYear]);

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
            await applyStudentsLoaded(data);
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
      
      const turmaCtx = selectedClassId
        ? (classes || []).find((c) => String(c.id) === String(selectedClassId))
        : null;
      const turmaIdParaBusca =
        selectedClassId || (currentView === 'student-detail' ? selectedStudent?.turma_id : null);

      if (turmaIdParaBusca && isTurmaEspecial(turmaCtx)) {
        try {
          const alunos = await fetchAlunosDaTurma(supabase, turmaIdParaBusca, turmaCtx);
          await applyStudentsLoaded(alunos);
          setStudentsError(null);
        } catch {
          if (studentsCountRef.current === 0) {
            setStudentsError('Erro ao carregar alunos da turma especial.');
          }
        }
        setStudentsLoading(false);
        return;
      }

      let query;

      if (turmaIdParaBusca) {
        query = supabase.from('alunos').select('*').eq('turma_id', turmaIdParaBusca);
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
        // Se já temos lista em cache, não substituir por erro (ex.: voltou da aba e a requisição falhou)
        if (studentsCountRef.current === 0) {
          setStudentsError('Erro ao carregar alunos.');
        }
      } else {
        await applyStudentsLoaded(data || []);
        setStudentsError(null);
      }
      setStudentsLoading(false);
    };

    if (
      currentView === 'students' ||
      currentView === 'emprestimos' ||
      (currentView === 'classes' && selectedClassId) ||
      (currentView === 'student-detail' && (selectedClassId || selectedStudent?.turma_id))
    ) {
      fetchStudents();
    }
  }, [currentView, activeSchoolId, selectedSchoolId, selectedClassId, selectedStudent?.turma_id, selectedYear, classes]);

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

        setTotalRisco(alunos?.filter((a) => a.etiqueta_cor === 'vermelho').length || 0);
        setTotalAtencao(alunos?.filter((a) => a.etiqueta_cor === 'amarelo').length || 0);
        setTotalVerde(alunos?.filter((a) => a.etiqueta_cor === 'verde').length || 0);
        setTotalAzul(alunos?.filter((a) => a.etiqueta_cor === 'azul').length || 0);
        setTotalRoxo(alunos?.filter((a) => a.etiqueta_cor === 'roxo').length || 0);
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

  useEffect(() => {
    if (currentView === 'dashboard' && activeSchoolId && dashboardSelectedDate) {
      loadEventsForDate(dashboardSelectedDate);
    }
  }, [currentView, activeSchoolId, dashboardSelectedDate, selectedYear]);

  // Carregar eventos da agenda e alunos para aniversários quando a view de agenda for aberta
  useEffect(() => {
    if ((currentView === 'agenda' || currentView === 'agenda-event-detail') && activeSchoolId) {
      loadAgendaEvents();
      loadAgendaBirthdayAlunos();
    }
  }, [currentView, activeSchoolId, selectedYear]);

  // Carregar eventos do dia no Dashboard
  useEffect(() => {
    if (currentView === 'dashboard' && activeSchoolId) {
      loadTodayEvents();
    }
  }, [currentView, activeSchoolId, selectedYear]);

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

  // Carregar documentos AEE quando a aba AEE for aberta (apenas aluno roxo)
  useEffect(() => {
    if (currentTab === 'aee' && selectedStudentId && selectedStudent?.etiqueta_cor === 'roxo') {
      loadAeeDocuments();
    }
  }, [currentTab, selectedStudentId, selectedStudent?.etiqueta_cor]);

  // Se o aluno não for da educação especial (roxo) e estiver na aba AEE, voltar para Resumo
  useEffect(() => {
    if (currentView === 'student-detail' && selectedStudent?.etiqueta_cor !== 'roxo' && currentTab === 'aee') {
      setCurrentTab('resumo');
    }
  }, [currentView, selectedStudent?.etiqueta_cor, currentTab]);

  // Carregar sondagens na aba Sondagens ou no Resumo (prévia)
  useEffect(() => {
    if ((currentTab === 'sondagem' || currentTab === 'resumo') && selectedStudentId) {
      setSondagensLoading(true);
      setSondagensError(null);
      supabase
        .from('sondagens')
        .select('*')
        .eq('aluno_id', selectedStudentId)
        .order('data', { ascending: false })
        .then(({ data, error }) => {
          setSondagensLoading(false);
          if (error) {
            setSondagensError(error.message);
            setSondagens([]);
          } else {
            setSondagens(data || []);
          }
        });
    }
  }, [currentTab, selectedStudentId]);

  const applyStudentsLoaded = async (raw) => {
    const schoolId = activeSchoolId || selectedSchoolId;
    let list = raw || [];
    if (schoolId && list.length > 0) {
      try {
        list = await enrichAlunosEtiquetaMotivo(supabase, list, {
          schoolId,
          classesList: classes || [],
        });
      } catch (err) {
        console.warn('enrichAlunosEtiquetaMotivo', err);
      }
    }
    setStudents(list);
    return list;
  };

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
      // Se vier como "YYYY-MM-DD" (input type="date") ou ISO, tratar como data pura
      // para evitar deslocamento por fuso horário na exibição.
      const ymd = String(dateStr).split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        const [yyyy, mm, dd] = ymd.split('-');
        return `${dd}/${mm}/${yyyy}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const handleOpenOccurrenceModal = (ocorrencia = null) => {
    if (ocorrencia) {
      setEditingOccurrence(ocorrencia);
      setFormData({
        titulo: ocorrencia.titulo || '',
        tipo: ocorrencia.tipo || 'Pedagógico',
        data_ocorrencia: ocorrencia.data_ocorrencia ? ocorrencia.data_ocorrencia.split('T')[0] : getLocalDateString(),
        descricao: ocorrencia.descricao || '',
      });
    } else {
      setEditingOccurrence(null);
      setFormData({
        titulo: '',
        tipo: 'Pedagógico',
        data_ocorrencia: getLocalDateString(),
        descricao: '',
      });
    }
    setShowModal(true);
  };

  const reavaliarCorAluno = async (alunoId) => {
    try {
      if (!activeSchoolId) return;
      
      // 1. Buscar configuração da escola
      const { data: escola } = await supabase.from('escolas').select('configuracoes').eq('id', activeSchoolId).single();
      const tagConfig = escola?.configuracoes?.tags;
      if (!tagConfig) return;

      // 2. Buscar dados do aluno e turma
      const { data: aluno } = await supabase
        .from('alunos')
        .select('id, etiqueta_cor, turma_id')
        .eq('id', alunoId)
        .single();
      if (!aluno) return;

      let turmaNome = '';
      let anoEscolar = null;
      const turmaLocal = (classes || []).find((c) => String(c.id) === String(aluno.turma_id));
      if (turmaLocal) {
        turmaNome = turmaLocal.nome || '';
        anoEscolar = turmaLocal.ano_escolar ?? turmaLocal.ano ?? null;
      } else if (aluno.turma_id) {
        const { data: turma } = await supabase
          .from('turmas')
          .select('nome, ano_escolar')
          .eq('id', aluno.turma_id)
          .single();
        turmaNome = turma?.nome || '';
        anoEscolar = turma?.ano_escolar ?? null;
      }

      const [
        { data: notas },
        { data: sondagens },
        { data: ocorrencias }
      ] = await Promise.all([
        supabase.from('notas_boletim').select('nota').eq('aluno_id', alunoId),
        supabase.from('sondagens').select('nivel_leitura, nivel_escrita').eq('aluno_id', alunoId).order('data', { ascending: false }).limit(1),
        supabase.from('ocorrencias').select('tipo').eq('aluno_id', alunoId)
      ]);

      const data = {
        notas: notas?.filter(n => n.nota !== null).map(n => parseFloat(n.nota)) || [],
        sondagem: sondagens?.[0] || null,
        ocorrencias: ocorrencias?.map(o => o.tipo) || []
      };

      const novaCor = evaluateStudentColor(tagConfig, data, { turmaNome, anoEscolar });

      if (novaCor !== aluno.etiqueta_cor) {
        await supabase.from('alunos').update({ etiqueta_cor: novaCor }).eq('id', alunoId);
      }

      const motivoOrigem = getMotivoOrigemEtiqueta(tagConfig, data, novaCor, {
        turmaNome,
        anoEscolar,
      });

      const patch = { etiqueta_cor: novaCor, etiqueta_motivo_origem: motivoOrigem };
      if (selectedStudentId === alunoId) {
        setSelectedStudent((prev) => (prev ? { ...prev, ...patch } : prev));
      }
      setStudents((prev) =>
        prev.map((a) => (a.id === alunoId ? { ...a, ...patch } : a)),
      );
    } catch (error) {
      console.error('Erro ao reavaliar cor do aluno:', error);
    }
  };

  const handleSaveOccurrence = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSavingOccurrence(true);
    const payload = {
      titulo: formData.titulo,
      tipo: formData.tipo,
      data_ocorrencia: formData.data_ocorrencia,
      descricao: formData.descricao,
    };

    if (editingOccurrence?.id) {
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase
        .from('ocorrencias')
        .update(payload)
        .eq('id', editingOccurrence.id);

      if (error) {
        alert('Erro ao atualizar ocorrência: ' + error.message);
        setSavingOccurrence(false);
      } else {
        setShowModal(false);
        setEditingOccurrence(null);
        setFormData({
          titulo: '',
          tipo: 'Pedagógico',
          data_ocorrencia: getLocalDateString(),
          descricao: '',
        });
        setSavingOccurrence(false);

        const { data: newData, error: fetchError } = await supabase
          .from('ocorrencias')
          .select('*')
          .eq('aluno_id', selectedStudentId);
        if (!fetchError) setOccurrences(newData || []);
        
        await reavaliarCorAluno(selectedStudentId);
      }
    } else {
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('ocorrencias').insert([
        { aluno_id: selectedStudentId, ...payload },
      ]);

      if (error) {
        alert('Erro ao salvar ocorrência: ' + error.message);
        setSavingOccurrence(false);
      } else {
        setShowModal(false);
        setEditingOccurrence(null);
        setFormData({
          titulo: '',
          tipo: 'Pedagógico',
          data_ocorrencia: getLocalDateString(),
          descricao: '',
        });
        setSavingOccurrence(false);

        const { data: newData, error: fetchError } = await supabase
          .from('ocorrencias')
          .select('*')
          .eq('aluno_id', selectedStudentId);
        if (!fetchError) setOccurrences(newData || []);
        
        await reavaliarCorAluno(selectedStudentId);
      }
    }
  };

  const handleDeleteOccurrence = async (ocorrencia) => {
    if (!ocorrencia?.id || !confirm('Tem certeza que deseja excluir esta ocorrência?')) return;

       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('ocorrencias').delete().eq('id', ocorrencia.id);

    if (error) {
      alert('Erro ao excluir ocorrência: ' + error.message);
    } else {
      setOccurrences((prev) => prev.filter((o) => o.id !== ocorrencia.id));
      if (editingOccurrence?.id === ocorrencia.id) {
        setShowModal(false);
        setEditingOccurrence(null);
      }
      await reavaliarCorAluno(selectedStudentId);
    }
  };

  const handleCancelModal = () => {
    setShowModal(false);
    setEditingOccurrence(null);
    setFormData({
      titulo: '',
      tipo: 'Pedagógico',
      data_ocorrencia: getLocalDateString(),
      descricao: '',
    });
  };

  // Extrai série (Pré I, Pré II, 1º... 9º) do nome da turma.
  // Aceita variações comuns: "9º Ano" (título de turma), "9° ano", "nono ano", "série 9".
  const getGradeFromTurmaNome = (nome) => {
    if (!nome || typeof nome !== 'string') return null;
    const n = nome.trim().toLowerCase();

    if (/\b(pré|pre)\s*(i|1)\b/.test(n)) return 'Pré I';
    if (/\b(pré|pre)\s*(ii|2)\b/.test(n)) return 'Pré II';

    const palavrasAno = [
      ['primeiro', 1],
      ['segundo', 2],
      ['terceiro', 3],
      ['quarto', 4],
      ['quinto', 5],
      ['sexto', 6],
      ['sétimo', 7],
      ['setimo', 7],
      ['oitavo', 8],
      ['nono', 9],
      ['nona', 9],
    ];
    for (const [w, ano] of palavrasAno) {
      if (new RegExp(`\\b${w}\\b(?:\\s*ano)?`, 'i').test(n)) return `${ano}º`;
    }

    for (let ano = 1; ano <= 9; ano++) {
      if (new RegExp(`\\b(?:serie|seria)\\s*${ano}(?![0-9])\\b`, 'i').test(n)) return `${ano}º`;
      if (new RegExp(`(?<![0-9])${ano}(?![0-9])\\s*ª(?:\\s*ano)?\\b`, 'i').test(n)) return `${ano}º`;
      if (
        new RegExp(`(?<![0-9])${ano}(?![0-9])\\s*[\\u00BA\\u00B0°ºo]?\\s*(?:ano)?\\b`, 'iu').test(n)
      ) {
        return `${ano}º`;
      }
    }
    return null;
  };

  /** Valores típicos em turmas.ano_escolar no cadastro: "9º Ano", "Pré I", etc. */
  const normalizeAnoEscolarToGrade = (value) => {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    if (/^pré\s*i$|^pre\s*i$/i.test(s)) return 'Pré I';
    if (/^pré\s*ii$|^pre\s*ii$/i.test(s)) return 'Pré II';
    // Delegar para o parser completo (aceita º/°/o e outras variações)
    return getGradeFromTurmaNome(s);
  };

  /** Séries canônicas da turma: usa ano_escolar (principal) + nome. */
  const getCanonicalGradesForTurma = (turma) => {
    const set = new Set();
    if (turma?.nome) {
      const g = getGradeFromTurmaNome(turma.nome);
      if (g) set.add(g);
    }
    const raw = turma?.ano_escolar ?? turma?.ano;
    const arr = Array.isArray(raw) ? raw : raw != null && String(raw).trim() !== '' ? [raw] : [];
    for (const item of arr) {
      const g1 = normalizeAnoEscolarToGrade(item);
      if (g1) set.add(g1);
      const g2 = getGradeFromTurmaNome(String(item));
      if (g2) set.add(g2);
    }
    return [...set];
  };

  // teacherGradeCellLabel removido para limpar lint

  // Turmas/séries disponíveis: sempre mostra Pré I, Pré II, 1º... 9º
  const GRADE_ORDER = ['Pré I', 'Pré II', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º'];
  const reportAvailableGrades = GRADE_ORDER;

  // Filtra turmas pelas selecionadas (null = todas, [] = nenhuma)
  const turmasForReport = (() => {
    const list = reportClasses || [];
    if (reportGradeLevels === null) return list;
    if (!reportGradeLevels || reportGradeLevels.length === 0) return [];
    return list.filter((t) => {
      const grades = getCanonicalGradesForTurma(t);
      return grades.some((g) => reportGradeLevels.includes(g));
    });
  })();

  // Gerar lista de alunos para relatório
  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportList([]);

    const turmaIds = turmasForReport.map((t) => t.id);
    if (turmaIds.length === 0) {
      setReportLoading(false);
      alert('Nenhuma turma encontrada para o ano letivo selecionado.');
      return;
    }

    let query = supabase.from('alunos').select('*, turmas(nome)');
    if (turmaIds.length > 0) query = query.in('turma_id', turmaIds);
    if (reportEtiqueta) query = query.eq('etiqueta_cor', reportEtiqueta);

    const { data: alunos, error } = await query;
    if (error) {
      alert('Erro ao buscar alunos: ' + error.message);
      setReportLoading(false);
      return;
    }

    let list = (alunos || []).map((a) => ({
      ...a,
      turma_nome: a.turmas?.nome || '-',
      nivel_leitura: '',
      nivel_escrita: '',
    }));

    if (reportNivelLeitura && list.length > 0) {
      const alunoIds = list.map((a) => a.id);
      const { data: sonds } = await supabase
        .from('sondagens')
        .select('aluno_id, nivel_leitura, nivel_escrita, data')
        .in('aluno_id', alunoIds)
        .order('data', { ascending: false });

      const latestByAluno = {};
      (sonds || []).forEach((s) => {
        if (!latestByAluno[s.aluno_id]) {
          latestByAluno[s.aluno_id] = { nivel_leitura: s.nivel_leitura, nivel_escrita: s.nivel_escrita };
        }
      });
      list = list
        .map((a) => ({
          ...a,
          nivel_leitura: latestByAluno[a.id]?.nivel_leitura || '-',
          nivel_escrita: latestByAluno[a.id]?.nivel_escrita || '-',
        }))
        .filter((a) => !reportNivelLeitura || a.nivel_leitura === reportNivelLeitura);
    } else if (list.length > 0) {
      const alunoIds = list.map((a) => a.id);
      const { data: sonds } = await supabase
        .from('sondagens')
        .select('aluno_id, nivel_leitura, nivel_escrita, data')
        .in('aluno_id', alunoIds)
        .order('data', { ascending: false });
      const latestByAluno = {};
      (sonds || []).forEach((s) => {
        if (!latestByAluno[s.aluno_id]) {
          latestByAluno[s.aluno_id] = { nivel_leitura: s.nivel_leitura, nivel_escrita: s.nivel_escrita };
        }
      });
      list = list.map((a) => ({
        ...a,
        nivel_leitura: latestByAluno[a.id]?.nivel_leitura || '-',
        nivel_escrita: latestByAluno[a.id]?.nivel_escrita || '-',
      }));
    }

    // Buscar dados do boletim (notas_boletim)
    if (list.length > 0) {
      const alunoIds = list.map((a) => a.id);
      const { data: boletimRows } = await supabase
        .from('notas_boletim')
        .select('aluno_id, nota, falta')
        .in('aluno_id', alunoIds);

      const byAluno = {};
      (boletimRows || []).forEach((row) => {
        const id = row.aluno_id;
        if (!byAluno[id]) byAluno[id] = { qtd_notas: 0, qtd_faltas: 0, tem_acima: false, tem_abaixo: false };
        const n = row.nota != null && row.nota !== '' ? Number(row.nota) : null;
        const f = row.falta != null && row.falta !== '' ? Number(row.falta) : 0;
        if (n != null && !Number.isNaN(n)) {
          byAluno[id].qtd_notas += 1;
          if (n >= 5) byAluno[id].tem_acima = true;
          else byAluno[id].tem_abaixo = true;
        }
        if (!Number.isNaN(f)) byAluno[id].qtd_faltas += f;
      });

      list = list.map((a) => {
        const b = byAluno[a.id] || { qtd_notas: 0, qtd_faltas: 0, tem_acima: false, tem_abaixo: false };
        return {
          ...a,
          qtd_notas: b.qtd_notas,
          qtd_faltas: b.qtd_faltas,
          tem_acima: b.tem_acima,
          tem_abaixo: b.tem_abaixo,
        };
      });

      if (reportNotasFilter === 'acima') list = list.filter((a) => a.tem_acima);
      else if (reportNotasFilter === 'abaixo') list = list.filter((a) => a.tem_abaixo);
    }

    setReportList(list);
    setReportGenerated(true);
    setReportLoading(false);
  };

  const exportReportPDF = async () => {
    if (reportList.length === 0) {
      alert('Gere a lista antes de exportar.');
      return;
    }
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
      const showNotas = reportNotasFilter === 'acima' || reportNotasFilter === 'abaixo';
      const showFaltas = reportFaltasFilter === 'sim';
      const head = ['Nome', 'Turma', 'Etiqueta', 'Nível Leitura', 'Nível Escrita']
        .concat(showNotas ? [reportNotasFilter === 'acima' ? 'Acima da média' : 'Abaixo da média'] : [])
        .concat(showFaltas ? ['Faltas'] : []);
      const rows = reportList.map((a) =>
        [a.nome || '-', a.turma_nome || '-', getEtiquetaLabel(a.etiqueta_cor), a.nivel_leitura || '-', a.nivel_escrita || '-']
          .concat(showNotas ? [String(a.qtd_notas ?? 0)] : [])
          .concat(showFaltas ? [String(a.qtd_faltas ?? 0)] : [])
      );
      doc.setFontSize(14);
      doc.text('Relatório de Alunos - SACP', 14, 12);
      autoTable(doc, {
        head: [head],
        body: rows,
        startY: 18,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 110, 253] },
        // Destacar a coluna de etiqueta com a cor do grupo
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          // Colunas: 0=Nome, 1=Turma, 2=Etiqueta, ...
          if (data.column.index !== 2) return;
          const labelText = Array.isArray(data.cell.text) ? data.cell.text.join(' ') : data.cell.text || '';
          const c = labelText.toLowerCase();
          if (c.includes('prioridade')) {
            // vermelho
            data.cell.styles.fillColor = [220, 38, 38];
            data.cell.styles.textColor = 255;
          } else if (c.includes('atenção') || c.includes('atencao')) {
            // amarelo
            data.cell.styles.fillColor = [234, 179, 8];
            data.cell.styles.textColor = 0;
          } else if (c.includes('avançado') || c.includes('avancado')) {
            // verde
            data.cell.styles.fillColor = [22, 163, 74];
            data.cell.styles.textColor = 255;
          } else if (c.includes('regular')) {
            // azul
            data.cell.styles.fillColor = [37, 99, 235];
            data.cell.styles.textColor = 255;
          } else if (c.includes('aee')) {
            // roxo
            data.cell.styles.fillColor = [147, 51, 234];
            data.cell.styles.textColor = 255;
          }
          data.cell.styles.fontStyle = 'bold';
        },
      });
      await savePdfDocument(doc, `relatorio-alunos-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert('Erro ao exportar PDF: ' + (err?.message || err));
    }
  };

  const exportReportWord = async () => {
    if (reportList.length === 0) {
      alert('Gere a lista antes de exportar.');
      return;
    }
    try {
      const docx = await import('docx');
      const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } = docx;
      const showNotas = reportNotasFilter === 'acima' || reportNotasFilter === 'abaixo';
      const showFaltas = reportFaltasFilter === 'sim';
      const headerCells = ['Nome', 'Turma', 'Etiqueta', 'Nível Leitura', 'Nível Escrita']
        .concat(showNotas ? [reportNotasFilter === 'acima' ? 'Acima da média' : 'Abaixo da média'] : [])
        .concat(showFaltas ? ['Faltas'] : [])
        .map((text) => new TableCell({ children: [new Paragraph({ text })] }));
      const dataRows = reportList.map((a) => {
        return new TableRow({
          children: (() => {
            const cells = [];
            const etiquetaLabel = getEtiquetaLabel(a.etiqueta_cor);

            // Nome
            cells.push(
              new TableCell({
                children: [new Paragraph({ text: String(a.nome || '-') })],
              })
            );

            // Turma
            cells.push(
              new TableCell({
                children: [new Paragraph({ text: String(a.turma_nome || '-') })],
              })
            );

            // Etiqueta com cor de fundo
            const etiquetaLower = (etiquetaLabel || '').toLowerCase();
            let fill = null;
            if (etiquetaLower.includes('prioridade')) {
              fill = 'DC2626'; // vermelho
            } else if (etiquetaLower.includes('atenção') || etiquetaLower.includes('atencao')) {
              fill = 'EAB308'; // amarelo
            } else if (etiquetaLower.includes('avançado') || etiquetaLower.includes('avancado')) {
              fill = '16A34A'; // verde
            } else if (etiquetaLower.includes('regular')) {
              fill = '2563EB'; // azul
            } else if (etiquetaLower.includes('aee')) {
              fill = '9333EA'; // roxo
            }

            cells.push(
              new TableCell({
                children: [new Paragraph({ text: String(etiquetaLabel) })],
                shading: fill
                  ? {
                      type: 'clear',
                      color: 'auto',
                      fill,
                    }
                  : undefined,
              })
            );

            // Nível leitura
            cells.push(
              new TableCell({
                children: [new Paragraph({ text: String(a.nivel_leitura || '-') })],
              })
            );

            // Nível escrita
            cells.push(
              new TableCell({
                children: [new Paragraph({ text: String(a.nivel_escrita || '-') })],
              })
            );

            // Colunas extras: notas e faltas
            if (showNotas) {
              cells.push(
                new TableCell({
                  children: [new Paragraph({ text: String(a.qtd_notas ?? 0) })],
                })
              );
            }
            if (showFaltas) {
              cells.push(
                new TableCell({
                  children: [new Paragraph({ text: String(a.qtd_faltas ?? 0) })],
                })
              );
            }

            return cells;
          })(),
        });
      });
      const tableRows = [new TableRow({ children: headerCells }), ...dataRows];
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Relatório de Alunos - SACP', heading: 'Heading1', spacing: { after: 400 } }),
          table,
        ],
      }],
    });
      const blob = await Packer.toBlob(doc);
      await saveBlob(blob, `relatorio-alunos-${new Date().toISOString().slice(0, 10)}.docx`);
    } catch (err) {
      alert('Erro ao exportar Word: ' + (err?.message || err));
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSavingNote(true);
       
       
      // eslint-disable-next-line no-unused-vars
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
      await reavaliarCorAluno(selectedStudentId);
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
       
       
      // eslint-disable-next-line no-unused-vars
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

  // Níveis de escrita e leitura para 1º e 2º ano (Alfabetiza Pará)
  const NIVEL_ESCRITA_OPCOES_1_2 = [
    'PRÉ-SILÁBICO',
    'SILÁBICO SEM VALOR SONORO',
    'SILÁBICO COM VALOR SONORO',
    'SILÁBICO ALFABÉTICO',
    'ALFABÉTICO',
  ];
  const NIVEL_LEITURA_OPCOES_1_2 = [
    'PRÉ – LEITOR 1',
    'PRÉ – LEITOR 2',
    'PRÉ – LEITOR 3',
    'PRÉ – LEITOR 4',
    'LEITOR INICIANTE',
    'LEITOR FLUENTE',
  ];

  // Níveis de escrita e leitura para 3º ao 5º ano
  const NIVEL_ESCRITA_OPCOES_3_5 = [
    'ESCREVE PALAVRAS NÃO ORTOGRÁFICAS',
    'ESCREVE PALAVRAS ORTOGRÁFICAS',
    'ESCREVE FRASES NÃO COESAS',
    'ESCREVE FRASES COESAS',
    'ESCREVE TEXTOS NÃO COESOS',
    'ESCREVE TEXTOS COESOS',
  ];
  const NIVEL_LEITURA_OPCOES_3_5 = [
    'PRÉ-LEITOR',
    'LEITOR DE PALAVRAS SEM FLUÊNCIA',
    'LEITOR DE PALAVRAS COM FLUÊNCIA',
    'LEITOR DE TEXTO SEM FLUÊNCIA',
    'LEITOR DE TEXTO COM FLUÊNCIA',
    'LEITOR COM FLUÊNCIA, RESPEITA RITMO, INTENSIDADE E ENTONAÇÃO',
  ];

  // Níveis de escrita e leitura para 6º ao 9º ano
  const NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 = [
    'Não Ortográfica',
    'Escreve Palavras Ortográficas',
    'Escreve Frases não Coesas',
    'Não Escreve Textos Coesos',
    'Escreve Textos Coesos',
  ];
  const NIVEL_LEITURA_OPCOES_FUNDAMENTAL2 = [
    'Pré-Leitor',
    'Leitor de Palavras sem Fluência',
    'Leitor de Palavras com Fluência',
    'Leitor de Frases sem Fluência',
    'Leitor de Frases com Fluência',
    'Leitor de Texto sem Fluência',
    'Leitor de Texto com Fluência',
    'Leitor com Fluência, Respeita Ritmo, Intensidade e Entonação',
  ];

  // Retorna qual conjunto de níveis usar: '1-2', '3-5', ou '6-9'
  const getSondagemNivelSet = () => {
    if (!selectedStudent?.turma_id) return '1-2';
    const turma = (classes || []).find((c) => String(c.id) === String(selectedStudent.turma_id));
    if (!turma) return '1-2';
    const nome = (turma.nome || '').toLowerCase();
    const anoEscolar = turma.ano_escolar ?? turma.ano;
    const anos = Array.isArray(anoEscolar) ? anoEscolar : anoEscolar != null ? [anoEscolar] : [];
    const temAno69 = nome.match(/\b[6-9]º?\b/) || anos.some((a) => [6, 7, 8, 9].includes(Number(a)));
    if (temAno69) return '6-9';
    const temAno35 = nome.match(/\b[3-5]º?\b/) || anos.some((a) => [3, 4, 5].includes(Number(a)));
    if (temAno35) return '3-5';
    return '1-2';
  };

  const BUCKET_SONDAGENS = 'sondagens-anexos';

  const handleOpenSondagemModal = (sondagem = null) => {
    if (sondagem) {
      setEditingSondagem(sondagem);
      setSondagemFormData({
        data: sondagem.data ? sondagem.data.split('T')[0] : new Date().toISOString().split('T')[0],
        nivel_escrita: sondagem.nivel_escrita || '',
        nivel_leitura: sondagem.nivel_leitura || '',
        observacoes: sondagem.observacoes || '',
        foto_escrita_url: sondagem.foto_escrita_url || '',
        audio_leitura_url: sondagem.audio_leitura_url || '',
        video_leitura_url: sondagem.video_leitura_url || '',
        arquivo_url: sondagem.arquivo_url || '',
        foto_file: null,
        audio_file: null,
        video_file: null,
        arquivo_file: null,
      });
    } else {
      setEditingSondagem(null);
      setSondagemFormData({
        data: new Date().toISOString().split('T')[0],
        nivel_escrita: '',
        nivel_leitura: '',
        observacoes: '',
        foto_escrita_url: '',
        audio_leitura_url: '',
        video_leitura_url: '',
        arquivo_url: '',
        foto_file: null,
        audio_file: null,
        video_file: null,
        arquivo_file: null,
      });
    }
    setShowSondagemModal(true);
  };

  const handleCancelSondagemModal = () => {
    savingSondagemRef.current = false;
    setSavingSondagem(false);
    setShowSondagemModal(false);
    setEditingSondagem(null);
    setSondagemFormData({
      data: new Date().toISOString().split('T')[0],
      nivel_escrita: '',
      nivel_leitura: '',
      observacoes: '',
      foto_escrita_url: '',
      audio_leitura_url: '',
      video_leitura_url: '',
      arquivo_url: '',
      foto_file: null,
      audio_file: null,
      video_file: null,
      arquivo_file: null,
    });
  };

  const openSondagemMidia = (tipo, url) => {
    if (!url) return;
    setSondagemMidiaTipo(tipo);
    setSondagemMidiaUrl(url);
    setShowSondagemMidiaModal(true);
  };

  const handleSaveSondagem = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    if (savingSondagemRef.current) return;
    if (!sondagemFormData.nivel_escrita || !sondagemFormData.nivel_leitura) {
      alert('Preencha nível de escrita e nível de leitura.');
      return;
    }

    savingSondagemRef.current = true;
    setSavingSondagem(true);

    const payload = {
      aluno_id: selectedStudentId,
      data: sondagemFormData.data,
      nivel_escrita: sondagemFormData.nivel_escrita,
      nivel_leitura: sondagemFormData.nivel_leitura,
      observacoes: sondagemFormData.observacoes?.trim() || null,
    };
    const { data, error } = editingSondagem
      ? await supabase.from('sondagens').update(payload).eq('id', editingSondagem.id).select()
      : await supabase.from('sondagens').insert([payload]).select();
    if (error) {
      alert('Erro ao salvar sondagem: ' + error.message);
      savingSondagemRef.current = false;
      setSavingSondagem(false);
      return;
    }
    const sondagemId = (data && data[0] && data[0].id) || editingSondagem?.id;
    let fotoUrl = sondagemFormData.foto_escrita_url || null;
    let audioUrl = sondagemFormData.audio_leitura_url || null;
    let arquivoUrl = sondagemFormData.arquivo_url || null;

    if (sondagemId) {
      if (sondagemFormData.foto_file) {
        const ext = sondagemFormData.foto_file.name.split('.').pop() || 'jpg';
        const filePath = `${sondagemId}/foto.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_SONDAGENS)
          .upload(filePath, sondagemFormData.foto_file, { cacheControl: '3600', upsert: true });
        if (uploadError) {
          alert('Erro ao enviar foto: ' + (uploadError.message || uploadError).toString() + '\n\nVerifique: Storage > bucket "sondagens-anexos" existe e tem políticas de INSERT e UPDATE.');
          savingSondagemRef.current = false;
          setSavingSondagem(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(BUCKET_SONDAGENS).getPublicUrl(filePath);
        fotoUrl = urlData?.publicUrl || null;
      }
      if (sondagemFormData.audio_file) {
        const ext = sondagemFormData.audio_file.name.split('.').pop() || 'webm';
        const filePath = `${sondagemId}/audio.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_SONDAGENS)
          .upload(filePath, sondagemFormData.audio_file, { cacheControl: '3600', upsert: true });
        if (uploadError) {
          alert('Erro ao enviar áudio: ' + (uploadError.message || uploadError).toString() + '\n\nVerifique: Storage > bucket "sondagens-anexos" existe e tem políticas de INSERT e UPDATE.');
          savingSondagemRef.current = false;
          setSavingSondagem(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(BUCKET_SONDAGENS).getPublicUrl(filePath);
        audioUrl = urlData?.publicUrl || null;
      }
      if (sondagemFormData.arquivo_file) {
        const ext = sondagemFormData.arquivo_file.name.split('.').pop() || 'pdf';
        const filePath = `${sondagemId}/arquivo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_SONDAGENS)
          .upload(filePath, sondagemFormData.arquivo_file, { cacheControl: '3600', upsert: true });
        if (uploadError) {
          alert('Erro ao enviar arquivo: ' + (uploadError.message || uploadError).toString() + '\n\nVerifique: Storage > bucket "sondagens-anexos" existe e tem políticas de INSERT e UPDATE.');
          savingSondagemRef.current = false;
          setSavingSondagem(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(BUCKET_SONDAGENS).getPublicUrl(filePath);
        arquivoUrl = urlData?.publicUrl || null;
      }
      const updatePayload = {
        foto_escrita_url: fotoUrl,
        audio_leitura_url: audioUrl,
        arquivo_url: arquivoUrl,
      };
      await supabase.from('sondagens').update(updatePayload).eq('id', sondagemId).select();
    }

    setShowSondagemModal(false);
    setEditingSondagem(null);
    setSondagemFormData({
      data: new Date().toISOString().split('T')[0],
      nivel_escrita: '',
      nivel_leitura: '',
      observacoes: '',
      foto_escrita_url: '',
      audio_leitura_url: '',
      arquivo_url: '',
      foto_file: null,
      audio_file: null,
      arquivo_file: null,
    });
    // Recarregar a lista do servidor para exibir foto/áudio no histórico
    const { data: freshData } = await supabase
      .from('sondagens')
      .select('*')
      .eq('aluno_id', selectedStudentId)
      .order('data', { ascending: false });
    setSondagens(freshData || []);

    await reavaliarCorAluno(selectedStudentId);

    savingSondagemRef.current = false;
    setSavingSondagem(false);
  };

  const handleDeleteSondagem = async (sondagem) => {
    if (!sondagem?.id || !confirm('Tem certeza que deseja excluir esta sondagem?')) return;
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('sondagens').delete().eq('id', sondagem.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    setSondagens((prev) => prev.filter((s) => s.id !== sondagem.id));
    await reavaliarCorAluno(selectedStudentId);
  };

  // Funções CRUD de Escolas
  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setSavingSchool(true);

    const schoolId = editingSchool?.id;

    const schoolData = {
      nome: schoolFormData.nome?.trim() ?? '',
      inep: schoolFormData.inep?.trim() ?? '',
      endereco: schoolFormData.endereco?.trim() ?? '',
      tipo_estrutura: schoolFormData.tipo || 'Polo',
    };

    let error;
    if (editingSchool && schoolId) {
       
      // eslint-disable-next-line no-unused-vars
      const { data: updateData, error: updateError } = await supabase
        .from('escolas')
        .update(schoolData)
        .eq('id', schoolId);
      error = updateError;
    } else {
       
      // eslint-disable-next-line no-unused-vars
      const { data: insertData, error: insertError } = await supabase.from('escolas').insert([schoolData]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar escola: ' + error.message);
      setSavingSchool(false);
    } else {
      setShowSchoolModal(false);
      setEditingSchool(null);
      setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
      setSavingSchool(false);

      const { data: newData } = await supabase.from('escolas').select('*');
      if (newData) {
        setSchools(newData);
        if (schoolId && String(activeSchoolId) === String(schoolId)) {
          const updated = newData.find((s) => String(s.id) === String(schoolId));
          if (updated) setActiveSchool(updated);
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
    
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('escolas').delete().eq('id', schoolId);
    
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

  const handleToggleArchiveSchool = async (school) => {
    const willArchive = !school?.arquivada;
    const msg = willArchive ? 'Arquivar esta escola?' : 'Desarquivar esta escola?';
    if (!confirm(msg)) return;

       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase
      .from('escolas')
      .update({ arquivada: willArchive })
      .eq('id', school.id);

    if (error) {
      alert('Erro ao atualizar escola: ' + error.message);
      return;
    }

    const { data: newData } = await supabase.from('escolas').select('*');
    if (newData) {
      setSchools(newData);

      // Se arquivou a escola ativa, escolher outra escola ativa automaticamente
      if (willArchive && String(activeSchoolId) === String(school.id)) {
        const activeList = (newData || []).filter((s) => !s.arquivada);
        const poloSchool = activeList.find((s) => s.tipo_estrutura === 'Polo');
        const next = poloSchool || activeList[0] || null;
        setActiveSchoolId(next ? next.id : null);
        setActiveSchool(next);
      }
    }
  };

  const handleChangeActiveSchool = (schoolId) => {
    if (schoolId == null || schoolId === '') return;
    const school = schools.find((s) => String(s.id) === String(schoolId));
    if (school) {
      // Troca intencional de escola: limpar turma selecionada (evita manter turma de outra escola).
      // Não há setSelectedClassId em listeners de focus/visibility — apenas aqui e nos botões de navegação.
      if (String(school.id) !== String(activeSchoolId)) {
        setSelectedClassId(null);
        setSelectedClassName('');
        clearPersistedTurmaNav();
      }
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

    const ehEspecial = Boolean(classFormData.turma_especial);
    if (!ehEspecial && (!classFormData.ano || classFormData.ano.length === 0)) {
      alert('Selecione pelo menos um ano escolar.');
      return;
    }

    setSavingClass(true);

    const classData = {
      nome: classFormData.nome || (ehEspecial ? 'Turma especial' : generateTurmaNome(classFormData.ano)),
      ano_escolar: classFormData.ano?.length ? classFormData.ano : ehEspecial ? ['Turma especial'] : [],
      codigo: classFormData.codigo || null,
      professor_regente: classFormData.professor_regente,
      aluno_representante: classFormData.aluno_representante || null,
      escola_id: schoolId,
      ano_letivo: classFormData.ano_letivo || selectedYear,
      turma_especial: ehEspecial,
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
      setClassFormData({
        nome: '',
        ano: [],
        codigo: '',
        professor_regente: '',
        aluno_representante: '',
        escola_id: activeSchoolId || '',
        ano_letivo: selectedYear,
        turma_especial: false,
      });
      setSavingClass(false);
      
      // Atualizar estado: ao editar, recarregar lista para evitar tela branca por dados em formato inesperado
      if (isEditing && turmaId) {
        const { data: newData } = await supabase
          .from('turmas')
          .select('*')
          .eq('escola_id', schoolId)
          .eq('ano_letivo', selectedYear);
        if (newData) setClasses(newData);
      } else if (updatedTurma && !isEditing) {
        // Criação: adicionar nova turma ao array (apenas se for do ano letivo e escola corretos)
        const turmaComFormatoCorreto = {
          ...updatedTurma,
          ano_escolar: Array.isArray(updatedTurma.ano_escolar)
            ? updatedTurma.ano_escolar
            : updatedTurma.ano_escolar
              ? [updatedTurma.ano_escolar]
              : [],
        };
        if (turmaComFormatoCorreto.ano_letivo === selectedYear && String(turmaComFormatoCorreto.escola_id) === String(schoolId)) {
          setClasses((prevClasses) => {
            const prev = prevClasses || [];
            const exists = prev.some((t) => String(t.id) === String(turmaComFormatoCorreto.id));
            if (!exists) return [...prev, turmaComFormatoCorreto];
            return prev;
          });
        }
      } else if (!updatedTurma && !isEditing) {
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
    const anosForm =
      turma.turma_especial && anosSelecionados.length === 1 && anosSelecionados[0] === 'Turma especial'
        ? []
        : anosSelecionados;
    setClassFormData({
      nome: turma.nome || '',
      ano: anosForm,
      codigo: turma.codigo || '',
      professor_regente: turma.professor_regente || '',
      aluno_representante: turma.aluno_representante || '',
      escola_id: turma.escola_id || '',
      ano_letivo: turma.ano_letivo || selectedYear,
      turma_especial: Boolean(turma.turma_especial),
    });
    setShowClassModal(true);
  };

  const handleDeleteClass = async (classId) => {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;
    
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('turmas').delete().eq('id', classId);
    
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

  const reloadStudentsAfterTurmaChange = async (turmaId) => {
    if (!turmaId) return;
    const turma = (classes || []).find((c) => String(c.id) === String(turmaId));
    try {
      const newData = await fetchAlunosDaTurma(supabase, turmaId, turma);
      if (currentView === 'classes' && turmaId) {
        await applyStudentsLoaded(newData);
        return;
      }
    } catch {
      /* continua recarga ampla abaixo */
    }
    const schoolId = activeSchoolId || selectedSchoolId;
    if (schoolId) {
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', schoolId)
        .eq('ano_letivo', selectedYear);
      if (turmas && turmas.length > 0) {
        const turmaIds = turmas.map((t) => t.id);
        const { data: newData } = await supabase.from('alunos').select('*').in('turma_id', turmaIds);
        if (newData) await applyStudentsLoaded(newData);
      }
    }
  };

  const handleAddExistingStudentToTurma = async (alunoOrigem, turmaDestinoId) => {
    const turmaId = turmaDestinoId || studentFormData.turma_id;
    if (!turmaId || !alunoOrigem?.id) return;

    const turmaDestino = (classes || []).find((c) => String(c.id) === String(turmaId));
    if (!isTurmaEspecial(turmaDestino)) {
      alert('Esta função é apenas para turmas especiais.');
      return;
    }

    setSavingStudent(true);
    try {
      const vinculados = await fetchAlunoIdsTurmaEspecial(supabase, turmaId);
      if (vinculados.has(String(alunoOrigem.id))) {
        alert('Este aluno já está nesta turma especial.');
        setSavingStudent(false);
        return;
      }

      await vincularAlunoTurmaEspecial(supabase, alunoOrigem.id, turmaId);

      setShowStudentModal(false);
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
      await reloadStudentsAfterTurmaChange(turmaId);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('alunos_turmas_especiais') || msg.includes('schema cache')) {
        alert(
          'Tabela de vínculos não encontrada. Execute o script supabase_alunos_turmas_especiais.sql no Supabase.',
        );
      } else {
        alert('Erro ao adicionar aluno: ' + msg);
      }
    } finally {
      setSavingStudent(false);
    }
  };

  // Carregar alunos da escola para autocomplete em turmas especiais
  useEffect(() => {
    if (!showStudentModal || editingStudent) {
      setSchoolStudentsPicker([]);
      setVinculadosTurmaEspecialIds(new Set());
      return;
    }

    const turmaDestino = (classes || []).find((c) => String(c.id) === String(studentFormData.turma_id));
    if (!isTurmaEspecial(turmaDestino)) {
      setSchoolStudentsPicker([]);
      setVinculadosTurmaEspecialIds(new Set());
      return;
    }

    const schoolId = activeSchoolId || selectedSchoolId || turmaDestino?.escola_id;
    if (!schoolId) return;

    let cancelled = false;
    const fetchPicker = async () => {
      setSchoolStudentsPickerLoading(true);
      const { data: turmas, error: turmasErr } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', schoolId)
        .eq('ano_letivo', selectedYear);

      if (cancelled) return;
      if (turmasErr || !turmas?.length) {
        setSchoolStudentsPicker([]);
        setSchoolStudentsPickerLoading(false);
        return;
      }

      const turmaIds = turmas.map((t) => t.id);
      const { data: alunos, error: alunosErr } = await supabase
        .from('alunos')
        .select('*')
        .in('turma_id', turmaIds);

      if (!cancelled) {
        if (alunosErr) {
          setSchoolStudentsPicker([]);
        } else {
          setSchoolStudentsPicker(alunos || []);
        }
        try {
          const ids = await fetchAlunoIdsTurmaEspecial(supabase, studentFormData.turma_id);
          if (!cancelled) setVinculadosTurmaEspecialIds(ids);
        } catch {
          if (!cancelled) setVinculadosTurmaEspecialIds(new Set());
        }
        if (!cancelled) setSchoolStudentsPickerLoading(false);
      }
    };

    fetchPicker();
    return () => {
      cancelled = true;
    };
  }, [
    showStudentModal,
    editingStudent,
    studentFormData.turma_id,
    classes,
    activeSchoolId,
    selectedSchoolId,
    selectedYear,
  ]);

  // Funções CRUD de Alunos
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentFormData.turma_id) {
      alert('Selecione uma turma.');
      return;
    }

    const turmaSalvar = (classes || []).find(
      (c) => String(c.id) === String(studentFormData.turma_id),
    );
    if (!editingStudent && isTurmaEspecial(turmaSalvar)) {
      alert(
        'Turmas especiais reúnem alunos já cadastrados na turma regular. Use a busca para adicioná-los.',
      );
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
       
      // eslint-disable-next-line no-unused-vars
      const { data: updateData, error: updateError } = await supabase
        .from('alunos')
        .update(studentData)
        .eq('id', editingStudent.id);
      error = updateError;
    } else {
       
      // eslint-disable-next-line no-unused-vars
      const { data: insertData, error: insertError } = await supabase.from('alunos').insert([studentData]);
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
      await reloadStudentsAfterTurmaChange(studentFormData.turma_id || selectedClassId);
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

  // Sanitizar nome de arquivo para chave do Storage (evita "Invalid key" por espaços, parênteses, etc.)
  const sanitizeStorageFileName = (fileName) => {
    if (!fileName || typeof fileName !== 'string') return `documento_${Date.now()}`;
    const lastDot = fileName.lastIndexOf('.');
    const base = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
    const ext = lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : '';
    const normalized = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[()]/g, '')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const safe = normalized || `documento_${Date.now()}`;
    return safe + ext;
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
      const safeName = sanitizeStorageFileName(file.name);
      const filePath = `${selectedStudentId}/${safeName}`;
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
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.storage
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
        console.error('Erro ao carregar eventos:', error);
      } else {
        setAgendaEvents(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    }
  };

  loadAgendaEventsRef.current = loadAgendaEvents;

  const loadAgendaBirthdayAlunos = async () => {
    if (!activeSchoolId) return;
    try {
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', activeSchoolId)
        .eq('ano_letivo', selectedYear);
      if (!turmas || turmas.length === 0) {
        setAgendaBirthdayAlunos([]);
        return;
      }
      const turmaIds = turmas.map((t) => t.id);
      const { data: alunos, error } = await supabase
        .from('alunos')
        .select('id, nome, data_nascimento, turmas(nome)')
        .in('turma_id', turmaIds)
        .not('data_nascimento', 'is', null);
      if (error) {
        setAgendaBirthdayAlunos([]);
        return;
      }
      setAgendaBirthdayAlunos((alunos || []).filter((a) => a.data_nascimento && String(a.data_nascimento).trim() !== ''));
    } catch (error) {
      // Ignore error
      console.error(error);
      setAgendaBirthdayAlunos([]);
    }
  };

  const getBirthdayEventsForDay = (year, month, day) => {
    return agendaBirthdayAlunos
      .filter((a) => {
        if (!a.data_nascimento) return false;
        const d = new Date(a.data_nascimento + 'T12:00:00');
        if (isNaN(d.getTime())) return false;
        return d.getMonth() === month && d.getDate() === day;
      })
      .map((a) => {
        const dataStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const primeiroNome = (a.nome || 'Aluno').trim().split(/\s+/)[0] || (a.nome || 'Aluno');
        const turmaNome = a.turmas?.nome;
        const titulo = turmaNome ? `${primeiroNome} (${turmaNome})` : primeiroNome;
        return {
          id: 'aniv-' + a.id,
          titulo,
          data_inicio: dataStr + 'T00:00:00',
          data_fim: dataStr + 'T00:00:00',
          tipo: 'aniversario',
          cor_etiqueta: ETIQUETA_CORES.find((e) => e.id === 'aniversario').color,
        };
      });
  };

  const loadTodayEvents = async () => {
    // Função mantida para evitar erros de referência
  };

  const loadEventsForDate = async (date) => {
    if (!activeSchoolId) return;
    setDashboardDayEventsLoading(true);
    try {
      const d = new Date(date);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', activeSchoolId)
        .eq('ano_letivo', selectedYear);
      let query = supabase
        .from('agenda_eventos')
        .select('*')
        .gte('data_inicio', dayStart.toISOString())
        .lte('data_inicio', dayEnd.toISOString());
      if (turmas && turmas.length > 0) {
        const turmaIds = turmas.map((t) => t.id);
        query = query.or(`turma_id.in.(${turmaIds.join(',')}),turma_id.is.null`);
      } else {
        query = query.is('turma_id', null);
      }
      const { data } = await query.order('data_inicio', { ascending: true });
      setDashboardDayEvents(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos do dia:', error);
      setDashboardDayEvents([]);
    } finally {
      setDashboardDayEventsLoading(false);
    }
  };

  const getWeekDates = (monday) => {
    const dates = [];
    const start = new Date(monday);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    const d1 = new Date(a);
    const d2 = new Date(b);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const isToday = (d) => isSameDay(d, new Date());

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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
  // Removido combineDateTime pois não está mais sendo usado

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

  const buildEventDateTimes = (form) => {
    const [anoInicio, mesInicio, diaInicio] = form.data_inicio.split('-').map(Number);
    const [horaInicio, minutoInicio] = form.hora_inicio.split(':').map(Number);
    const start = new Date(anoInicio, mesInicio - 1, diaInicio, horaInicio, minutoInicio);
    if (isNaN(start.getTime())) return null;

    let end = start;
    if (form.data_fim && form.hora_fim) {
      const [anoFim, mesFim, diaFim] = form.data_fim.split('-').map(Number);
      const [horaFim, minutoFim] = form.hora_fim.split(':').map(Number);
      const endDate = new Date(anoFim, mesFim - 1, diaFim, horaFim, minutoFim);
      if (!isNaN(endDate.getTime())) end = endDate;
    }
    return { start, end };
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventFormData.titulo || !eventFormData.data_inicio) {
      alert('Preencha pelo menos o título e data de início.');
      return;
    }

    const dates = buildEventDateTimes(eventFormData);
    if (!dates) {
      alert('Data/hora de início inválida.');
      return;
    }

    const { start, end } = dates;
    const tipoRec = eventFormData.recorrencia_tipo || 'nenhuma';
    const wantsRecurring = tipoRec !== 'nenhuma' && eventFormData.recorrencia_ate;
    const isNewRecurring = !editingEvent && wantsRecurring;
    const weekendOpts = {
      incluirSabado: !!eventFormData.incluir_sabado,
      incluirDomingo: !!eventFormData.incluir_domingo,
    };

    if (wantsRecurring) {
      const ate = parseLocalDate(eventFormData.recorrencia_ate);
      if (ate.getTime() < new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) {
        alert('A data "Repetir até" deve ser igual ou posterior à data de início.');
        return;
      }
    }

    setSavingEvent(true);

    const basePayload = {
      titulo: eventFormData.titulo,
      descricao: eventFormData.descricao || null,
      cor_etiqueta: eventFormData.cor_etiqueta,
      turma_id: null,
      nivel_planejamento: null,
      anexo_url: editingEvent?.anexo_url || null,
      ...USUARIO_EVENT_EXTRAS,
    };

    let eventId;
    let error;

    const insertRecurringRows = async (occurrences, serieId) => {
      const rows = occurrences.map((occ) => ({
        ...basePayload,
        data_inicio: occ.start.toISOString(),
        data_fim: occ.end.toISOString(),
        serie_id: serieId,
      }));
      let insertResult = await supabase.from('agenda_eventos').insert(rows).select();
      if (insertResult.error?.message?.includes('serie_id')) {
        const rowsSemSerie = rows.map((row) => {
          const rowSemSerie = { ...row };
          delete rowSemSerie.serie_id;
          return rowSemSerie;
        });
        insertResult = await supabase.from('agenda_eventos').insert(rowsSemSerie).select();
      }
      return insertResult;
    };

    if (editingEvent) {
      eventId = editingEvent.id;

      if (wantsRecurring) {
        const ate = parseLocalDate(eventFormData.recorrencia_ate);
        const occurrences = generateRecurringOccurrences({
          start,
          end,
          tipo: tipoRec,
          ate,
          ...weekendOpts,
        });

        if (occurrences.length === 0) {
          alert(
            'Nenhuma ocorrência gerada. Verifique as datas ou marque a inclusão de sábados/domingos se necessário.'
          );
          setSavingEvent(false);
          return;
        }

        if (editingEvent.serie_id) {
          const regenerate = window.confirm(
            'Alterar a recorrência recriará todos os eventos desta série com os novos parâmetros.\n\nOK = recriar série\nCancelar = salvar só este evento (sem alterar os demais)'
          );

          if (regenerate) {
            await supabase.from('agenda_eventos').delete().eq('serie_id', editingEvent.serie_id);
            const serieId = crypto.randomUUID();
            const insertResult = await insertRecurringRows(occurrences, serieId);
            error = insertResult.error;
            if (!error && insertResult.data?.length) {
              const match =
                insertResult.data.find(
                  (ev) => new Date(ev.data_inicio).getTime() === start.getTime()
                ) || insertResult.data[0];
              eventId = match.id;
            }
          } else {
            const { error: updateError } = await supabase
              .from('agenda_eventos')
              .update({
                ...basePayload,
                data_inicio: start.toISOString(),
                data_fim: end.toISOString(),
              })
              .eq('id', editingEvent.id);
            error = updateError;
          }
        } else {
          const serieId = crypto.randomUUID();
          const { error: updateError } = await supabase
            .from('agenda_eventos')
            .update({
              ...basePayload,
              data_inicio: start.toISOString(),
              data_fim: end.toISOString(),
              serie_id: serieId,
            })
            .eq('id', editingEvent.id);

          error = updateError;
          if (!error) {
            const toInsert = occurrences.filter((occ) => occ.start.getTime() !== start.getTime());
            if (toInsert.length) {
              const insertResult = await insertRecurringRows(toInsert, serieId);
              error = insertResult.error;
            }
          }
        }
      } else {
        const applyToSeries =
          editingEvent.serie_id &&
          window.confirm(
            'Este evento faz parte de uma série recorrente.\n\nOK = aplicar título, observação e cor a TODOS os eventos da série\nCancelar = alterar apenas este evento'
          );

        if (applyToSeries) {
          const { error: seriesError } = await supabase
            .from('agenda_eventos')
            .update({
              titulo: basePayload.titulo,
              descricao: basePayload.descricao,
              cor_etiqueta: basePayload.cor_etiqueta,
            })
            .eq('serie_id', editingEvent.serie_id);

          const { error: dateError } = await supabase
            .from('agenda_eventos')
            .update({
              data_inicio: start.toISOString(),
              data_fim: end.toISOString(),
            })
            .eq('id', editingEvent.id);

          error = seriesError || dateError;
        } else {
          const { error: updateError } = await supabase
            .from('agenda_eventos')
            .update({
              ...basePayload,
              data_inicio: start.toISOString(),
              data_fim: end.toISOString(),
            })
            .eq('id', editingEvent.id);
          error = updateError;
        }
      }
    } else if (isNewRecurring) {
      const ate = parseLocalDate(eventFormData.recorrencia_ate);
      const occurrences = generateRecurringOccurrences({
        start,
        end,
        tipo: tipoRec,
        ate,
        ...weekendOpts,
      });

      if (occurrences.length === 0) {
        alert(
          'Nenhuma ocorrência gerada. Verifique as datas ou marque a inclusão de sábados/domingos se necessário.'
        );
        setSavingEvent(false);
        return;
      }

      const serieId = crypto.randomUUID();
      const rows = occurrences.map((occ) => ({
        ...basePayload,
        data_inicio: occ.start.toISOString(),
        data_fim: occ.end.toISOString(),
        serie_id: serieId,
      }));

      let insertResult = await supabase.from('agenda_eventos').insert(rows).select();

      if (insertResult.error?.message?.includes('serie_id')) {
        const rowsSemSerie = rows.map((row) => {
          const rowSemSerie = { ...row };
          delete rowSemSerie.serie_id;
          return rowSemSerie;
        });
        insertResult = await supabase.from('agenda_eventos').insert(rowsSemSerie).select();
      }

      error = insertResult.error;
      if (!error && insertResult.data?.length) {
        eventId = insertResult.data[0].id;
      }
    } else {
      const eventData = {
        ...basePayload,
        data_inicio: start.toISOString(),
        data_fim: end.toISOString(),
      };
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
         
      // eslint-disable-next-line no-unused-vars
      const { data: updateData, error: updateError } = await supabase
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
    setEventFormData({ ...INITIAL_EVENT_FORM_DATA });
    setSavingEvent(false);
    await loadAgendaEvents();
    await loadTodayEvents();
    if (selectedAgendaEvent?.id === eventId) {
      const { data: refreshed } = await supabase
        .from('agenda_eventos')
        .select('*')
        .eq('id', eventId)
        .single();
      if (refreshed) {
        setSelectedAgendaEvent(refreshed);
        setAgendaAnotacoesText(refreshed.anotacoes || '');
        loadAgendaEventAnexos(eventId, refreshed);
      }
    }
  };

  const handleDeleteAgendaEvent = async () => {
    if (!editingEvent?.id) return;
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;

    let error;
    let deleteEntireSeries = false;
    if (editingEvent.serie_id) {
      deleteEntireSeries = window.confirm(
        'Este evento faz parte de uma série recorrente.\n\nOK = excluir TODA a série\nCancelar = excluir apenas este evento'
      );
      if (deleteEntireSeries) {
        ({ error } = await supabase.from('agenda_eventos').delete().eq('serie_id', editingEvent.serie_id));
      } else {
        ({ error } = await supabase.from('agenda_eventos').delete().eq('id', editingEvent.id));
      }
    } else {
      ({ error } = await supabase.from('agenda_eventos').delete().eq('id', editingEvent.id));
    }

    if (error) {
      alert('Erro ao excluir evento: ' + error.message);
      return;
    }
    setAgendaEvents((prev) => {
      if (editingEvent.serie_id && deleteEntireSeries) {
        return prev.filter((ev) => ev.serie_id !== editingEvent.serie_id);
      }
      return prev.filter((ev) => ev.id !== editingEvent.id);
    });
    setShowEventModal(false);
    setEditingEvent(null);
    if (selectedAgendaEvent?.id === editingEvent.id) {
      setSelectedAgendaEvent(null);
      setCurrentView('agenda');
    }
    await loadTodayEvents();
  };

  const loadAgendaEventAnexos = async (eventId, legacyEvent) => {
    if (!eventId) return;
    setLoadingAgendaAnexos(true);
    try {
      const anexosMap = new Map();

      const { data: files, error } = await supabase.storage
        .from('agenda-arquivos')
        .list(String(eventId), { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (!error && files?.length) {
        for (const file of files) {
          if (!file.name || file.name === '.emptyFolderPlaceholder') continue;
          const path = `${eventId}/${file.name}`;
          const { data: urlData } = supabase.storage.from('agenda-arquivos').getPublicUrl(path);
          const displayName = file.name.includes('_')
            ? file.name.replace(/^\d+_/, '').replace(/_/g, ' ')
            : file.name;
          anexosMap.set(path, {
            path,
            name: file.name,
            displayName,
            url: urlData?.publicUrl,
          });
        }
      }

      if (legacyEvent?.anexo_url && !Array.from(anexosMap.values()).some((a) => a.url === legacyEvent.anexo_url)) {
        anexosMap.set(`legacy-${eventId}`, {
          path: null,
          name: legacyEvent.anexo_nome || 'Documento anexado',
          displayName: legacyEvent.anexo_nome || 'Documento anexado',
          url: legacyEvent.anexo_url,
        });
      }

      setAgendaEventAnexos(Array.from(anexosMap.values()));
    } catch (err) {
      console.error('Erro ao carregar anexos:', err);
      setAgendaEventAnexos([]);
    } finally {
      setLoadingAgendaAnexos(false);
    }
  };

  const openAgendaEventDetail = (ev) => {
    setSelectedAgendaEvent(ev);
    setAgendaAnotacoesText(ev.anotacoes || '');
    setCurrentView('agenda-event-detail');
    loadAgendaEventAnexos(ev.id, ev);
  };

  const openAgendaEventEditModalFromEvent = (ev) => {
    if (!ev) return;
    const inicio = splitDateTime(ev.data_inicio);
    const fim = ev.data_fim ? splitDateTime(ev.data_fim) : inicio;
    const cor = normalizeEventColor(ev.cor_etiqueta);
    const recorrencia = inferRecorrenciaFromSerie(ev, agendaEvents);
    setEditingEvent(ev);
    setEventFormData({
      ...INITIAL_EVENT_FORM_DATA,
      titulo: ev.titulo || '',
      descricao: ev.descricao || '',
      data_inicio: inicio.date,
      hora_inicio: inicio.time,
      data_fim: fim.date,
      hora_fim: fim.time,
      cor_etiqueta: cor,
      anexo_nome: ev.anexo_nome || '',
      recorrencia_tipo: recorrencia.recorrencia_tipo,
      recorrencia_ate: recorrencia.recorrencia_ate,
      incluir_sabado: recorrencia.incluir_sabado,
      incluir_domingo: recorrencia.incluir_domingo,
    });
    setShowEventModal(true);
  };

  const openAgendaEventEditModal = () => {
    if (!selectedAgendaEvent) return;
    openAgendaEventEditModalFromEvent(selectedAgendaEvent);
  };

  const getAgendaExportMeta = (selectedCategoryIds) => {
    const range = getAgendaExportRange(agendaView, currentDate);
    return {
      periodLabel: range.label,
      schoolName: activeSchool?.nome || selectedSchool || '',
      userName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || '',
      range,
      agendaView,
      currentDate,
      selectedCategoryIds,
      includeSemedMarcos: semedAgenda.showSemedMarcos,
    };
  };

  const getAgendaEventsForExport = () => {
    if (semedAgenda.showSemedMarcos) return agendaEvents;
    return filterAgendaEvents(agendaEvents, { onlyUsuario: true });
  };

  const exportAgendaPlanejamentoPDF = async (selectedCategoryIds) => {
    const { range, ...meta } = getAgendaExportMeta(selectedCategoryIds);
    const events = getEventsForExport(
      getAgendaEventsForExport(),
      range,
      selectedCategoryIds,
      getBirthdayEventsForDay,
      { includeSemedMarcos: semedAgenda.showSemedMarcos }
    );
    if (events.length === 0) {
      alert('Não há eventos das categorias selecionadas no período visível para exportar.');
      return;
    }
    setExportingAgenda(true);
    try {
      await exportAgendaPDF(events, meta);
    } catch (err) {
      alert('Erro ao exportar PDF: ' + (err?.message || err));
    } finally {
      setExportingAgenda(false);
    }
  };

  const exportAgendaPlanejamentoWord = async (selectedCategoryIds) => {
    const { range, ...meta } = getAgendaExportMeta(selectedCategoryIds);
    const events = getEventsForExport(
      getAgendaEventsForExport(),
      range,
      selectedCategoryIds,
      getBirthdayEventsForDay,
      { includeSemedMarcos: semedAgenda.showSemedMarcos }
    );
    if (events.length === 0) {
      alert('Não há eventos das categorias selecionadas no período visível para exportar.');
      return;
    }
    setExportingAgenda(true);
    try {
      await exportAgendaWord(events, meta);
    } catch (err) {
      alert('Erro ao exportar Word: ' + (err?.message || err));
    } finally {
      setExportingAgenda(false);
    }
  };

  const handleSaveAgendaAnotacoes = async () => {
    if (!selectedAgendaEvent?.id) return;
    setSavingAgendaAnotacoes(true);
    try {
      let { error } = await supabase
        .from('agenda_eventos')
        .update({ anotacoes: agendaAnotacoesText || null })
        .eq('id', selectedAgendaEvent.id);

      if (error?.message?.includes('anotacoes')) {
        alert(
          'Não foi possível salvar as anotações. Execute o script supabase_agenda_anotacoes.sql no Supabase para adicionar a coluna "anotacoes".'
        );
        return;
      }

      if (error) {
        alert('Erro ao salvar anotações: ' + error.message);
        return;
      }

      const updated = { ...selectedAgendaEvent, anotacoes: agendaAnotacoesText || null };
      setSelectedAgendaEvent(updated);
      setAgendaEvents((prev) =>
        prev.map((ev) => (ev.id === selectedAgendaEvent.id ? { ...ev, anotacoes: updated.anotacoes } : ev))
      );
    } catch (err) {
      alert('Erro ao salvar anotações: ' + err.message);
    } finally {
      setSavingAgendaAnotacoes(false);
    }
  };

  const handleUploadAgendaEventFiles = async (files) => {
    if (!selectedAgendaEvent?.id || !files?.length) return;
    setUploadingAgendaAnexos(true);
    try {
      const eventId = selectedAgendaEvent.id;
      for (const file of files) {
        const originalFileName = file.name;
        const sanitizedFileName = sanitizeFileName(originalFileName);
        const fileName = `${Date.now()}_${sanitizedFileName}`;
        const filePath = `${eventId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('agenda-arquivos')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          alert(`Erro ao enviar "${originalFileName}": ${uploadError.message}`);
          continue;
        }

        if (!selectedAgendaEvent.anexo_url) {
          const { data: urlData } = supabase.storage.from('agenda-arquivos').getPublicUrl(filePath);
          await supabase
            .from('agenda_eventos')
            .update({
              anexo_url: urlData?.publicUrl || filePath,
              anexo_nome: originalFileName,
            })
            .eq('id', eventId);
        }
      }
      await loadAgendaEvents();
      const { data: refreshed } = await supabase
        .from('agenda_eventos')
        .select('*')
        .eq('id', eventId)
        .single();
      if (refreshed) setSelectedAgendaEvent(refreshed);
      await loadAgendaEventAnexos(eventId, refreshed || selectedAgendaEvent);
    } catch (err) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploadingAgendaAnexos(false);
    }
  };

  const handleDeleteAgendaEventAnexo = async (filePath, fileName) => {
    if (!filePath) return;
    if (!window.confirm(`Remover o arquivo "${fileName || 'anexo'}"?`)) return;

    const { error } = await supabase.storage.from('agenda-arquivos').remove([filePath]);
    if (error) {
      alert('Erro ao remover anexo: ' + error.message);
      return;
    }

    if (selectedAgendaEvent?.anexo_url?.includes(filePath.split('/').pop())) {
      await supabase
        .from('agenda_eventos')
        .update({ anexo_url: null, anexo_nome: null })
        .eq('id', selectedAgendaEvent.id);
    }

    await loadAgendaEventAnexos(selectedAgendaEvent.id, selectedAgendaEvent);
    await loadAgendaEvents();
  };

  const handleDeleteStudent = async (studentId) => {
    const turmaCtx = selectedClassId
      ? (classes || []).find((c) => String(c.id) === String(selectedClassId))
      : null;

    if (isTurmaEspecial(turmaCtx)) {
      if (
        !confirm(
          'Remover este aluno da turma especial? O cadastro único na turma regular será mantido.',
        )
      ) {
        return;
      }
      try {
        await desvincularAlunoTurmaEspecial(supabase, studentId, selectedClassId);
        await reloadStudentsAfterTurmaChange(selectedClassId);
      } catch (err) {
        alert('Erro ao remover aluno da turma: ' + (err?.message || String(err)));
      }
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    const { error } = await supabase.from('alunos').delete().eq('id', studentId);

    if (error) {
      alert('Erro ao excluir aluno: ' + error.message);
    } else {
      await reloadStudentsAfterTurmaChange(selectedClassId || null);
    }
  };

  // Funções CRUD de Professores
  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    const schoolId = activeSchoolId || selectedSchoolId;
    if (!schoolId) {
      alert('Selecione uma escola.');
      return;
    }

    if (!teacherFormData.nome?.trim()) {
      alert('Informe o nome do professor.');
      return;
    }
    if (!teacherFormData.disciplina?.trim()) {
      alert('Informe a disciplina.');
      return;
    }

    setSavingTeacher(true);

    const teacherData = {
      escola_id: schoolId,
      ano_letivo: selectedYear,
      nome: teacherFormData.nome.trim(),
      disciplina: teacherFormData.disciplina.trim(),
      turmas_ids: Array.isArray(teacherFormData.turmas_ids) ? teacherFormData.turmas_ids : [],
    };

    let error;
    if (editingTeacher) {
       
      // eslint-disable-next-line no-unused-vars
      const { data: updateData, error: updateError } = await supabase
        .from('professores')
        .update(teacherData)
        .eq('id', editingTeacher.id);
      error = updateError;
    } else {
       
      // eslint-disable-next-line no-unused-vars
      const { data: insertData, error: insertError } = await supabase.from('professores').insert([teacherData]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar professor: ' + error.message);
      setSavingTeacher(false);
      return;
    }

    setShowTeacherModal(false);
    setEditingTeacher(null);
    setTeacherFormData({ nome: '', disciplina: '', turmas_ids: [] });
    setSavingTeacher(false);

    // Recarregar lista
    const { data: newData } = await supabase
      .from('professores')
      .select('*')
      .eq('escola_id', schoolId)
      .eq('ano_letivo', selectedYear)
      .order('nome', { ascending: true });
    if (newData) setTeachers(newData);
  };

  const handleEditTeacher = (prof) => {
    setEditingTeacher(prof);
    setTeacherFormData({
      nome: prof.nome || '',
      disciplina: prof.disciplina || '',
      turmas_ids: Array.isArray(prof.turmas_ids) ? prof.turmas_ids : [],
    });
    setShowTeacherModal(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('professores').delete().eq('id', teacherId);
    if (error) {
      alert('Erro ao excluir professor: ' + error.message);
      return;
    }
    setTeachers((prev) => prev.filter((t) => String(t.id) !== String(teacherId)));
    if (String(selectedTeacherId) === String(teacherId)) {
      setSelectedTeacherId(null);
      setSelectedTeacher(null);
      if (currentView === 'teacher-detail') setCurrentView('teachers');
    }
  };

  const getEntregaDisplayStatus = (row) => {
    const s = (row.status || 'pendente').toLowerCase();
    if (s === 'entregue') return 'entregue';
    if (s === 'atrasado') return 'atrasado';
    const prazo = row.prazo ? String(row.prazo).split('T')[0] : '';
    if (prazo && prazo < getLocalDateString()) return 'atrasado';
    return 'pendente';
  };

  const selectTeacher = (prof) => {
    setSelectedTeacherId(prof.id);
    setSelectedTeacher(prof);
    setTeacherProfileMissing(false);
    setTeacherProfileTab('entregas');
    setEntregaFilter('todos');
    setCurrentView('teacher-detail');
  };

  const openEntregaModal = (entrega = null) => {
    if (entrega) {
      setEditingEntrega(entrega);
      setEntregaFormData({
        tipo_documento: entrega.tipo_documento || 'Plano de Aula',
        referencia: entrega.referencia || '',
        status: (entrega.status || 'pendente').toLowerCase(),
        prazo: entrega.prazo ? String(entrega.prazo).split('T')[0] : '',
        observacoes: entrega.observacoes || '',
      });
    } else {
      setEditingEntrega(null);
      setEntregaFormData({
        tipo_documento: 'Plano de Aula',
        referencia: '',
        status: 'pendente',
        prazo: '',
        observacoes: '',
      });
    }
    setShowEntregaModal(true);
  };

  const handleSaveEntrega = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedTeacher) {
      alert('Professor não selecionado.');
      return;
    }
    const schoolId = selectedTeacher.escola_id || activeSchoolId || selectedSchoolId;
    if (!schoolId) {
      alert('Escola não identificada.');
      return;
    }
    setSavingEntrega(true);
    const payload = {
      professor_id: selectedTeacherId,
      escola_id: schoolId,
      ano_letivo: selectedTeacher.ano_letivo ?? selectedYear,
      tipo_documento: entregaFormData.tipo_documento?.trim() || 'Documento',
      referencia: entregaFormData.referencia?.trim() || '',
      status: entregaFormData.status,
      prazo: entregaFormData.prazo || null,
      observacoes: entregaFormData.observacoes?.trim() || null,
    };

    let err;
    if (editingEntrega?.id) {
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('entregas_docentes').update(payload).eq('id', editingEntrega.id);
      err = error;
    } else {
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('entregas_docentes').insert([payload]);
      err = error;
    }

    setSavingEntrega(false);
    if (err) {
      alert('Erro ao salvar entrega: ' + err.message);
      return;
    }
    setShowEntregaModal(false);
    setEditingEntrega(null);
    const { data: refreshed } = await supabase
      .from('entregas_docentes')
      .select('*')
      .eq('professor_id', selectedTeacherId)
      .order('created_at', { ascending: false });
    setEntregasDocentes(refreshed || []);
    setEntregasError(null);
  };

  const handleDeleteEntrega = async (row) => {
    if (!row?.id || !confirm('Excluir esta exigência de entrega?')) return;
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('entregas_docentes').delete().eq('id', row.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    setEntregasDocentes((prev) => prev.filter((x) => x.id !== row.id));
  };

  const openRegistroCoordModal = (reg = null) => {
    if (reg) {
      setEditingRegistroCoord(reg);
      setRegistroCoordFormData({
        data_conversa: reg.data_conversa ? String(reg.data_conversa).split('T')[0] : getLocalDateString(),
        assunto: reg.assunto || '',
        relato: reg.relato || '',
        encaminhamentos: reg.encaminhamentos || '',
      });
    } else {
      setEditingRegistroCoord(null);
      setRegistroCoordFormData({
        data_conversa: getLocalDateString(),
        assunto: '',
        relato: '',
        encaminhamentos: '',
      });
    }
    setShowRegistroCoordModal(true);
  };

  const handleSaveRegistroCoord = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedTeacher) {
      alert('Professor não selecionado.');
      return;
    }
    if (!registroCoordFormData.assunto?.trim()) {
      alert('Informe o assunto da conversa.');
      return;
    }
    const schoolId = selectedTeacher.escola_id || activeSchoolId || selectedSchoolId;
    if (!schoolId) {
      alert('Escola não identificada.');
      return;
    }
    setSavingRegistroCoord(true);
    const payload = {
      professor_id: selectedTeacherId,
      escola_id: schoolId,
      ano_letivo: selectedTeacher.ano_letivo ?? selectedYear,
      data_conversa: registroCoordFormData.data_conversa || getLocalDateString(),
      assunto: registroCoordFormData.assunto.trim(),
      relato: registroCoordFormData.relato?.trim() || null,
      encaminhamentos: registroCoordFormData.encaminhamentos?.trim() || null,
    };

    let err;
    if (editingRegistroCoord?.id) {
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('registros_coordenacao').update(payload).eq('id', editingRegistroCoord.id);
      err = error;
    } else {
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('registros_coordenacao').insert([payload]);
      err = error;
    }

    setSavingRegistroCoord(false);
    if (err) {
      alert('Erro ao salvar registro: ' + err.message);
      return;
    }
    setShowRegistroCoordModal(false);
    setEditingRegistroCoord(null);
    const { data: refreshed } = await supabase
      .from('registros_coordenacao')
      .select('*')
      .eq('professor_id', selectedTeacherId)
      .order('data_conversa', { ascending: false })
      .order('created_at', { ascending: false });
    setRegistrosCoordenacao(refreshed || []);
    setRegistrosCoordError(null);
  };

  const handleDeleteRegistroCoord = async (row) => {
    if (!row?.id || !confirm('Excluir este registro de acompanhamento?')) return;
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.from('registros_coordenacao').delete().eq('id', row.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    setRegistrosCoordenacao((prev) => prev.filter((x) => x.id !== row.id));
  };

  // Ordem crescente: Pré I, Pré II, 1º ao 9º ano (para ordenar turmas e alunos por turma)
  const getTurmaSortOrder = (nome) => {
    if (!nome) return 999;
    const n = String(nome).trim().toLowerCase();
    if (/\b(pré|pre)\s*(i|1)\b/.test(n)) return 0;
    if (/\b(pré|pre)\s*(ii|2)\b/.test(n)) return 1;
    for (let ano = 1; ano <= 9; ano++) {
      // aceita: 9º, 9° , 9o, "9 ano", "9º ano", etc.
      if (new RegExp(`\\b${ano}\\s*(º|°|o)?\\s*(ano)?\\b`, 'i').test(n)) return ano + 1;
    }
    // Fallback por extenso (ex.: "Nono Ano")
    if (/\bnono\b/.test(n)) return 10;
    return 999;
  };

  // Filtrar turmas e alunos por busca (classes pode estar vazio; evita erro ao voltar para lista de turmas)
  const classesList = classes || [];
  const activeSchoolsList = (schools || []).filter((s) => !s.arquivada);
  const filteredClasses = classesList.filter((turma) =>
    turma.nome?.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
    turma.codigo?.toLowerCase().includes(classSearchTerm.toLowerCase())
  );

  const filteredClassesSorted = [...filteredClasses].sort(
    (a, b) => getTurmaSortOrder(a.nome) - getTurmaSortOrder(b.nome)
  );

  // Se a turma foi restaurada pelo ID (storage) mas ainda não temos o nome em memória, preencher a partir da lista carregada
  useEffect(() => {
    if (!selectedClassId || selectedClassName) return;
    const found = classesList.find((t) => String(t.id) === String(selectedClassId));
    if (found?.nome) setSelectedClassName(found.nome);
  }, [selectedClassId, selectedClassName, classesList]);

  const filteredStudents = students
    .filter((aluno) =>
      aluno.nome?.toLowerCase().includes(studentSearchTerm.toLowerCase())
    )
    .filter((aluno) => {
      // Dentro de uma turma (selectedClassId): não aplicar filtro de turma, a lista já é dessa turma
      if (selectedClassId) return true;
      return !filterStudentTurmaId || String(aluno.turma_id) === String(filterStudentTurmaId);
    })
    .filter((aluno) => !filterStudentEtiquetaCor || (aluno.etiqueta_cor || '').toLowerCase() === filterStudentEtiquetaCor.toLowerCase());

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

  const turmaNavCtx = selectedClassId
    ? (classesList || classes || []).find((c) => String(c.id) === String(selectedClassId))
    : null;
  const studentNavTurmaId = selectedClassId || selectedStudent?.turma_id;
  const studentNavList =
    selectedClassId && isTurmaEspecial(turmaNavCtx)
      ? [...students].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
      : studentNavTurmaId
        ? [...students]
            .filter((a) => String(a.turma_id) === String(studentNavTurmaId))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
        : sortedFilteredStudents;
  const studentNavIndex = studentNavList.findIndex((a) => String(a.id) === String(selectedStudentId));
  const canNavigateStudentPrev = studentNavIndex > 0;
  const canNavigateStudentNext =
    studentNavIndex >= 0 && studentNavIndex < studentNavList.length - 1;

  const navigateAdjacentStudent = (delta) => {
    if (studentNavIndex < 0) return;
    const next = studentNavList[studentNavIndex + delta];
    if (next) selectStudent(next, { keepTab: true });
  };

  const filteredTeachers = teachers.filter((p) =>
    (p.nome || '').toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    (p.disciplina || '').toLowerCase().includes(teacherSearchTerm.toLowerCase())
  );

  const entregasFiltradas = entregasDocentes.filter((e) => {
    const st = getEntregaDisplayStatus(e);
    if (entregaFilter === 'todos') return true;
    return st === entregaFilter;
  });
  const entregaCounts = {
    pendente: entregasDocentes.filter((e) => getEntregaDisplayStatus(e) === 'pendente').length,
    entregue: entregasDocentes.filter((e) => getEntregaDisplayStatus(e) === 'entregue').length,
    atrasado: entregasDocentes.filter((e) => getEntregaDisplayStatus(e) === 'atrasado').length,
  };

  return (
    <>
      {showRecoveryPasswordForm && (
        <div className="login-screen">
          <div className="login-box">
            <h2>Definir nova senha</h2>
            <p className="login-subtitle">
              Digite e confirme sua nova senha abaixo.
            </p>
            {authError && <div className="auth-message auth-error">{authError}</div>}
            {authSuccess && <div className="auth-message auth-success">{authSuccess}</div>}
            <form onSubmit={handleSetNewPassword}>
              <div className="input-group">
                <label>Nova senha (mín. 6 caracteres)</label>
                <input
                  type="password"
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="input-group">
                <label>Confirmar nova senha</label>
                <input
                  type="password"
                  value={recoveryConfirmPassword}
                  onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={authLoading}>
                {authLoading ? 'Salvando...' : 'Definir senha'}
              </button>
            </form>
          </div>
        </div>
      )}

      {!showRecoveryPasswordForm && !isLoggedIn && (
        <div className="login-screen">
          <div className="login-box">
            <h2>SACP</h2>
            <p className="login-subtitle">
              Sistema de Apoio à Coordenação Pedagógica
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => { setAuthMode('login'); clearAuthMessages(); }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => { setAuthMode('register'); clearAuthMessages(); }}
              >
                Cadastrar
              </button>
              <button
                type="button"
                className={authMode === 'recover' ? 'active' : ''}
                onClick={() => { setAuthMode('recover'); clearAuthMessages(); }}
              >
                Recuperar senha
              </button>
            </div>

            {authError && <div className="auth-message auth-error">{authError}</div>}
            {authSuccess && <div className="auth-message auth-success">{authSuccess}</div>}

            {authMode === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Senha</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? 'Entrando...' : 'Entrar'}
                </button>
                <button
                  type="button"
                  className="btn-google"
                  onClick={handleGoogleAuth}
                  disabled={authLoading}
                >
                  <i className="fab fa-google" style={{ marginRight: 8 }} />
                  Entrar com Google
                </button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister}>
                <div className="input-group">
                  <label>Nome (opcional)</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="input-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Senha (mín. 6 caracteres)</label>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="input-group">
                  <label>Confirmar senha</label>
                  <input
                    type="password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? 'Cadastrando...' : 'Criar conta'}
                </button>
                <button
                  type="button"
                  className="btn-google"
                  onClick={handleGoogleAuth}
                  disabled={authLoading}
                >
                  <i className="fab fa-google" style={{ marginRight: 8 }} />
                  Cadastrar com Google
                </button>
              </form>
            )}

            {authMode === 'recover' && (
              <form onSubmit={handleRecoverPassword}>
                <div className="input-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? 'Enviando...' : 'Enviar link para redefinir senha'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {!showRecoveryPasswordForm && isLoggedIn && (
        <div className="app-container">
          {/* Overlay para fechar menu no mobile */}
          {mobileMenuOpen && (
            <div
              className="mobile-overlay"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <aside id="main-navigation" className={mobileMenuOpen ? 'mobile-open' : ''}>
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
                    clearPersistedTurmaNav();
                    navigate('students');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'students' ? 'active' : ''}
                >
                  <i className="fas fa-user-graduate" /> Alunos
                </li>
                <li
                  onClick={() => {
                    setSelectedTeacherId(null);
                    setSelectedTeacher(null);
                    setTeacherProfileMissing(false);
                    navigate('teachers');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'teachers' ? 'active' : ''}
                >
                  <i className="fas fa-chalkboard-teacher" /> Professores
                </li>
                <li
                  onClick={() => {
                    navigate('emprestimos');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'emprestimos' ? 'active' : ''}
                >
                  <i className="fas fa-book" /> Biblioteca
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
                    navigate('graficos');
                    setMobileMenuOpen(false);
                  }}
                  className={getActiveNav() === 'graficos' ? 'active' : ''}
                >
                  <i className="fas fa-chart-pie" /> Gráficos
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
                <li
                  onClick={async () => {
                    await supabase.auth.signOut();
                    // Limpar localStorage ao fazer logout
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('sacp_currentView');
                      localStorage.removeItem('sacp_selectedSchoolId');
                      clearPersistedTurmaNav();
                      localStorage.removeItem('sacp_selectedStudentId');
                      localStorage.removeItem('sacp_selectedTeacherId');
                      localStorage.removeItem('sacp_teacherProfileTab');
                      localStorage.removeItem('sacp_currentTab');
                    }
                    setMobileMenuOpen(false);
                  }}
                  className="nav-logout"
                >
                  <i className="fas fa-sign-out-alt" /> Sair
                </li>
              </ul>
            </nav>
          </aside>

          <main>
            <header className="app-header">
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="main-navigation"
              >
                <i className="fas fa-bars" aria-hidden="true" />
              </button>
              <h1>{getPageTitle()}</h1>
              <div className="app-header-controls">
                <select
                  className="app-header-select app-header-select-school"
                  value={activeSchoolId ?? ''}
                  onChange={(e) => handleChangeActiveSchool(e.target.value || null)}
                  disabled={schoolsLoading || activeSchoolsList.length === 0}
                  style={{
                    cursor: schoolsLoading || activeSchoolsList.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                  title={schoolsError || (activeSchoolsList.length === 0 && !schoolsLoading ? 'Cadastre ou desarquive uma escola em Gestão de Escolas' : '')}
                >
                  <option value="">
                    {schoolsLoading
                      ? 'Carregando escolas...'
                      : activeSchoolsList.length === 0
                      ? 'Nenhuma escola ativa'
                      : 'Selecione a escola'}
                  </option>
                  {activeSchoolsList.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.nome} ({school.tipo_estrutura})
                    </option>
                  ))}
                </select>
                {schoolsError && (
                  <span style={{ fontSize: '0.8em', color: 'var(--danger)' }}>{schoolsError}</span>
                )}
                <select
                  className="app-header-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
                <button
                  type="button"
                  className="header-user-profile"
                  onClick={() => navigate('profile')}
                  title="Abrir meu perfil"
                >
                  <span>Olá, {userName} ({userRole})</span>
                  <div className="avatar">{userInitial}</div>
                </button>
              </div>
            </header>

            {/* Dashboard */}
            {currentView === 'dashboard' && (
              <DashboardView
                totalAzul={totalAzul}
                totalAtencao={totalAtencao}
                totalRisco={totalRisco}
                totalVerde={totalVerde}
                totalRoxo={totalRoxo}
                totalAlunos={totalAlunos}
                setFilterStudentEtiquetaCor={setFilterStudentEtiquetaCor}
                setFilterStudentTurmaId={setFilterStudentTurmaId}
                setSelectedClassId={setSelectedClassId}
                setSelectedClassName={setSelectedClassName}
                clearPersistedTurmaNav={clearPersistedTurmaNav}
                setCurrentView={setCurrentView}
                dashboardLoading={dashboardLoading}
                dashboardWeekStart={dashboardWeekStart}
                setDashboardWeekStart={setDashboardWeekStart}
                dashboardSelectedDate={dashboardSelectedDate}
                setDashboardSelectedDate={setDashboardSelectedDate}
                getWeekDates={getWeekDates}
                isSameDay={isSameDay}
                isToday={isToday}
                dayNames={dayNames}
                dashboardDayEventsLoading={dashboardDayEventsLoading}
                dashboardDayEvents={dashboardDayEvents}
                setCurrentDate={setCurrentDate}
                setAgendaView={setAgendaView}
                onOpenEventDetail={openAgendaEventDetail}
              />
            )}

            {/* Schools */}
            {currentView === 'schools' && (
              <SchoolsView
                schoolsLoading={schoolsLoading}
                schoolsError={schoolsError}
                schools={schools}
                setEditingSchool={setEditingSchool}
                setSchoolFormData={setSchoolFormData}
                setShowSchoolModal={setShowSchoolModal}
                handleToggleArchiveSchool={handleToggleArchiveSchool}
                handleEditSchool={handleEditSchool}
                handleDeleteSchool={handleDeleteSchool}
                selectSchool={selectSchool}
              />
            )}

            {/* Classes */}
            {currentView === 'classes' && (
              <ClassesView
                selectedClassId={selectedClassId}
                selectedClassName={selectedClassName}
                setSelectedClassId={setSelectedClassId}
                setSelectedClassName={setSelectedClassName}
                clearPersistedTurmaNav={clearPersistedTurmaNav}
                setEditingStudent={setEditingStudent}
                setStudentFormData={setStudentFormData}
                setAeeFormData={setAeeFormData}
                setShowStudentModal={setShowStudentModal}
                studentSearchTerm={studentSearchTerm}
                setStudentSearchTerm={setStudentSearchTerm}
                filterStudentEtiquetaCor={filterStudentEtiquetaCor}
                setFilterStudentEtiquetaCor={setFilterStudentEtiquetaCor}
                studentsLoading={studentsLoading}
                studentsError={studentsError}
                sortedFilteredStudents={sortedFilteredStudents}
                students={students}
                selectStudent={selectStudent}
                getBadgeColorClass={getBadgeColorClass}
                handleEditStudent={handleEditStudent}
                handleDeleteStudent={handleDeleteStudent}
                activeSchool={activeSchool}
                activeSchoolId={activeSchoolId}
                selectedYear={selectedYear}
                setEditingClass={setEditingClass}
                setClassFormData={setClassFormData}
                setShowClassModal={setShowClassModal}
                classSearchTerm={classSearchTerm}
                setClassSearchTerm={setClassSearchTerm}
                classesLoading={classesLoading}
                classesError={classesError}
                filteredClassesSorted={filteredClassesSorted}
                classesList={classesList}
                schools={schools}
                turmaEtiquetasCount={turmaEtiquetasCount}
                selectClass={selectClass}
                handleEditClass={handleEditClass}
                handleDeleteClass={handleDeleteClass}
                onListaAlunosImportada={async () => {
                  if (!selectedClassId) return;
                  const turma = (classes || []).find(
                    (c) => String(c.id) === String(selectedClassId),
                  );
                  try {
                    const data = await fetchAlunosDaTurma(supabase, selectedClassId, turma);
                    await applyStudentsLoaded(data);
                  } catch {
                    /* ignore */
                  }
                }}
                reavaliarCorAluno={reavaliarCorAluno}
                onSondagensImportadas={async () => {
                  if (!selectedClassId) return;
                  const turma = (classes || []).find(
                    (c) => String(c.id) === String(selectedClassId),
                  );
                  try {
                    const data = await fetchAlunosDaTurma(supabase, selectedClassId, turma);
                    await applyStudentsLoaded(data);
                  } catch {
                    /* ignore */
                  }
                }}
                onBoletinsImportados={async () => {
                  if (!selectedClassId) return;
                  const turma = (classes || []).find(
                    (c) => String(c.id) === String(selectedClassId),
                  );
                  try {
                    const data = await fetchAlunosDaTurma(supabase, selectedClassId, turma);
                    await applyStudentsLoaded(data);
                  } catch {
                    /* ignore */
                  }
                }}
              />
            )}

            {/* Students */}
            {currentView === 'students' && (
              <StudentsView
                selectedClassName={selectedClassName}
                activeSchool={activeSchool}
                setSelectedClassId={setSelectedClassId}
                setSelectedClassName={setSelectedClassName}
                clearPersistedTurmaNav={clearPersistedTurmaNav}
                setStudents={setStudents}
                navigate={navigate}
                setEditingStudent={setEditingStudent}
                setStudentFormData={setStudentFormData}
                setAeeFormData={setAeeFormData}
                setShowStudentModal={setShowStudentModal}
                studentSearchTerm={studentSearchTerm}
                setStudentSearchTerm={setStudentSearchTerm}
                filterStudentTurmaId={filterStudentTurmaId}
                setFilterStudentTurmaId={setFilterStudentTurmaId}
                filterStudentEtiquetaCor={filterStudentEtiquetaCor}
                setFilterStudentEtiquetaCor={setFilterStudentEtiquetaCor}
                classesList={classesList}
                studentsLoading={studentsLoading}
                studentsError={studentsError}
                sortedFilteredStudents={sortedFilteredStudents}
                students={students}
                selectStudent={selectStudent}
                getBadgeColorClass={getBadgeColorClass}
                handleEditStudent={handleEditStudent}
                handleDeleteStudent={handleDeleteStudent}
              />
            )}

            {currentView === 'teachers' && (
              <TeachersView
                activeSchool={activeSchool}
                setEditingTeacher={setEditingTeacher}
                setTeacherFormData={setTeacherFormData}
                setShowTeacherModal={setShowTeacherModal}
                teacherSearchTerm={teacherSearchTerm}
                setTeacherSearchTerm={setTeacherSearchTerm}
                teachersLoading={teachersLoading}
                teachersError={teachersError}
                filteredTeachers={filteredTeachers}
                classesList={classesList}
                selectTeacher={selectTeacher}
                handleEditTeacher={handleEditTeacher}
                handleDeleteTeacher={handleDeleteTeacher}
              />
            )}

            {/* Biblioteca / Empréstimos de Livros */}
            {currentView === 'emprestimos' && (
              <LibraryView
                libraryTab={libraryTab}
                setLibraryTab={setLibraryTab}
                loanForm={loanForm}
                setLoanForm={setLoanForm}
                libraryBooks={libraryBooks}
                bookLoans={bookLoans}
                setBookLoans={setBookLoans}
                students={students}
                classes={classes}
                getLocalDateString={getLocalDateString}
                loanStudentQuery={loanStudentQuery}
                setLoanStudentQuery={setLoanStudentQuery}
                studentsLoading={studentsLoading}
                libraryBookForm={libraryBookForm}
                setLibraryBookForm={setLibraryBookForm}
                setLibraryBooks={setLibraryBooks}
              />
            )}

            {/* Student Detail */}
            {currentView === 'student-detail' && (
              <StudentDetailView
                navigate={navigate}
                selectedClassId={selectedClassId}
                studentNavIndex={studentNavIndex}
                studentNavTotal={studentNavList.length}
                canNavigateStudentPrev={canNavigateStudentPrev}
                canNavigateStudentNext={canNavigateStudentNext}
                onNavigateStudentPrev={() => navigateAdjacentStudent(-1)}
                onNavigateStudentNext={() => navigateAdjacentStudent(1)}
                selectedStudent={selectedStudent}
                classes={classes}
                getBadgeColorClass={getBadgeColorClass}
                currentTab={currentTab}
                switchTab={switchTab}
                setSelectedStudent={setSelectedStudent}
                handleOpenOccurrenceModal={handleOpenOccurrenceModal}
                occurrencesLoading={occurrencesLoading}
                occurrencesError={occurrencesError}
                occurrences={occurrences}
                handleDeleteOccurrence={handleDeleteOccurrence}
                handleOpenSondagemModal={handleOpenSondagemModal}
                sondagensLoading={sondagensLoading}
                sondagensError={sondagensError}
                sondagens={sondagens}
                formatDate={formatDate}
                openSondagemMidia={openSondagemMidia}
                handleDeleteSondagem={handleDeleteSondagem}
                uploadingDocument={uploadingDocument}
                selectedStudentId={selectedStudentId}
                handleUploadDocument={handleUploadDocument}
                loadingDocuments={loadingDocuments}
                aeeDocuments={aeeDocuments}
                handleDownloadDocument={handleDownloadDocument}
                handleDeleteDocument={handleDeleteDocument}
                reavaliarCorAluno={reavaliarCorAluno}
              />
            )}

            {/* Perfil do Professor */}
            {currentView === 'teacher-detail' && (
              <TeacherDetailView
                setSelectedTeacherId={setSelectedTeacherId}
                setSelectedTeacher={setSelectedTeacher}
                setTeacherProfileMissing={setTeacherProfileMissing}
                navigate={navigate}
                teacherProfileMissing={teacherProfileMissing}
                selectedTeacher={selectedTeacher}
                activeSchool={activeSchool}
                teacherProfileTab={teacherProfileTab}
                setTeacherProfileTab={setTeacherProfileTab}
                openEntregaModal={openEntregaModal}
                entregaCounts={entregaCounts}
                entregaFilter={entregaFilter}
                setEntregaFilter={setEntregaFilter}
                entregasLoading={entregasLoading}
                entregasError={entregasError}
                entregasFiltradas={entregasFiltradas}
                getEntregaDisplayStatus={getEntregaDisplayStatus}
                formatDate={formatDate}
                handleDeleteEntrega={handleDeleteEntrega}
                openRegistroCoordModal={openRegistroCoordModal}
                registrosCoordLoading={registrosCoordLoading}
                registrosCoordError={registrosCoordError}
                registrosCoordenacao={registrosCoordenacao}
                handleDeleteRegistroCoord={handleDeleteRegistroCoord}
              />
            )}

            {/* Reports */}
            {currentView === 'reports' && (
              <ReportsView
                reportSchoolId={reportSchoolId}
                setReportSchoolId={setReportSchoolId}
                setReportGradeLevels={setReportGradeLevels}
                schools={schools}
                reportYear={reportYear}
                setReportYear={setReportYear}
                reportGradeLevels={reportGradeLevels}
                reportClasses={reportClasses}
                reportAvailableGrades={reportAvailableGrades}
                reportEtiqueta={reportEtiqueta}
                setReportEtiqueta={setReportEtiqueta}
                reportNivelLeitura={reportNivelLeitura}
                setReportNivelLeitura={setReportNivelLeitura}
                reportNotasFilter={reportNotasFilter}
                setReportNotasFilter={setReportNotasFilter}
                reportFaltasFilter={reportFaltasFilter}
                setReportFaltasFilter={setReportFaltasFilter}
                handleGenerateReport={handleGenerateReport}
                reportLoading={reportLoading}
                reportGenerated={reportGenerated}
                reportList={reportList}
                exportReportPDF={exportReportPDF}
                exportReportWord={exportReportWord}
                getEtiquetaLabel={getEtiquetaLabel}
              />
            )}

            {/* Gráficos */}
            {currentView === 'graficos' && (
              <ChartsView
                reportSchoolId={reportSchoolId}
                setReportSchoolId={setReportSchoolId}
                schools={schools}
                reportYear={reportYear}
                setReportYear={setReportYear}
                reportClasses={reportClasses}
                selectedYear={selectedYear}
              />
            )}

            
            {/* --- INÍCIO DA AGENDA RECUPERADA --- */}
            {currentView === 'agenda' && (
              <AgendaView
                agendaView={agendaView}
                setAgendaView={setAgendaView}
                setEditingEvent={setEditingEvent}
                setEventFormData={setEventFormData}
                setShowEventModal={setShowEventModal}
                onOpenEventDetail={openAgendaEventDetail}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                agendaEvents={semedAgenda.filteredForView}
                getBirthdayEventsForDay={getBirthdayEventsForDay}
                splitDateTime={splitDateTime}
                onExportPDF={exportAgendaPlanejamentoPDF}
                onExportWord={exportAgendaPlanejamentoWord}
                exportingAgenda={exportingAgenda}
                onOpenSemedImport={() => semedAgenda.setShowSemedImportWizard(true)}
                showSemedMarcos={semedAgenda.showSemedMarcos}
                setShowSemedMarcos={semedAgenda.setShowSemedMarcos}
                hasSemedImport={semedAgenda.hasSemedImport}
                handleBackdropMouseDown={handleBackdropMouseDown}
                handleBackdropClick={handleBackdropClick}
              />
            )}

            {currentView === 'agenda-event-detail' && (
              <AgendaEventDetailView
                navigate={navigate}
                selectedAgendaEvent={selectedAgendaEvent}
                anotacoesText={agendaAnotacoesText}
                setAnotacoesText={setAgendaAnotacoesText}
                savingAnotacoes={savingAgendaAnotacoes}
                onSaveAnotacoes={handleSaveAgendaAnotacoes}
                anexos={agendaEventAnexos}
                loadingAnexos={loadingAgendaAnexos}
                uploadingAnexos={uploadingAgendaAnexos}
                onUploadFiles={handleUploadAgendaEventFiles}
                onDeleteAnexo={handleDeleteAgendaEventAnexo}
                onEditEvent={openAgendaEventEditModal}
              />
            )}
            {/* --- FIM DA AGENDA RECUPERADA --- */}

            {/* Meu perfil */}
            {currentView === 'profile' && (
              <div className="view-section profile-view">
                <div className="profile-card">
                  <div className="profile-avatar">{userInitial}</div>
                  <h2>{userName}</h2>
                  <p className="profile-role">{userRole}</p>
                  <p className="profile-email">{authUser?.email || '—'}</p>
                  <p style={{ fontSize: '0.85em', color: '#666', marginTop: 8 }}>
                    Cadastrado com {authUser?.app_metadata?.provider === 'google' ? 'Google' : 'e-mail e senha'}
                  </p>
                  {authUser?.email && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginTop: 16 }}
                      onClick={async () => {
                        setAuthLoading(true);
                        setAuthError('');
                        setAuthSuccess('');
       
       
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.auth.resetPasswordForEmail(authUser.email, {
                          redirectTo: getAuthRedirectUrl(),
                        });
                        setAuthLoading(false);
                        if (error) setAuthError(error.message);
                        else setAuthSuccess('Enviamos um link para redefinir sua senha no seu e-mail.');
                      }}
                      disabled={authLoading}
                    >
                      {authLoading ? 'Enviando...' : 'Enviar link para redefinir senha'}
                    </button>
                  )}
                  {(authError || authSuccess) && (
                    <div className={`auth-message ${authError ? 'auth-error' : 'auth-success'}`} style={{ marginTop: 12 }}>
                      {authError || authSuccess}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings */}
            {currentView === 'settings' && (
              <SettingsView activeSchoolId={activeSchoolId} supabase={supabase} />
            )}
          </main>
        </div>
      )}

      {/* Modal de Nova Ocorrência */}
      <OccurrenceModal
        showModal={showModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        handleCancelModal={handleCancelModal}
        editingOccurrence={editingOccurrence}
        handleSaveOccurrence={handleSaveOccurrence}
        formData={formData}
        setFormData={setFormData}
        savingOccurrence={savingOccurrence}
      />

      {/* Modal de Nova Nota */}
      <NoteModal
        showNoteModal={showNoteModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        handleCancelNoteModal={handleCancelNoteModal}
        handleSaveNote={handleSaveNote}
        noteFormData={noteFormData}
        setNoteFormData={setNoteFormData}
        savingNote={savingNote}
      />

      {/* Modal de Histórico de Frequência */}
      <FrequencyModal
        showFrequencyModal={showFrequencyModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        handleCancelFrequencyModal={handleCancelFrequencyModal}
        handleSaveFrequency={handleSaveFrequency}
        frequencyFormData={frequencyFormData}
        setFrequencyFormData={setFrequencyFormData}
        savingFrequency={savingFrequency}
      />

      {/* Modal de Sondagem */}
      <SondagemModal
        showSondagemModal={showSondagemModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        handleCancelSondagemModal={handleCancelSondagemModal}
        editingSondagem={editingSondagem}
        handleSaveSondagem={handleSaveSondagem}
        sondagemFormData={sondagemFormData}
        setSondagemFormData={setSondagemFormData}
        getSondagemNivelSet={getSondagemNivelSet}
        NIVEL_LEITURA_OPCOES_1_2={NIVEL_LEITURA_OPCOES_1_2}
        NIVEL_LEITURA_OPCOES_3_5={NIVEL_LEITURA_OPCOES_3_5}
        NIVEL_LEITURA_OPCOES_FUNDAMENTAL2={NIVEL_LEITURA_OPCOES_FUNDAMENTAL2}
        NIVEL_ESCRITA_OPCOES_1_2={NIVEL_ESCRITA_OPCOES_1_2}
        NIVEL_ESCRITA_OPCOES_3_5={NIVEL_ESCRITA_OPCOES_3_5}
        NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2={NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2}
        savingSondagem={savingSondagem}
        showSondagemMidiaModal={showSondagemMidiaModal}
        sondagemMidiaUrl={sondagemMidiaUrl}
        setShowSondagemMidiaModal={setShowSondagemMidiaModal}
        sondagemMidiaTipo={sondagemMidiaTipo}
      />

      {/* Modal de Escola */}
      <SchoolModal
        showSchoolModal={showSchoolModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        setShowSchoolModal={setShowSchoolModal}
        setEditingSchool={setEditingSchool}
        setSchoolFormData={setSchoolFormData}
        editingSchool={editingSchool}
        handleSaveSchool={handleSaveSchool}
        schoolFormData={schoolFormData}
        savingSchool={savingSchool}
      />

      {/* Modal de Turma */}
      <ClassModal
        showClassModal={showClassModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        setShowClassModal={setShowClassModal}
        setEditingClass={setEditingClass}
        setClassFormData={setClassFormData}
        activeSchoolId={activeSchoolId}
        selectedYear={selectedYear}
        editingClass={editingClass}
        handleSaveClass={handleSaveClass}
        classFormData={classFormData}
        schools={schools}
        generateTurmaNome={generateTurmaNome}
        savingClass={savingClass}
      />

      {/* Modal de Aluno */}
      <StudentModal
        showStudentModal={showStudentModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        setShowStudentModal={setShowStudentModal}
        setEditingStudent={setEditingStudent}
        setStudentFormData={setStudentFormData}
        setAeeFormData={setAeeFormData}
        editingStudent={editingStudent}
        handleSaveStudent={handleSaveStudent}
        studentFormData={studentFormData}
        classes={classes}
        savingStudent={savingStudent}
        schoolStudentsPicker={schoolStudentsPicker}
        schoolStudentsPickerLoading={schoolStudentsPickerLoading}
        vinculadosTurmaEspecialIds={vinculadosTurmaEspecialIds}
        onAddExistingStudent={handleAddExistingStudentToTurma}
        isTurmaEspecial={isTurmaEspecial}
      />

      {/* Modal de Professor */}
      <TeacherModal
        showTeacherModal={showTeacherModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        setShowTeacherModal={setShowTeacherModal}
        setEditingTeacher={setEditingTeacher}
        setTeacherFormData={setTeacherFormData}
        editingTeacher={editingTeacher}
        handleSaveTeacher={handleSaveTeacher}
        teacherFormData={teacherFormData}
        classesList={classesList}
        getCanonicalGradesForTurma={getCanonicalGradesForTurma}
        savingTeacher={savingTeacher}
      />

      {/* Modal: entrega pedagógica (entregas_docentes) */}
      <EntregaModal
        showEntregaModal={showEntregaModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        setShowEntregaModal={setShowEntregaModal}
        setEditingEntrega={setEditingEntrega}
        savingEntrega={savingEntrega}
        editingEntrega={editingEntrega}
        handleSaveEntrega={handleSaveEntrega}
        entregaFormData={entregaFormData}
        setEntregaFormData={setEntregaFormData}
      />

      {/* Modal: registro de coordenação (registros_coordenacao) */}
      <RegistroCoordModal
        showRegistroCoordModal={showRegistroCoordModal}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
        setShowRegistroCoordModal={setShowRegistroCoordModal}
        setEditingRegistroCoord={setEditingRegistroCoord}
        savingRegistroCoord={savingRegistroCoord}
        editingRegistroCoord={editingRegistroCoord}
        handleSaveRegistroCoord={handleSaveRegistroCoord}
        registroCoordFormData={registroCoordFormData}
        setRegistroCoordFormData={setRegistroCoordFormData}
      />

      <SemedCalendarImportWizard
        open={semedAgenda.showSemedImportWizard}
        onClose={semedAgenda.closeWizard}
        supabase={supabase}
        escolaId={activeSchoolId}
        onSuccess={semedAgenda.onImportSuccess}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      />

      {/* Modal de Evento da Agenda */}
      <EventModal
        showEventModal={showEventModal}
        setShowEventModal={setShowEventModal}
        savingEvent={savingEvent}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
        eventFormData={eventFormData}
        setEventFormData={setEventFormData}
        handleSaveEvent={handleSaveEvent}
        generateTimeOptions={generateTimeOptions}
        handleDeleteAgendaEvent={handleDeleteAgendaEvent}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      />
    </>
  );
}

export default App;

