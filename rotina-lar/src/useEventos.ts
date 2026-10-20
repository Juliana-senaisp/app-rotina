import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { prepararNotificacoes, sincronizarLembretesEventos } from './notificacoes';
import type { Evento } from './eventos';

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const cancelar = onSnapshot(
      collection(db, 'eventos'),
      snap => {
        const lista = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Evento, 'id'>),
        }));
        setEventos(lista);
        setErro(null);

        // Sem conexão, os dados podem vir incompletos: não mexe nos lembretes.
        if (snap.metadata.fromCache) return;
        prepararNotificacoes()
          .then(() => sincronizarLembretesEventos(lista))
          .catch(e => console.error('Notificações:', e));
      },
      e => {
        console.error('Erro ao ler eventos:', e);
        setErro(e.message);
      }
    );
    return cancelar;
  }, []);

  return { eventos, erro };
}