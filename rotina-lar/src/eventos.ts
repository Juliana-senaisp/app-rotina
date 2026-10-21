export type TipoEvento = 'Evento' | 'Compromisso' | 'Aniversário';
export type UnidadeRep = 'dias' | 'semanas' | 'meses' | 'anos';
export type Repeticao = { cada: number; unidade: UnidadeRep };

export type Evento = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  data: string; // 'AAAA-MM-DD' (primeira ocorrência)
  hora?: string | null; // 'HH:MM'
  repeticao?: Repeticao | null; // null = não repete; ausente = eventos antigos
  avisos?: number[]; // dias antes: 7, 3, 2, 1 e 0 (no dia)
};

export const TIPOS: TipoEvento[] = ['Evento', 'Compromisso', 'Aniversário'];
export const EMOJI: Record<TipoEvento, string> = {
  Evento: '📌',
  Compromisso: '🗓️',
  Aniversário: '🎂',
};

export const OPCOES_AVISO = [
  { dias: 7, rotulo: '1 semana' },
  { dias: 3, rotulo: '3 dias' },
  { dias: 2, rotulo: '2 dias' },
  { dias: 1, rotulo: '1 dia' },
  { dias: 0, rotulo: 'No dia' },
];
const AVISOS_TODOS = [7, 3, 2, 1, 0];

export const HORA_AVISO = 9; // avisos de antecedência
export const HORA_NO_DIA = 8; // aviso no próprio dia

// ---------- Datas ----------

export function chaveData(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function lerData(chave: string) {
  const [ano, mes, dia] = chave.split('-').map(Number);
  return { ano, mes, dia };
}

function dataBase(ev: Evento) {
  const { ano, mes, dia } = lerData(ev.data);
  return new Date(ano, mes - 1, dia);
}

function diasUTC(d: Date) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}

export function diasEntre(a: Date, b: Date) {
  return Math.round(diasUTC(b) - diasUTC(a));
}

// Dia que pode "estourar" o mês (ex.: 31 em abril) cai no último dia do mês.
function dataAjustada(ano: number, mesIdx: number, dia: number) {
  const primeiro = new Date(ano, mesIdx, 1);
  const ultimo = new Date(primeiro.getFullYear(), primeiro.getMonth() + 1, 0).getDate();
  return new Date(primeiro.getFullYear(), primeiro.getMonth(), Math.min(dia, ultimo));
}

// ---------- Repetição ----------

export function repeticaoDe(ev: Evento): Repeticao | null {
  if (ev.repeticao !== undefined) return ev.repeticao;
  return ev.tipo === 'Aniversário' ? { cada: 1, unidade: 'anos' } : null; // eventos antigos
}

export function textoRepeticao(rep: Repeticao | null) {
  if (!rep) return '';
  if (rep.cada === 1) {
    return { dias: 'Todo dia', semanas: 'Toda semana', meses: 'Todo mês', anos: 'Todo ano' }[
      rep.unidade
    ];
  }
  return `A cada ${rep.cada} ${rep.unidade}`;
}

// Quanto mais curta a repetição, menos avisos de antecedência por padrão.
export function avisosPadrao(rep: Repeticao | null): number[] {
  if (!rep) return AVISOS_TODOS;
  const dias =
    rep.unidade === 'dias' ? rep.cada
    : rep.unidade === 'semanas' ? rep.cada * 7
    : rep.unidade === 'meses' ? rep.cada * 28
    : rep.cada * 365;
  return dias >= 28 ? AVISOS_TODOS : [0];
}

export function avisosDe(ev: Evento): number[] {
  return ev.avisos ?? AVISOS_TODOS;
}

export function descreverAvisos(dias: number[]) {
  return [...dias]
    .sort((a, b) => b - a)
    .map(n =>
      n === 0 ? 'no dia' : n === 7 ? '1 semana antes' : n === 1 ? '1 dia antes' : `${n} dias antes`
    )
    .join(', ');
}

