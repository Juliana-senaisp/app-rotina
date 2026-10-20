import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy,
} from 'firebase/firestone';
import { db } from './firebase';
import {
  prepararNotificacoes, agendarLembrete, cancelarLembrete, testarEm10Segundos,
} from './notificacoes';
import { useTema, type Tema } from './tema';

type Unidade = 'dias' | 'semanas' | 'meses';
type Tarefa = {
  id: string;
  nome: string;
  intervalo: number;
  unidade: Unidade;
  proxima: number;
  notificacaoId?: string | null;
  feitaEm?: number | null;
};

const UNIDADES: Unidade[] = ['dias', 'semanas', 'meses'];
const HORA_DO_LEMBRETE = 8;

function proximaData(intervalo: number, unidade: Unidade) {
  const d = new Date();
  if (unidade === 'dias') d.setDate(d.getDate() + intervalo);
  if (unidade === 'semanas') d.setDate(d.getDate() + intervalo * 7);
  if (unidade === 'meses') d.setMonth(d.getMonth() + intervalo);
  d.setHours(HORA_DO_LEMBRETE, 0, 0, 0);
  return d;
}

function rotuloUnidade(n: number, u: Unidade) {
  if (n !== 1) return u;
  return u === 'dias' ? 'dia' : u === 'semanas' ? 'semana' : 'mês';
}

function situacao(proxima: number) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(proxima);
  alvo.setHours(0, 0, 0, 0);
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) {
    return { texto: dias === -1 ? 'Atrasada há 1 dia' : `Atrasada há ${-dias} dias`, tipo: 'perigo' as const };
  }
  if (dias === 0) return { texto: 'Hoje', tipo: 'aviso' as const };
  if (dias === 1) return { texto: 'Amanhã', tipo: 'aviso' as const };
  return { texto: `Em ${dias} dias`, tipo: 'ok' as const };
}

function corDoSelo(c: Tema, tipo: 'perigo' | 'aviso' | 'ok') {
  if (tipo === 'perigo') return { fundo: c.perigoSuave, texto: c.perigo };
  if (tipo === 'aviso') return { fundo: c.avisoSuave, texto: c.aviso };
  return { fundo: c.primariaSuave, texto: c.primaria };
}

