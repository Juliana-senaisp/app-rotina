import { Ionicons } from '@expo/vector-icons';
import type { TipoEvento } from './eventos';

type NomeIcone = keyof typeof Ionicons.glyphMap;

export const ICONE_TIPO: Record<TipoEvento, NomeIcone> = {
  Evento: 'star-outline',
  Compromisso: 'time-outline',
  Aniversário: 'gift-outline',
};

export const ICONE_REPETIR: NomeIcone = 'repeat';

export function IconeTipo({
  tipo,
  cor,
  tamanho = 14,
}: {
  tipo: TipoEvento;
  cor: string;
  tamanho?: number;
}) {
  return <Ionicons name={ICONE_TIPO[tipo]} size={tamanho} color={cor} />;
}