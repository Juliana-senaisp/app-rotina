import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Tarefas from '../Tarefas';
import Cardapio from '../Cardapio';
import { useTema } from '../tema';

type Aba = 'tarefas' | 'cardapio';

export default function Home() {
  const c = useTema();
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<Aba>('tarefas');

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + 8 }}>
      <View style={[s.abas, { backgroundColor: c.cartao, borderColor: c.borda }]}>
        {(['tarefas', 'cardapio'] as Aba[]).map(a => (
          <Pressable
            key={a}
            onPress={() => setAba(a)}
            style={[s.aba, aba === a && { backgroundColor: c.primaria }]}
          >
            <Text style={[s.abaTexto, { color: aba === a ? c.textoPrimaria : c.textoSuave }]}>
              {a === 'tarefas' ? 'Tarefas' : 'Cardápio'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }}>{aba === 'tarefas' ? <Tarefas /> : <Cardapio />}</View>
    </View>
  );
}

const s = StyleSheet.create({
  abas: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, padding: 4,
    borderWidth: 1, borderRadius: 14, gap: 4,
  },
  aba: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  abaTexto: { fontWeight: '700' },
});