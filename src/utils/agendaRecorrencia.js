const MAX_OCORRENCIAS = {
  diaria: 366,
  semanal: 52,
  mensal: 24,
};

const MAX_ITERACOES = {
  diaria: 400,
  semanal: 60,
  mensal: 30,
};

/** @param {string} dateStr YYYY-MM-DD */
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Domingo = 0, Sábado = 6 */
export function isWeekdayAllowed(date, incluirSabado, incluirDomingo) {
  const day = date.getDay();
  if (day === 0) return incluirDomingo;
  if (day === 6) return incluirSabado;
  return true;
}

/**
 * A data da primeira ocorrência (início) é sempre incluída; as demais respeitam sábado/domingo.
 */
export function shouldIncludeOccurrenceDate(date, start, incluirSabado, incluirDomingo) {
  if (isSameCalendarDay(date, start)) return true;
  return isWeekdayAllowed(date, incluirSabado, incluirDomingo);
}

function advanceRecurrenceDate(cur, tipo, start) {
  const next = new Date(cur);
  if (tipo === 'diaria') {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (tipo === 'semanal') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (tipo === 'mensal') {
    const origDay = start.getDate();
    const origHours = start.getHours();
    const origMinutes = start.getMinutes();
    const nextMonth = cur.getMonth() + 1;
    const nextYear = cur.getFullYear() + Math.floor(nextMonth / 12);
    const month = nextMonth % 12;
    const daysInMonth = new Date(nextYear, month + 1, 0).getDate();
    return new Date(nextYear, month, Math.min(origDay, daysInMonth), origHours, origMinutes);
  }
  return null;
}

/**
 * Gera instâncias de um evento recorrente.
 * @returns {{ start: Date, end: Date }[]}
 */
export function generateRecurringOccurrences({
  start,
  end,
  tipo,
  ate,
  incluirSabado = false,
  incluirDomingo = false,
}) {
  if (!tipo || tipo === 'nenhuma' || !ate) {
    return [{ start: new Date(start), end: new Date(end) }];
  }

  const endLimit = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate(), 23, 59, 59, 999);
  const durationMs = end.getTime() - start.getTime();
  const max = MAX_OCORRENCIAS[tipo] || 1;
  const maxIter = MAX_ITERACOES[tipo] || 100;
  const startRef = new Date(start);

  const list = [];
  let cur = new Date(start);
  let iter = 0;

  while (cur.getTime() <= endLimit.getTime() && list.length < max && iter < maxIter) {
    iter += 1;
    if (shouldIncludeOccurrenceDate(cur, startRef, incluirSabado, incluirDomingo)) {
      list.push({
        start: new Date(cur),
        end: new Date(cur.getTime() + durationMs),
      });
    }

    const next = advanceRecurrenceDate(cur, tipo, startRef);
    if (!next || next.getTime() === cur.getTime()) break;
    cur = next;
  }

  return list;
}

export function countRecurringOccurrences(form) {
  if (!form?.data_inicio || form.recorrencia_tipo === 'nenhuma' || !form.recorrencia_ate) {
    return 1;
  }
  const [yi, mi, di] = form.data_inicio.split('-').map(Number);
  const [hi, miH] = (form.hora_inicio || '08:00').split(':').map(Number);
  const start = new Date(yi, mi - 1, di, hi, miH);

  let end = start;
  if (form.data_fim && form.hora_fim) {
    const [yf, mf, df] = form.data_fim.split('-').map(Number);
    const [hf, mfH] = form.hora_fim.split(':').map(Number);
    end = new Date(yf, mf - 1, df, hf, mfH);
  }

  const ate = parseLocalDate(form.recorrencia_ate);
  return generateRecurringOccurrences({
    start,
    end,
    tipo: form.recorrencia_tipo,
    ate,
    incluirSabado: !!form.incluir_sabado,
    incluirDomingo: !!form.incluir_domingo,
  }).length;
}

export function getDefaultRecorrenciaAte(dataInicioStr, tipo) {
  const base = dataInicioStr ? parseLocalDate(dataInicioStr) : new Date();
  const d = new Date(base);
  if (tipo === 'diaria') d.setMonth(d.getMonth() + 1);
  else if (tipo === 'semanal') d.setMonth(d.getMonth() + 3);
  else if (tipo === 'mensal') d.setYear(d.getFullYear() + 1);
  else return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getRecorrenciaLabel(tipo) {
  if (tipo === 'diaria') return 'Diária';
  if (tipo === 'semanal') return 'Semanal';
  if (tipo === 'mensal') return 'Mensal';
  return '';
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Infere recorrência e preferências de fim de semana a partir da série */
export function inferRecorrenciaFromSerie(evento, allEvents) {
  if (!evento?.serie_id) {
    return {
      recorrencia_tipo: 'nenhuma',
      recorrencia_ate: '',
      incluir_sabado: false,
      incluir_domingo: false,
    };
  }

  const siblings = (allEvents || [])
    .filter((e) => e.serie_id === evento.serie_id)
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));

  if (siblings.length < 2) {
    return {
      recorrencia_tipo: 'nenhuma',
      recorrencia_ate: '',
      incluir_sabado: false,
      incluir_domingo: false,
    };
  }

  const first = new Date(siblings[0].data_inicio);
  const second = new Date(siblings[1].data_inicio);
  const diffDays = Math.round((second - first) / (24 * 60 * 60 * 1000));

  let recorrencia_tipo = 'mensal';
  if (diffDays === 1) recorrencia_tipo = 'diaria';
  else if (diffDays === 7) recorrencia_tipo = 'semanal';

  const last = new Date(siblings[siblings.length - 1].data_inicio);

  let incluir_sabado = false;
  let incluir_domingo = false;
  for (const ev of siblings) {
    const d = new Date(ev.data_inicio);
    if (d.getDay() === 6) incluir_sabado = true;
    if (d.getDay() === 0) incluir_domingo = true;
  }

  return {
    recorrencia_tipo,
    recorrencia_ate: toDateStr(last),
    incluir_sabado,
    incluir_domingo,
  };
}

export function isSameCalendarInstant(a, b) {
  return a.getTime() === b.getTime();
}
