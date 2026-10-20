import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Tarefas from '../Tarefas';
import Cardapio from '../Cardapio';
import Calendario from '../Calendario';
import { useEventos } from '../useEventos';
import { useTema } from '../tema';

type Aba = 'tarefas' | 'cardapio' | 'calendario';

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'tarefas', rotulo: 'Tarefas', icone: '✅' },
  { id: 'cardapio', rotulo: 'Cardápio', icone: '🍽️' },
  { id: 'calendario', rotulo: 'Calendário', icone: '📅' },
];

export default function Home() {
  const c = useTema();
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<Aba>('tarefas');
  const { eventos, erro } = useEventos();

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + 8 }}>
      <View style={{ flex: 1 }}>
        {aba === 'tarefas' && <Tarefas />}
        {aba === 'cardapio' && <Cardapio />}
        {aba === 'calendario' && <Calendario eventos={eventos} erro={erro} />}
      </View>

      <View
        style={[
          s.barra,
          { backgroundColor: c.cartao, borderColor: c.borda, paddingBottom: insets.bottom + 8 },
        ]}
      >
        {ABAS.map(a => {
          const ativa = aba === a.id;
          return (
            <Pressable key={a.id} style={s.aba} onPress={() => setAba(a.id)}>
              <View style={[s.icone, ativa && { backgroundColor: c.primariaSuave }]}>
                <Text style={s.iconeTexto}>{a.icone}</Text>
              </View>
              <Text style={[s.rotulo, { color: ativa ? c.primaria : c.textoSuave }]}>
                {a.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  barra: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  aba: { flex: 1, alignItems: 'center', gap: 2 },
  icone: { paddingHorizontal: 18, paddingVertical: 4, borderRadius: 14 },
  iconeTexto: { fontSize: 18 },
  rotulo: { fontSize: 12, fontWeight: '700' },
});