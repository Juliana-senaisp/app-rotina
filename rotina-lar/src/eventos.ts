export type TipoEvento = 'Evento' | 'Compromisso' | 'Aniversário';

export type Evento = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  data: string; // 'AAAA-MM-DD'
  hora?: string | null; // 'HH:MM'
};

export const TIPOS: TipoEvento[] = ['Evento', 'Compromisso', 'Aniversário'];
export const EMOJI: Record<TipoEvento, string> = {
  Evento: '📌',
  Compromisso: '🗓️',
  Aniversário: '🎂',
};

export const DIAS_ANTES = [7, 3, 2, 1];
export const HORA_AVISO = 9;

export function chaveData(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function lerData(chave: string) {
  const [ano, mes, dia] = chave.split('-').map(Number);
  return { ano, mes, dia };
}

// Aniversário em 29/02 cai no último dia de fevereiro nos anos não bissextos.
function ocorrenciaNoAno(ev: Evento, ano: number) {
  const { mes, dia } = lerData(ev.data);
  const d = new Date(ano, mes - 1, dia);
  return d.getMonth() === mes - 1 ? d : new Date(ano, mes, 0);
}

export function ocorreEm(ev: Evento, d: Date) {
  if (ev.tipo === 'Aniversário') {
    return chaveData(ocorrenciaNoAno(ev, d.getFullYear())) === chaveData(d);
  }
  return chaveData(d) === ev.data;
}

export function proximasOcorrencias(ev: Evento, agora: Date, quantas = 2): Date[] {
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);

  if (ev.tipo !== 'Aniversário') {
    const { ano, mes, dia } = lerData(ev.data);
    const d = new Date(ano, mes - 1, dia);
    return d >= hoje ? [d] : [];
  }

  const lista: Date[] = [];
  let ano = hoje.getFullYear();
  while (lista.length < quantas) {
    const d = ocorrenciaNoAno(ev, ano);
    if (d >= hoje) lista.push(d);
    ano++;
  }
  return lista;
}

export function proximaData(ev: Evento, agora = new Date()): Date | null {
  return proximasOcorrencias(ev, agora, 1)[0] ?? null;
}

export type Lembrete = { quando: Date; diasAntes: number; ocorrencia: Date };

export function lembretesDe(ev: Evento, agora = new Date()): Lembrete[] {
  const lista: Lembrete[] = [];
  for (const oc of proximasOcorrencias(ev, agora, 2)) {
    for (const n of DIAS_ANTES) {
      const quando = new Date(oc);
      quando.setDate(quando.getDate() - n);
      quando.setHours(HORA_AVISO, 0, 0, 0);
      if (quando > agora) lista.push({ quando, diasAntes: n, ocorrencia: oc });
    }
  }
  return lista;
}