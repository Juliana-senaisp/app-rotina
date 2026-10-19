import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  prepararNotificacoes, agendarLembrete, cancelarLembrete, testarEm10Segundos,
} from '../notificacoes';

type Unidade = 'dias' | 'semanas' | 'meses';
type Tarefa = {
  id: string;
  nome: string;
  intervalo: number;
  unidade: Unidade;
  proxima: number; // data em milissegundos
  notificacaoId?: string | null;
};

const HORA_DO_LEMBRETE = 8; // 8h da manhã

function proximaData(intervalo: number, unidade: Unidade) {
  const d = new Date();
  if (unidade === 'dias') d.setDate(d.getDate() + intervalo);
  if (unidade === 'semanas') d.setDate(d.getDate() + intervalo * 7);
  if (unidade === 'meses') d.setMonth(d.getMonth() + intervalo);
  d.setHours(HORA_DO_LEMBRETE, 0, 0, 0);
  return d;
}

export default function TarefasScreen() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [nome, setNome] = useState('');
  const [intervalo, setIntervalo] = useState('1');
  const [unidade, setUnidade] = useState<Unidade>('semanas');

  useEffect(() => {
    prepararNotificacoes();

    const q = query(collection(db, 'tarefas'), orderBy('proxima'));
    const cancelar = onSnapshot(
      q,
      snap => {
        setTarefas(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tarefa, 'id'>) }))
        );
      },
      erro => console.error('Erro ao ler tarefas:', erro)
    );
    return cancelar;
  }, []);

  async function adicionar() {
    const n = parseInt(intervalo, 10);
    if (!nome.trim() || !n || n < 1) return;
    const data = proximaData(n, unidade);
    const notificacaoId = await agendarLembrete(nome.trim(), data);
    await addDoc(collection(db, 'tarefas'), {
      nome: nome.trim(),
      intervalo: n,
      unidade,
      proxima: data.getTime(),
      notificacaoId,
    });
    setNome('');
  }

  async function marcarFeita(t: Tarefa) {
    await cancelarLembrete(t.notificacaoId);
    const data = proximaData(t.intervalo, t.unidade);
    const notificacaoId = await agendarLembrete(t.nome, data);
    await updateDoc(doc(db, 'tarefas', t.id), {
      proxima: data.getTime(),
      notificacaoId,
    });
  }

  async function excluir(t: Tarefa) {
    await cancelarLembrete(t.notificacaoId);
    await deleteDoc(doc(db, 'tarefas', t.id));
  }

  return (
    <View style={s.container}>
      <Text style={s.titulo}>Tarefas da casa</Text>

      <TextInput
        style={s.input}
        placeholder="Ex: Trocar a roupa de cama"
        value={nome}
        onChangeText={setNome}
      />

      <View style={s.linha}>
        <Text>A cada</Text>
        <TextInput
          style={[s.input, s.inputNumero]}
          keyboardType="numeric"
          value={intervalo}
          onChangeText={setIntervalo}
        />
        {(['dias', 'semanas', 'meses'] as Unidade[]).map(u => (
          <Pressable
            key={u}
            onPress={() => setUnidade(u)}
            style={[s.chip, unidade === u && s.chipAtivo]}
          >
            <Text style={unidade === u && s.chipTextoAtivo}>{u}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={s.botao} onPress={adicionar}>
        <Text style={s.botaoTexto}>Adicionar tarefa</Text>
      </Pressable>

      <Pressable style={s.botaoTeste} onPress={testarEm10Segundos}>
        <Text style={s.botaoTesteTexto}>Testar notificação (10s)</Text>
      </Pressable>

      <FlatList
        data={tarefas}
        keyExtractor={t => t.id}
        ListEmptyComponent={<Text style={s.vazio}>Nenhuma tarefa ainda.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardNome}>{item.nome}</Text>
              <Text>A cada {item.intervalo} {item.unidade}</Text>
              <Text>Próxima: {new Date(item.proxima).toLocaleDateString('pt-BR')}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable style={s.feito} onPress={() => marcarFeita(item)}>
                <Text style={s.botaoTexto}>Feito</Text>
              </Pressable>
              <Pressable style={s.excluir} onPress={() => excluir(item)}>
                <Text style={s.excluirTexto}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, gap: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  inputNumero: { width: 60, textAlign: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipAtivo: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  chipTextoAtivo: { color: '#fff' },
  botao: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  botaoTeste: { borderWidth: 1, borderColor: '#2e7d32', padding: 10, borderRadius: 8, alignItems: 'center' },
  botaoTesteTexto: { color: '#2e7d32', fontWeight: '600' },
  vazio: { textAlign: 'center', color: '#888', marginTop: 20 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginTop: 10 },
  cardNome: { fontWeight: 'bold', fontSize: 16 },
  feito: { backgroundColor: '#2e7d32', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  excluir: { borderWidth: 1, borderColor: '#c62828', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  excluirTexto: { color: '#c62828', fontWeight: '600', textAlign: 'center' },
});