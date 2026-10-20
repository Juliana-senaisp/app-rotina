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

const ORIGEM_EVENTO = 'evento';
let fila: Promise<void> = Promise.resolve();

function textoDoLembrete(ev: Evento, diasAntes: number, ocorrencia: Date) {
  const quando =
    diasAntes === 1 ? 'amanhã' : diasAntes === 7 ? 'em 1 semana' : `em ${diasAntes} dias`;
  const data = ocorrencia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = ev.hora ? ` às ${ev.hora}` : '';
  return `${ev.tipo} ${quando} (${data}${hora})`;
}

async function executarSincronizacao(eventos: Evento[]) {
  // Remove só os lembretes de eventos e recria a partir dos dados atuais.
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  for (const a of agendadas) {
    if (a.content.data?.origem === ORIGEM_EVENTO) {
      await Notifications.cancelScheduledNotificationAsync(a.identifier);
    }
  }

  const agora = new Date();
  for (const ev of eventos) {
    for (const l of lembretesDe(ev, agora)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${EMOJI[ev.tipo]} ${ev.titulo}`,
          body: textoDoLembrete(ev, l.diasAntes, l.ocorrencia),
          data: { origem: ORIGEM_EVENTO, eventoId: ev.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: l.quando,
          channelId: 'lembretes',
        },
      });
    }
  }
}

// As sincronizações rodam uma de cada vez, para não duplicar lembretes.
export function sincronizarLembretesEventos(eventos: Evento[]): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  fila = fila
    .then(() => executarSincronizacao(eventos))
    .catch(erro => console.error('Erro ao sincronizar lembretes:', erro));
  return fila;
}

export async function contarLembretesAgendados(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const todas = await Notifications.getAllScheduledNotificationsAsync();
  return todas.length;
}