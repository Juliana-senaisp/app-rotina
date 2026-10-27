import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EMOJI, lembretesDe, type Evento } from './eventos';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function prepararNotificacoes(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes da casa',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  return status === 'granted';
}

export async function agendarLembrete(nome: string, data: Date): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Lembrete da casa', body: nome },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: data,
      channelId: 'lembretes',
    },
  });
}

export async function cancelarLembrete(id?: string | null) {
  if (Platform.OS === 'web' || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function testarEm10Segundos() {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Teste', body: 'Os lembretes estão funcionando!' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      channelId: 'lembretes',
    },
  });
}

// ---------- Lembretes dos eventos do calendário ----------
// ---------- Lembretes de tarefas atrasadas ----------

const ORIGEM_ATRASADAS = 'atrasadas';
const HORA_ATRASADAS = 9; // horário do aviso diário
const DIAS_A_FRENTE = 7; // quantos dias à frente ficam agendados

type TarefaBasica = { nome: string; proxima: number };

function inicioDoDia(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function listaDeNomes(nomes: string[]) {
  const primeiros = nomes.slice(0, 3);
  const resto = nomes.length - primeiros.length;
  if (resto > 0) return `${primeiros.join(', ')} e mais ${resto}`;
  if (primeiros.length === 1) return primeiros[0];
  return `${primeiros.slice(0, -1).join(', ')} e ${primeiros[primeiros.length - 1]}`;
}

async function executarSincronizacaoAtrasadas(tarefas: TarefaBasica[]) {
  // Remove só os avisos de atrasadas e recria a partir dos dados atuais.
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  for (const a of agendadas) {
    if (a.content.data?.origem === ORIGEM_ATRASADAS) {
      await Notifications.cancelScheduledNotificationAsync(a.identifier);
    }
  }

  const agora = new Date();
  for (let i = 0; i < DIAS_A_FRENTE; i++) {
    const dia = inicioDoDia(agora);
    dia.setDate(dia.getDate() + i);

    const quando = new Date(dia);
    quando.setHours(HORA_ATRASADAS, 0, 0, 0);
    if (quando <= agora) continue;

    // Atrasada naquele dia = a data prevista é anterior ao início do dia.
    const atrasadas = tarefas
      .filter(t => t.proxima < dia.getTime())
      .sort((a, b) => a.proxima - b.proxima);
    if (atrasadas.length === 0) continue;

    let corpo: string;
    if (atrasadas.length === 1) {
      const previsto = inicioDoDia(new Date(atrasadas[0].proxima));
      const dias = Math.round((dia.getTime() - previsto.getTime()) / 86400000);
      corpo = `"${atrasadas[0].nome}" está atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;
    } else {
      corpo = `${atrasadas.length} tarefas atrasadas: ${listaDeNomes(atrasadas.map(t => t.nome))}.`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: atrasadas.length === 1 ? '⏰ Tarefa atrasada' : '⏰ Tarefas atrasadas',
        body: corpo,
        data: { origem: ORIGEM_ATRASADAS },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: 'lembretes',
      },
    });
  }
}

export function sincronizarLembretesAtrasadas(tarefas: TarefaBasica[]): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  fila = fila
    .then(() => executarSincronizacaoAtrasadas(tarefas))
    .catch(erro => console.error('Erro ao sincronizar lembretes de atrasadas:', erro));
  return fila;
}

export async function contarLembretesAtrasadas(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const todas = await Notifications.getAllScheduledNotificationsAsync();
  return todas.filter(a => a.content.data?.origem === ORIGEM_ATRASADAS).length;
}