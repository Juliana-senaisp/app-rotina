import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy,
} from 'firebase/firestore';
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
type Mensagem = { texto: string; tipo: 'ok' | 'erro' };

const UNIDADES: Unidade[] = ['dias', 'semanas', 'meses'];
const HORA_DO_LEMBRETE = 8;

function proximaData(intervalo: number, unidade: Unidade) {
  const d = new Date();
  if (unidade === 'dias') d.setDate(d.getDate() + intervalo);
  if (unidade === 'semanas') d.setDate(d.getDate() + intervalo * 7);
  if (unidade === 'meses') {
    const dia = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + intervalo);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ultimoDia));
  }
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
    return {
      texto: dias === -1 ? 'Atrasada há 1 dia' : `Atrasada há ${-dias} dias`,
      tipo: 'perigo' as const,
    };
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

// Cancela o lembrete antigo (se houver) e agenda o novo.
// Se falhar, não interrompe: devolve ok = false.
async function reagendar(nome: string, data: Date, idAntigo?: string | null) {
  try {
    await cancelarLembrete(idAntigo);
    const id = await agendarLembrete(nome, data);
    return { id, ok: true };
  } catch (erro) {
    console.error('Erro no lembrete:', erro);
    return { id: null, ok: false };
  }
}

export default function Tarefas() {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [nome, setNome] = useState('');
  const [intervalo, setIntervalo] = useState('1');
  const [unidade, setUnidade] = useState<Unidade>('semanas');
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mostrarMensagem(texto: string, tipo: 'ok' | 'erro' = 'ok') {
    if (temporizador.current) clearTimeout(temporizador.current);
    setMensagem({ texto, tipo });
    temporizador.current = setTimeout(() => setMensagem(null), 6000);
  }

  useEffect(() => {
    prepararNotificacoes().catch(e => console.error('Notificações:', e));

    const q = query(collection(db, 'tarefas'), orderBy('proxima'));
    const cancelar = onSnapshot(
      q,
      snap => {
        setTarefas(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tarefa, 'id'>) }))
        );
      },
      erro => {
        console.error('Erro ao ler tarefas:', erro);
        mostrarMensagem(`Não foi possível carregar as tarefas: ${erro.message}`, 'erro');
      }
    );

    return () => {
      cancelar();
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  async function adicionar() {
    const nomeLimpo = nome.trim();
    const n = parseInt(intervalo, 10);

    if (!nomeLimpo) {
      mostrarMensagem('Digite o nome da tarefa.', 'erro');
      return;
    }
    if (!n || n < 1) {
      mostrarMensagem('Informe um intervalo de 1 ou mais.', 'erro');
      return;
    }

    try {
      const data = proximaData(n, unidade);
      const lembrete = await reagendar(nomeLimpo, data);
      await addDoc(collection(db, 'tarefas'), {
        nome: nomeLimpo,
        intervalo: n,
        unidade,
        proxima: data.getTime(),
        notificacaoId: lembrete.id,
        feitaEm: null,
      });
      setNome('');
      mostrarMensagem(
        `Tarefa adicionada. Próxima em ${data.toLocaleDateString('pt-BR')}.` +
          (lembrete.ok ? '' : ' (O lembrete não pôde ser agendado.)')
      );
    } catch (erro: any) {
      console.error('Erro ao adicionar:', erro);
      mostrarMensagem(`Não foi possível adicionar: ${erro?.message ?? erro}`, 'erro');
    }
  }

  async function marcarFeita(t: Tarefa) {
    if (ocupadoId) return;
    setOcupadoId(t.id);
    try {
      const data = proximaData(t.intervalo, t.unidade);
      const lembrete = await reagendar(t.nome, data, t.notificacaoId);
      await updateDoc(doc(db, 'tarefas', t.id), {
        proxima: data.getTime(),
        notificacaoId: lembrete.id,
        feitaEm: Date.now(),
      });
      mostrarMensagem(
        `Feito! "${t.nome}" – próxima em ${data.toLocaleDateString('pt-BR')}.` +
          (lembrete.ok ? '' : ' (O lembrete não pôde ser agendado.)')
      );
    } catch (erro: any) {
      console.error('Erro ao marcar como feita:', erro);
      mostrarMensagem(`Não foi possível marcar como feita: ${erro?.message ?? erro}`, 'erro');
    } finally {
      setOcupadoId(null);
    }
  }

  async function excluir(t: Tarefa) {
    // Primeiro toque pede confirmação; segundo toque exclui.
    if (confirmandoId !== t.id) {
      setConfirmandoId(t.id);
      setTimeout(() => setConfirmandoId(atual => (atual === t.id ? null : atual)), 4000);
      return;
    }
    setConfirmandoId(null);
    try {
      try {
        await cancelarLembrete(t.notificacaoId);
      } catch (erro) {
        console.error('Erro ao cancelar lembrete:', erro);
      }
      await deleteDoc(doc(db, 'tarefas', t.id));
      mostrarMensagem(`Tarefa "${t.nome}" excluída.`);
    } catch (erro: any) {
      console.error('Erro ao excluir:', erro);
      mostrarMensagem(`Não foi possível excluir: ${erro?.message ?? erro}`, 'erro');
    }
  }

  const formulario = (
    <View style={s.formulario}>
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
          maxLength={3}
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
    <View style={s.tela}>
      {mensagem ? (
        <Text style={[s.banner, mensagem.tipo === 'erro' ? s.bannerErro : s.bannerOk]}>
          {mensagem.texto}
        </Text>
      ) : null}

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
          const ocupado = ocupadoId === item.id;
          const confirmando = confirmandoId === item.id;

          return (
            <View style={s.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.cardNome}>{item.nome}</Text>
                <Text style={s.suave}>
                  A cada {item.intervalo} {rotuloUnidade(item.intervalo, item.unidade)} · próxima{' '}
                  {new Date(item.proxima).toLocaleDateString('pt-BR')}
                </Text>
                {item.feitaEm ? (
                  <Text style={s.suave}>
                    Última vez: {new Date(item.feitaEm).toLocaleDateString('pt-BR')}
                  </Text>
                ) : null}
                <View style={[s.selo, { backgroundColor: cor.fundo }]}>
                  <Text style={[s.seloTexto, { color: cor.texto }]}>{sit.texto}</Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Pressable
                  style={[s.feito, ocupado && s.desabilitado]}
                  disabled={ocupado}
                  onPress={() => marcarFeita(item)}
                >
                  <Text style={s.botaoTexto}>{ocupado ? '...' : 'Feito'}</Text>
                </Pressable>
                <Pressable
                  style={[s.excluir, confirmando && s.excluirConfirmar]}
                  onPress={() => excluir(item)}
                >
                  <Text style={confirmando ? s.excluirTextoConfirmar : s.excluirTexto}>
                    {confirmando ? 'Confirmar?' : 'Excluir'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    tela: { flex: 1 },
    lista: { padding: 20, paddingBottom: 48, gap: 12 },
    banner: {
      marginHorizontal: 20, marginBottom: 4, padding: 10,
      borderRadius: 10, fontWeight: '600', overflow: 'hidden',
    },
    bannerOk: { backgroundColor: c.primariaSuave, color: c.primaria },
    bannerErro: { backgroundColor: c.perigoSuave, color: c.perigo },
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
    selo: {
      alignSelf: 'flex-start', borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 3, marginTop: 2,
    },
    seloTexto: { fontSize: 12, fontWeight: '700' },
    feito: { backgroundColor: c.primaria, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
    desabilitado: { opacity: 0.5 },
    excluir: {
      borderWidth: 1, borderColor: c.perigo,
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    },
    excluirConfirmar: { backgroundColor: c.perigo },
    excluirTexto: { color: c.perigo, fontWeight: '600', textAlign: 'center' },
    excluirTextoConfirmar: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
    linkTeste: {
      color: c.textoSuave, textAlign: 'center',
      textDecorationLine: 'underline', marginTop: 16,
    },
  });
}