/** Papéis de acesso do SACP (coordenador vs professor). */

export const USER_ROLE = {
  COORDENADOR: 'coordenador',
  PROFESSOR: 'professor',
};

/** Views permitidas para o papel professor. */
export const PROFESSOR_ALLOWED_VIEWS = new Set([
  'dashboard',
  'classes',
  'students',
  'student-detail',
  'agenda',
  'agenda-event-detail',
  'entregas',
  'profile',
  'chat-ia',
]);

/** Itens da barra inferior no mobile (professor). */
export const PROFESSOR_BOTTOM_NAV = [
  { id: 'dashboard', label: 'Início', icon: 'fas fa-home' },
  { id: 'classes', label: 'Minhas Turmas', icon: 'fas fa-users' },
  { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-alt' },
  { id: 'entregas', label: 'Entregas', icon: 'fas fa-folder-open' },
  { id: 'menu', label: 'Mais', icon: 'fas fa-ellipsis-h', isMenu: true },
];

/**
 * Resolve o papel do usuário autenticado.
 * 1) Busca professor por user_id
 * 2) Senão, por auth_email (e-mail do login) e associa user_id no primeiro acesso
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, email?: string | null }} user
 * @returns {Promise<{ role: 'coordenador' | 'professor', professor: object | null }>}
 */
export async function resolveUserRole(supabase, user) {
  if (!user?.id) {
    return { role: USER_ROLE.COORDENADOR, professor: null };
  }

  const { data: byUserId, error: errById } = await supabase
    .from('professores')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!errById && byUserId) {
    return { role: USER_ROLE.PROFESSOR, professor: byUserId };
  }

  const email = (user.email || '').trim().toLowerCase();
  if (!email) {
    return { role: USER_ROLE.COORDENADOR, professor: null };
  }

  const { data: byEmail, error: errByEmail } = await supabase
    .from('professores')
    .select('*')
    .ilike('auth_email', email)
    .is('user_id', null)
    .maybeSingle();

  if (errByEmail || !byEmail) {
    return { role: USER_ROLE.COORDENADOR, professor: null };
  }

  const { data: claimed, error: claimError } = await supabase
    .from('professores')
    .update({ user_id: user.id, auth_email: email })
    .eq('id', byEmail.id)
    .select('*')
    .maybeSingle();

  if (claimError || !claimed) {
    // Coluna pode ainda não existir no banco: trata como coordenador
    console.warn('Não foi possível vincular user_id ao professor:', claimError?.message);
    return { role: USER_ROLE.COORDENADOR, professor: null };
  }

  return { role: USER_ROLE.PROFESSOR, professor: claimed };
}

/**
 * Views escondidas do professor autônomo (usa a ferramenta sozinho).
 * Ele é coordenador da própria conta — continua podendo cadastrar escola,
 * turma e aluno pelos botões dentro das telas —, mas estas telas só fazem
 * sentido quando existe uma equipe/coordenação por trás.
 */
export const AUTONOMO_HIDDEN_VIEWS = new Set([
  'schools',
  'teachers',
  'teacher-detail',
  'emprestimos',
  'reports',
  'graficos',
  'settings',
]);

export function isProfessorRole(role) {
  return role === USER_ROLE.PROFESSOR;
}

export function isViewAllowedForRole(role, viewId, { isAutonomo = false } = {}) {
  if (isProfessorRole(role)) return PROFESSOR_ALLOWED_VIEWS.has(viewId);
  if (isAutonomo) return !AUTONOMO_HIDDEN_VIEWS.has(viewId);
  return true;
}

/** Filtra turmas às vinculadas ao perfil do professor. */
export function filterTurmasForProfessor(turmas, professor) {
  if (!professor) return [];
  const ids = new Set((professor.turmas_ids || []).map(String));
  return (turmas || []).filter((t) => ids.has(String(t.id)));
}

/** Filtra IDs de turma ao escopo do professor. */
export function filterTurmaIdsForProfessor(turmaIds, professor) {
  if (!professor) return [];
  const ids = new Set((professor.turmas_ids || []).map(String));
  return (turmaIds || []).filter((id) => ids.has(String(id)));
}

/** True se a turma está no escopo do professor. */
export function professorHasTurma(professor, turmaId) {
  if (!professor || !turmaId) return false;
  return (professor.turmas_ids || []).some((id) => String(id) === String(turmaId));
}
