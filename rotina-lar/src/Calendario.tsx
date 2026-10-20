import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { contarLembretesAgendados } from './notificacoes';
import {
  TIPOS, EMOJI, chaveData, ocorreEm, proximaData, lembretesDe,
  type Evento, type TipoEvento,
} from './eventos';
import { useTema, type Tema } from './tema';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

function corDoTipo(c: Tema, tipo: TipoEvento) {
  if (tipo === 'Aniversário') return { fundo: c.primariaSuave, texto: c.primaria };
  if (tipo === 'Compromisso') return { fundo: c.lavandaSuave, texto: c.lavanda };
  return { fundo: c.pessegoSuave, texto: c.pessego };
}

function diasAte(d: Date) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(d);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function textoDias(n: number) {
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  return `Em ${n} dias`;
}

export default function Calendario({ eventos, erro }: { eventos: Evento[]; erro: string | null }) {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const agora = new Date();
  const [mes, setMes] = useState(new Date(agora.getFullYear(), agora.getMonth(), 1));
  const [diaSel, setDiaSel] = useState(
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  );
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('Evento');
  const [hora, setHora] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [qtdLembretes, setQtdLembretes] = useState<number | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function mostrarAviso(texto: string, ehErro = false) {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ texto, erro: ehErro });
    temporizador.current = setTimeout(() => setAviso(null), 7000);
  }

  // Grade do mês (semana começando na segunda)
  const primeiroDiaSemana = (mes.getDay() + 6) % 7;
  const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (Date | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  const chaveHoje = chaveData(new Date());
  const chaveSel = chaveData(diaSel);

  const doDia = eventos
    .filter(ev => ocorreEm(ev, diaSel))
    .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));

  const proximos = eventos
    .map(ev => ({ ev, data: proximaData(ev) }))
    .filter((x): x is { ev: Evento; data: Date } => x.data !== null && diasAte(x.data) <= 30)
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .slice(0, 6);

  async function adicionar() {
    const tituloLimpo = titulo.trim();
    const horaLimpa = tipo === 'Aniversário' ? '' : hora.trim();

    if (!tituloLimpo) {
      mostrarAviso('Digite um título para o evento.', true);
      return;
    }
    if (horaLimpa && !HORA_VALIDA.test(horaLimpa)) {
      mostrarAviso('Use o horário no formato HH:MM, por exemplo 14:30.', true);
      return;
    }

    try {
      const novo = {
        titulo: tituloLimpo,
        tipo,
        data: chaveData(diaSel),
        hora: horaLimpa || null,
      };
      await addDoc(collection(db, 'eventos'), novo);

      const dias = lembretesDe({ id: '', ...novo })
        .map(l => l.diasAntes)
        .filter((d, i, a) => a.indexOf(d) === i)
        .sort((a, b) => b - a);
      mostrarAviso(
        dias.length
          ? `Salvo! Lembretes às 9h, ${dias.join(', ')} dia(s) antes.`
          : 'Salvo! Não há lembretes antecipados, porque a data está muito próxima.'
      );
      setTitulo('');
      setHora('');
    } catch (e: any) {
      console.error('Erro ao salvar evento:', e);
      mostrarAviso(`Não foi possível salvar: ${e?.message ?? e}`, true);
    }
  }

  async function excluir(ev: Evento) {
    if (confirmandoId !== ev.id) {
      setConfirmandoId(ev.id);
      setTimeout(() => setConfirmandoId(atual => (atual === ev.id ? null : atual)), 4000);
      return;
    }
    setConfirmandoId(null);
    try {
      await deleteDoc(doc(db, 'eventos', ev.id));
      mostrarAviso(`"${ev.titulo}" excluído.`);
    } catch (e: any) {
      console.error('Erro ao excluir evento:', e);
      mostrarAviso(`Não foi possível excluir: ${e?.message ?? e}`, true);
    }
  }

  async function atualizarContagem() {
    setQtdLembretes(await contarLembretesAgendados());
  }

  const tituloMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const tituloDia = diaSel.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.titulo}>Calendário</Text>

      {aviso ? (
        <Text style={[s.banner, aviso.erro ? s.bannerErro : s.bannerOk]}>{aviso.texto}</Text>
      ) : null}
      {erro ? (
        <Text style={[s.banner, s.bannerErro]}>Não foi possível carregar os eventos: {erro}</Text>
      ) : null}

      <View style={s.painel}>
        <View style={s.cabecalhoMes}>
          <Pressable
            style={s.nav}
            onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          >
            <Text style={s.navTexto}>‹</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const h = new Date();
              setMes(new Date(h.getFullYear(), h.getMonth(), 1));
              setDiaSel(new Date(h.getFullYear(), h.getMonth(), h.getDate()));
            }}
          >
            <Text style={s.tituloMes}>{tituloMes}</Text>
          </Pressable>
          <Pressable
            style={s.nav}
            onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          >
            <Text style={s.navTexto}>›</Text>
          </Pressable>
        </View>

        <View style={s.semana}>
          {DIAS_SEMANA.map(d => (
            <Text key={d} style={s.diaSemana}>{d}</Text>
          ))}
        </View>

        <View style={s.grade}>
          {celulas.map((d, i) => {
            if (!d) return <View key={i} style={s.celula} />;
            const chave = chaveData(d);
            const tiposDoDia = Array.from(
              new Set(eventos.filter(ev => ocorreEm(ev, d)).map(ev => ev.tipo))
            );
            const selecionado = chave === chaveSel;
            return (
              <Pressable key={i} style={s.celula} onPress={() => setDiaSel(d)}>
                <View
                  style={[
                    s.numeroBox,
                    chave === chaveHoje && s.numeroHoje,
                    selecionado && s.numeroSel,
                  ]}
                >
                  <Text style={[s.numero, selecionado && s.numeroSelTexto]}>{d.getDate()}</Text>
                </View>
                <View style={s.pontos}>
                  {tiposDoDia.map(t => (
                    <View key={t} style={[s.ponto, { backgroundColor: corDoTipo(c, t).texto }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.painel}>
        <Text style={s.subtitulo}>{tituloDia}</Text>

        {doDia.length === 0 && <Text style={s.suave}>Nada marcado para este dia.</Text>}
        {doDia.map(ev => {
          const cor = corDoTipo(c, ev.tipo);
          const confirmando = confirmandoId === ev.id;
          return (
            <View key={ev.id} style={s.item}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.itemTitulo}>{ev.titulo}</Text>
                <View style={s.linhaPequena}>
                  <View style={[s.etiqueta, { backgroundColor: cor.fundo }]}>
                    <Text style={[s.etiquetaTexto, { color: cor.texto }]}>
                      {EMOJI[ev.tipo]} {ev.tipo}
                    </Text>
                  </View>
                  {ev.hora ? <Text style={s.suave}>{ev.hora}</Text> : null}
                </View>
              </View>
              <Pressable
                style={[s.excluir, confirmando && s.excluirConfirmar]}
                onPress={() => excluir(ev)}
              >
                <Text style={confirmando ? s.excluirTextoConfirmar : s.excluirTexto}>
                  {confirmando ? 'Confirmar?' : 'Excluir'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        <View style={s.divisor} />
        <Text style={s.rotulo}>Novo neste dia</Text>
        <TextInput
          style={s.input}
          placeholder="Ex: Aniversário da Ana"
          placeholderTextColor={c.placeholder}
          value={titulo}
          onChangeText={setTitulo}
        />
        <View style={s.linha}>
          {TIPOS.map(t => (
            <Pressable
              key={t}
              onPress={() => setTipo(t)}
              style={[s.chip, tipo === t && s.chipAtivo]}
            >
              <Text style={[s.chipTexto, tipo === t && s.chipTextoAtivo]}>
                {EMOJI[t]} {t}
              </Text>
            </Pressable>
          ))}
        </View>
        {tipo !== 'Aniversário' && (
          <TextInput
            style={s.input}
            placeholder="Horário (opcional), ex: 14:30"
            placeholderTextColor={c.placeholder}
            value={hora}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            onChangeText={setHora}
          />
        )}
        {tipo === 'Aniversário' && (
          <Text style={s.suave}>Aniversários se repetem todo ano nesta data.</Text>
        )}
        <Pressable style={s.botao} onPress={adicionar}>
          <Text style={s.botaoTexto}>Adicionar ao calendário</Text>
        </Pressable>
      </View>

      <View style={s.painel}>
        <Text style={s.subtitulo}>Próximos 30 dias</Text>
        {proximos.length === 0 && <Text style={s.suave}>Nenhum evento nos próximos dias.</Text>}
        {proximos.map(({ ev, data }) => {
          const cor = corDoTipo(c, ev.tipo);
          return (
            <View key={ev.id} style={s.item}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.itemTitulo}>{EMOJI[ev.tipo]} {ev.titulo}</Text>
                <Text style={s.suave}>
                  {data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  {ev.hora ? ` às ${ev.hora}` : ''}
                </Text>
              </View>
              <View style={[s.etiqueta, { backgroundColor: cor.fundo }]}>
                <Text style={[s.etiquetaTexto, { color: cor.texto }]}>
                  {textoDias(diasAte(data))}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {Platform.OS !== 'web' && (
        <Pressable onPress={atualizarContagem}>
          <Text style={s.linkTeste}>
            {qtdLembretes === null
              ? 'Ver lembretes agendados neste aparelho'
              : `Lembretes de eventos agendados neste aparelho: ${qtdLembretes} (toque para atualizar)`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 12 },
    titulo: { fontSize: 22, fontWeight: '700', color: c.texto },
    subtitulo: { fontSize: 16, fontWeight: '700', color: c.texto, textTransform: 'capitalize' },
    rotulo: { fontWeight: '600', color: c.textoSuave },
    suave: { color: c.textoSuave },
    banner: { padding: 10, borderRadius: 10, fontWeight: '600', overflow: 'hidden' },
    bannerOk: { backgroundColor: c.primariaSuave, color: c.primaria },
    bannerErro: { backgroundColor: c.perigoSuave, color: c.perigo },
    painel: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 16, gap: 12,
    },
    cabecalhoMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tituloMes: { fontSize: 16, fontWeight: '700', color: c.texto, textTransform: 'capitalize' },
    nav: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.primariaSuave,
    },
    navTexto: { color: c.primaria, fontSize: 20, fontWeight: '700' },
    semana: { flexDirection: 'row' },
    diaSemana: {
      width: '14.2857%', textAlign: 'center', color: c.textoSuave,
      fontSize: 12, fontWeight: '600',
    },
    grade: { flexDirection: 'row', flexWrap: 'wrap' },
    celula: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
    numeroBox: {
      width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'transparent',
    },
    numeroHoje: { borderColor: c.primaria },
    numeroSel: { backgroundColor: c.primaria, borderColor: c.primaria },
    numero: { color: c.texto, fontWeight: '600' },
    numeroSelTexto: { color: c.textoPrimaria },
    pontos: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
    ponto: { width: 5, height: 5, borderRadius: 3 },
    item: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: c.borda, borderRadius: 12, padding: 12,
    },
    itemTitulo: { fontWeight: '700', color: c.texto },
    linhaPequena: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    etiqueta: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    etiquetaTexto: { fontSize: 12, fontWeight: '700' },
    divisor: { height: 1, backgroundColor: c.borda },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    chip: {
      borderWidth: 1, borderColor: c.borda, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.input,
    },
    chipAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    chipTexto: { color: c.texto },
    chipTextoAtivo: { color: c.textoPrimaria, fontWeight: '600' },
    botao: { backgroundColor: c.destaque, padding: 13, borderRadius: 12, alignItems: 'center' },
    botaoTexto: { color: c.textoDestaque, fontWeight: '700' },
    excluir: {
      borderWidth: 1, borderColor: c.perigo,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    },
    excluirConfirmar: { backgroundColor: c.perigo },
    excluirTexto: { color: c.perigo, fontWeight: '600' },
    excluirTextoConfirmar: { color: '#FFFFFF', fontWeight: '700' },
    linkTeste: {
      color: c.textoSuave, textAlign: 'center',
      textDecorationLine: 'underline', marginTop: 8,
    },
  });
}