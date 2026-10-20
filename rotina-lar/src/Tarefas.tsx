import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { cancelarLembrete, testarEm10Segundos } from './notificacoes';
import {
  UNIDADES, proximaData, hojeAsOito, rotuloUnidade, situacao, foiFeitaHoje,
  reagendar, marcarTarefaFeita, type Tarefa, type Unidade,
} from './tarefasLogica';
import { useTema, type Tema } from './tema';

type Mensagem = { texto: string; tipo: 'ok' | 'erro' };

function corDoSelo(c: Tema, tipo: 'perigo' | 'aviso' | 'ok') {
  if (tipo === 'perigo') return { fundo: c.perigoSuave, texto: c.perigo };
  if (tipo === 'aviso') return { fundo: c.avisoSuave, texto: c.aviso };
  return { fundo: c.primariaSuave, texto: c.primaria };
}

export default function Tarefas({ tarefas, erro }: { tarefas: Tarefa[]; erro: string | null }) {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [nome, setNome] = useState('');
  const [intervalo, setIntervalo] = useState('1');
  const [unidade, setUnidade] = useState<Unidade>('semanas');
  const [comecaHoje, setComecaHoje] = useState(true);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function mostrarMensagem(texto: string, tipo: 'ok' | 'erro' = 'ok') {
    if (temporizador.current) clearTimeout(temporizador.current);
    setMensagem({ texto, tipo });
    temporizador.current = setTimeout(() => setMensagem(null), 6000);
  }

  const n = parseInt(intervalo, 10);
  const rotuloDepois = n ? `Em ${n} ${rotuloUnidade(n, unidade)}` : 'Depois do intervalo';

  async function adicionar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      mostrarMensagem('Digite o nome da tarefa.', 'erro');
      return;
    }
    if (!n || n < 1) {
      mostrarMensagem('Informe um intervalo de 1 ou mais.', 'erro');
      return;
    }

    try {
      const data = comecaHoje ? hojeAsOito() : proximaData(n, unidade);
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
        (comecaHoje
          ? 'Tarefa adicionada para hoje.'
          : `Tarefa adicionada. Próxima em ${data.toLocaleDateString('pt-BR')}.`) +
          (lembrete.ok ? '' : ' (O lembrete não pôde ser agendado.)')
      );
    } catch (e: any) {
      console.error('Erro ao adicionar:', e);
      mostrarMensagem(`Não foi possível adicionar: ${e?.message ?? e}`, 'erro');
    }
  }

  async function marcarFeita(t: Tarefa) {
    if (ocupadoId || foiFeitaHoje(t)) return;
    setOcupadoId(t.id);
    try {
      const { data, lembreteOk } = await marcarTarefaFeita(t);
      mostrarMensagem(
        `Feito! "${t.nome}" – próxima em ${data.toLocaleDateString('pt-BR')}.` +
          (lembreteOk ? '' : ' (O lembrete não pôde ser agendado.)')
      );
    } catch (e: any) {
      console.error('Erro ao marcar como feita:', e);
      mostrarMensagem(`Não foi possível marcar como feita: ${e?.message ?? e}`, 'erro');
    } finally {
      setOcupadoId(null);
    }
  }

  async function excluir(t: Tarefa) {
    if (confirmandoId !== t.id) {
      setConfirmandoId(t.id);
      setTimeout(() => setConfirmandoId(atual => (atual === t.id ? null : atual)), 4000);
      return;
    }
    setConfirmandoId(null);
    try {
      try {
        await cancelarLembrete(t.notificacaoId);
      } catch (e) {
        console.error('Erro ao cancelar lembrete:', e);
      }
      await deleteDoc(doc(db, 'tarefas', t.id));
      mostrarMensagem(`Tarefa "${t.nome}" excluída.`);
    } catch (e: any) {
      console.error('Erro ao excluir:', e);
      mostrarMensagem(`Não foi possível excluir: ${e?.message ?? e}`, 'erro');
    }
  }

  const formulario = (
    <View style={s.formulario}>
      <Text style={s.titulo}>Tarefas da casa</Text>
      <Text style={s.rotulo}>Nova tarefa</Text>
      <TextInput
        style={s.input}
        placeholder="Nome da tarefa"
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
      <Text style={s.rotulo}>Primeira vez</Text>
      <View style={s.linha}>
        <Pressable
          onPress={() => setComecaHoje(true)}
          style={[s.chip, comecaHoje && s.chipAtivo]}
        >
          <Text style={[s.chipTexto, comecaHoje && s.chipTextoAtivo]}>Hoje</Text>
        </Pressable>
        <Pressable
          onPress={() => setComecaHoje(false)}
          style={[s.chip, !comecaHoje && s.chipAtivo]}
        >
          <Text style={[s.chipTexto, !comecaHoje && s.chipTextoAtivo]}>{rotuloDepois}</Text>
        </Pressable>
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
      {erro ? (
        <Text style={[s.banner, s.bannerErro]}>Não foi possível carregar as tarefas: {erro}</Text>
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
          const feitaHoje = foiFeitaHoje(item);
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
                  style={[s.feito, feitaHoje && s.feitoConcluido, ocupado && s.desabilitado]}
                  disabled={ocupado || feitaHoje}
                  onPress={() => marcarFeita(item)}
                >
                  <Text style={s.botaoTexto}>
                    {ocupado ? '...' : feitaHoje ? 'Feito ✓' : 'Feito'}
                  </Text>
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
    botao: { backgroundColor: c.destaque, padding: 13, borderRadius: 12, alignItems: 'center' },
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
    feitoConcluido: { backgroundColor: c.sucesso },
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