import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Tarefas from '../Tarefas';
import Cardapio from '../Cardapio';

type Aba = 'tarefas' | 'cardapio';

export default function Home() {
  const [aba, setAba] = useState<Aba>('tarefas');

  return (
    <View style={s.container}>
      <View style={s.abas}>
        {(['tarefas', 'cardapio'] as Aba[]).map(a => (
          <Pressable
            key={a}
            onPress={() => setAba(a)}
            style={[s.aba, aba === a && s.abaAtiva]}
          >
            <Text style={[s.abaTexto, aba === a && s.abaTextoAtivo]}>
              {a === 'tarefas' ? 'Tarefas' : 'Cardápio'}
            </Text>
          </Pressable>
        ))}
      </View>
      {aba === 'tarefas' ? <Tarefas /> : <Cardapio />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
  abas: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  aba: { flex: 1, padding: 14, alignItems: 'center' },
  abaAtiva: { borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
  abaTexto: { fontWeight: '600', color: '#666' },
  abaTextoAtivo: { color: '#2e7d32' },
});