import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { agendarLembrete, cancelarLembrete, prepararNotificacoes } from './notificacoes';

export type Unidade = 'dias' | 'semanas' | 'meses';
export type Tarefa = {
  id: string;
  nome: string;
  intervalo: number;
  unidade: Unidade;
  proxima: number;
  notificacaoId?: string | null;
  feitaEm?: number | null;
};

export const UNIDADES: Unidade[] = ['dias', 'semanas', 'meses'];
const HORA_DO_LEMBRETE = 8;

export function hojeAsOito() {
  const d = new Date();
  d.setHours(HORA_DO_LEMBRETE, 0, 0, 0);
  return d;
}

export function proximaData(intervalo: number, unidade: Unidade) {
  const d = new Date();
  if (unidade === 'dias') d.setDate(d.getDate() + intervalo);
  if (unidade === 'semanas') d.setDate(d.getDate() + intervalo * 7);
  if (unidade === 'meses') {
    const dia = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + intervalo);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ultimoDia));
  }
  d.setHours(HORA_DO_LEMBRETE, 0, 0, 0);
  return d;
}

export function rotuloUnidade(n: number, u: Unidade) {
  if (n !== 1) return u;
  return u === 'dias' ? 'dia' : u === 'semanas' ? 'semana' : 'mês';
}

export function foiFeitaHoje(t: Tarefa) {
  return !!t.feitaEm && new Date(t.feitaEm).toDateString() === new Date().toDateString();
}

export function venceAteHoje(t: Tarefa) {
  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);
  return t.proxima <= fimDoDia.getTime();
}

export function situacao(proxima: number) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(proxima);
  alvo.setHours(0, 0, 0, 0);
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) {
    return {
      texto: dias === -1 ? 'Atrasada há 1 dia' : `Atrasada há ${-dias} dias`,
      tipo: 'perigo' as const,
    };
  }
  if (dias === 0) return { texto: 'Hoje', tipo: 'aviso' as const };
  if (dias === 1) return { texto: 'Amanhã', tipo: 'aviso' as const };
  return { texto: `Em ${dias} dias`, tipo: 'ok' as const };
}

// Cancela o lembrete antigo e agenda o novo. Nunca interrompe: devolve ok = false se falhar.
// Datas que já passaram não geram lembrete.
export async function reagendar(nome: string, data: Date, idAntigo?: string | null) {
  try {
    await cancelarLembrete(idAntigo);
    if (data.getTime() <= Date.now()) return { id: null as string | null, ok: true };
    const id = await agendarLembrete(nome, data);
    return { id, ok: true };
  } catch (erro) {
    console.error('Erro no lembrete:', erro);
    return { id: null as string | null, ok: false };
  }
}

export async function marcarTarefaFeita(t: Tarefa) {
  const data = proximaData(t.intervalo, t.unidade);
  const lembrete = await reagendar(t.nome, data, t.notificacaoId);
  await updateDoc(doc(db, 'tarefas', t.id), {
    proxima: data.getTime(),
    notificacaoId: lembrete.id,
    feitaEm: Date.now(),
  });
  return { data, lembreteOk: lembrete.ok };
}

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    prepararNotificacoes().catch(e => console.error('Notificações:', e));
    const q = query(collection(db, 'tarefas'), orderBy('proxima'));
    return onSnapshot(
      q,
      snap => {
        setTarefas(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tarefa, 'id'>) }))
        );
        setErro(null);
      },
      e => {
        console.error('Erro ao ler tarefas:', e);
        setErro(e.message);
      }
    );
  }, []);

  return { tarefas, erro };
}