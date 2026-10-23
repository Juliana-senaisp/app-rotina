import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Hoje from './Hoje';
import Tarefas from './Tarefas';
import Cardapio from './Cardapio';
import Calendario from './Calendario';
import Mais from './Mais';
import Compras from './Compras';
import { useEventos } from './useEventos';
import { useTarefas } from './tarefasLogica';
import { useTema } from './tema';

type Aba = 'hoje' | 'tarefas' | 'cardapio' | 'calendario' | 'mais' | 'compras';
type Icone = keyof typeof Ionicons.glyphMap;

const ABAS: { id: Aba; rotulo: string; icone: Icone; iconeAtivo: Icone }[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: 'home-outline', iconeAtivo: 'home' },
  { id: 'tarefas', rotulo: 'Tarefas', icone: 'checkmark-circle-outline', iconeAtivo: 'checkmark-circle' },
  { id: 'cardapio', rotulo: 'Cardápio', icone: 'restaurant-outline', iconeAtivo: 'restaurant' },
  { id: 'calendario', rotulo: 'Calendário', icone: 'calendar-outline', iconeAtivo: 'calendar' },
  { id: 'mais', rotulo: 'Mais', icone: 'grid-outline', iconeAtivo: 'grid' },
];

// Telas que ficam dentro do menu "Mais" mantêm essa aba destacada.
const DENTRO_DE_MAIS: Aba[] = ['mais', 'compras'];

export default function Principal() {
  const c = useTema();
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<Aba>('hoje');
  const { eventos, erro: erroEventos } = useEventos();
  const { tarefas, erro: erroTarefas } = useTarefas();

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + 8 }}>
      <View style={{ flex: 1 }}>
        {aba === 'hoje' && <Hoje tarefas={tarefas} eventos={eventos} onIrPara={setAba} />}
        {aba === 'tarefas' && <Tarefas tarefas={tarefas} erro={erroTarefas} />}
        {aba === 'cardapio' && <Cardapio />}
        {aba === 'calendario' && <Calendario eventos={eventos} erro={erroEventos} />}
        {aba === 'mais' && <Mais onAbrir={setAba} />}
        {aba === 'compras' && <Compras onVoltar={() => setAba('mais')} />}
      </View>

      <View
        style={[
          s.barra,
          { backgroundColor: c.cartao, borderColor: c.borda, paddingBottom: insets.bottom + 8 },
        ]}
      >
        {ABAS.map(a => {
          const ativa = a.id === 'mais' ? DENTRO_DE_MAIS.includes(aba) : aba === a.id;
          return (
            <Pressable key={a.id} style={s.aba} onPress={() => setAba(a.id)}>
              <View style={[s.icone, ativa && { backgroundColor: c.primariaSuave }]}>
                <Ionicons
                  name={ativa ? a.iconeAtivo : a.icone}
                  size={22}
                  color={ativa ? c.primaria : c.textoSuave}
                />
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
  icone: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14 },
  rotulo: { fontSize: 11, fontWeight: '700' },
});