export default function Tarefas() {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [mensagem, setMensagem] = useState('');
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
    const data = proximaData(t.intervalo, t.unidade);
    let notificacaoId: string | null = null;
    let lembreteOk = true;

    try {
      await cancelarLembrete(t.notificacaoId);
      notificacaoId = await agendarLembrete(t.nome, data);
    } catch (erro) {
      console.error('Erro no lembrete:', erro);
      lembreteOk = false;
    }

    try {
      await updateDoc(doc(db, 'tarefas', t.id), {
        proxima: data.getTime(),
        notificacaoId,
        feitaEm: Date.now(),
      });
      setMensagem(
        `Feito! "${t.nome}" – próxima em ${data.toLocaleDateString('pt-BR')}.` +
        (lembreteOk ? '' : ' (O lembrete não pôde ser agendado.)')
      );
    } catch (erro: any) {
      console.error('Erro ao marcar como feita:', erro);
      setMensagem(`Não foi possível marcar como feita: ${erro?.message ?? erro}`);
    }
    setTimeout(() => setMensagem(''), 6000);
  }

  async function excluir(t: Tarefa) {
    await cancelarLembrete(t.notificacaoId);
    await deleteDoc(doc(db, 'tarefas', t.id));
  }

  const formulario = (
    <View style={s.formulario}>
      {mensagem ? <Text style={s.banner}>{mensagem}</Text> : null}
      <Text style={s.titulo}>Tarefas da casa</Text>
      <Text style={s.rotulo}>Nova tarefa</Text>
      <TextInput
        style={s.input}
        placeholder="Ex: Trocar a roupa de cama"
        placeholderTextColor={c.placeholder}
        value={nome}
        onChangeText={setNome}
      />
      <View style={s.linha}>
        <Text style={s.texto}>A cada</Text>
        <TextInput
          style={[s.input, s.inputNumero]}
          keyboardType="numeric"
          value={intervalo}
          onChangeText={setIntervalo}
        />
        {UNIDADES.map(u => (
          <Pressable
            key={u}
            onPress={() => setUnidade(u)}
            style={[s.chip, unidade === u && s.chipAtivo]}
          >
            <Text style={[s.chipTexto, unidade === u && s.chipTextoAtivo]}>{u}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={s.botao} onPress={adicionar}>
        <Text style={s.botaoTexto}>Adicionar tarefa</Text>
      </Pressable>
    </View>
  );

  return (
    <FlatList
      data={tarefas}
      keyExtractor={t => t.id}
      contentContainerStyle={s.lista}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={formulario}
      ListEmptyComponent={<Text style={s.vazio}>Nenhuma tarefa ainda.</Text>}
      ListFooterComponent={
        <Pressable onPress={testarEm10Segundos}>
          <Text style={s.linkTeste}>Testar notificação (10s)</Text>
        </Pressable>
      }
      renderItem={({ item }) => {
        const feitaHoje = item.feitaEm
          ? new Date(item.feitaEm).toDateString() === new Date().toDateString()
          : false;
        const sit = feitaHoje
          ? { texto: 'Feito hoje ✓', tipo: 'ok' as const }
          : situacao(item.proxima);
        const cor = corDoSelo(c, sit.tipo);
        return (
          <View style={s.card}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.cardNome}>{item.nome}</Text>
              <Text style={s.suave}>
                A cada {item.intervalo} {rotuloUnidade(item.intervalo, item.unidade)} · próxima{' '}
                Última vez: {new Date(item.feitaEm).toLocaleDateString('pt-BR')}
                {new Date(item.proxima).toLocaleDateString('pt-BR')}
              </Text>
              <View style={[s.selo, { backgroundColor: cor.fundo }]}>
                <Text style={[s.seloTexto, { color: cor.texto }]}>{sit.texto}</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable style={s.feito} onPress={() => marcarFeita(item)}>
                <Text style={s.botaoTexto}>Feito</Text>
              </Pressable>
              <Pressable style={s.excluir} onPress={() => excluir(item)}>
                <Text style={s.excluirTexto}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    lista: { padding: 20, paddingBottom: 48, gap: 12 },
    formulario: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 16, gap: 12, marginBottom: 4,
    },
    titulo: { fontSize: 22, fontWeight: '700', color: c.texto },
    rotulo: { fontWeight: '600', color: c.textoSuave },
    texto: { color: c.texto },
    suave: { color: c.textoSuave },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    inputNumero: { width: 60, textAlign: 'center' },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    chip: {
      borderWidth: 1, borderColor: c.borda, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.input,
    },
    chipAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    chipTexto: { color: c.texto },
    chipTextoAtivo: { color: c.textoPrimaria, fontWeight: '600' },
    botao: { backgroundColor: c.primaria, padding: 13, borderRadius: 10, alignItems: 'center' },
    botaoTexto: { color: c.textoPrimaria, fontWeight: '700', textAlign: 'center' },
    vazio: { textAlign: 'center', color: c.textoSuave, marginTop: 24 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 14,
    },
    cardNome: { fontWeight: '700', fontSize: 16, color: c.texto },
    selo: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
    seloTexto: { fontSize: 12, fontWeight: '700' },
    feito: { backgroundColor: c.primaria, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
    excluir: { borderWidth: 1, borderColor: c.perigo, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    excluirTexto: { color: c.perigo, fontWeight: '600', textAlign: 'center' },
    linkTeste: { color: c.textoSuave, textAlign: 'center', textDecorationLine: 'underline', marginTop: 16 },
    banner: {
  backgroundColor: c.primariaSuave, color: c.primaria, fontWeight: '600',
  borderRadius: 10, padding: 10, overflow: 'hidden',
},
  });
}