// k-ésima ocorrência (k = 0 é a data original)
function ocorrencia(ev: Evento, rep: Repeticao | null, k: number): Date {
  const base = dataBase(ev);
  if (!rep) return base;
  const passoDias = rep.cada * (rep.unidade === 'semanas' ? 7 : 1);
  if (rep.unidade === 'dias' || rep.unidade === 'semanas') {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + k * passoDias);
  }
  if (rep.unidade === 'meses') {
    return dataAjustada(base.getFullYear(), base.getMonth() + k * rep.cada, base.getDate());
  }
  return dataAjustada(base.getFullYear() + k * rep.cada, base.getMonth(), base.getDate());
}

function kInicial(rep: Repeticao, base: Date, hoje: Date) {
  if (hoje <= base) return 0;
  if (rep.unidade === 'dias' || rep.unidade === 'semanas') {
    const passo = rep.cada * (rep.unidade === 'dias' ? 1 : 7);
    return Math.max(0, Math.floor(diasEntre(base, hoje) / passo));
  }
  if (rep.unidade === 'meses') {
    const m = (hoje.getFullYear() - base.getFullYear()) * 12 + hoje.getMonth() - base.getMonth();
    return Math.max(0, Math.floor(m / rep.cada) - 1);
  }
  return Math.max(0, Math.floor((hoje.getFullYear() - base.getFullYear()) / rep.cada) - 1);
}

export function ocorreEm(ev: Evento, d: Date) {
  const base = dataBase(ev);
  const alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (alvo < base) return false;

  const rep = repeticaoDe(ev);
  if (!rep) return chaveData(alvo) === chaveData(base);

  if (rep.unidade === 'dias' || rep.unidade === 'semanas') {
    const passo = rep.cada * (rep.unidade === 'dias' ? 1 : 7);
    return diasEntre(base, alvo) % passo === 0;
  }
  if (rep.unidade === 'meses') {
    const m = (alvo.getFullYear() - base.getFullYear()) * 12 + alvo.getMonth() - base.getMonth();
    const esperado = dataAjustada(alvo.getFullYear(), alvo.getMonth(), base.getDate());
    return m % rep.cada === 0 && chaveData(esperado) === chaveData(alvo);
  }
  const a = alvo.getFullYear() - base.getFullYear();
  const esperado = dataAjustada(alvo.getFullYear(), base.getMonth(), base.getDate());
  return a % rep.cada === 0 && chaveData(esperado) === chaveData(alvo);
}

export function proximasOcorrencias(
  ev: Evento,
  agora: Date,
  quantas = 1,
  limiteDias = 400
): Date[] {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const rep = repeticaoDe(ev);
  const base = dataBase(ev);
  if (!rep) return base >= hoje ? [base] : [];

  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + limiteDias);

  const lista: Date[] = [];
  let k = kInicial(rep, base, hoje);
  for (let guarda = 0; guarda < 5000 && lista.length < quantas; guarda++, k++) {
    const d = ocorrencia(ev, rep, k);
    if (d < hoje) continue;
    if (d > limite) break;
    lista.push(d);
  }
  return lista;
}

export function proximaData(ev: Evento, agora = new Date()): Date | null {
  return proximasOcorrencias(ev, agora, 1, 4000)[0] ?? null;
}

// ---------- Lembretes ----------

export type Lembrete = { quando: Date; diasAntes: number; ocorrencia: Date };

export function lembretesDe(ev: Evento, agora = new Date(), horizonteDias = 400): Lembrete[] {
  const avisos = avisosDe(ev);
  const lista: Lembrete[] = [];
  for (const oc of proximasOcorrencias(ev, agora, 60, horizonteDias)) {
    for (const n of avisos) {
      const quando = new Date(oc);
      quando.setDate(quando.getDate() - n);
      quando.setHours(n === 0 ? HORA_NO_DIA : HORA_AVISO, 0, 0, 0);
      if (quando > agora) lista.push({ quando, diasAntes: n, ocorrencia: oc });
    }
  }
  return lista;
}