import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { contarLembretesAgendados } from './notificacoes';
import { IconeTipo, ICONE_REPETIR } from './IconeTipo';
import {
  TIPOS, OPCOES_AVISO, chaveData, ocorreEm, proximaData, lembretesDe,
  repeticaoDe, textoRepeticao, avisosPadrao, descreverAvisos,
  type Evento, type TipoEvento, type Repeticao, type UnidadeRep,
} from './eventos';
import { useTema, type Tema } from './tema';

type RepChip = 'nenhuma' | 'semanal' | 'mensal' | 'anual' | 'personalizado';

const REP_CHIPS: { id: RepChip; rotulo: string }[] = [
  { id: 'nenhuma', rotulo: 'Não repete' },
  { id: 'semanal', rotulo: 'Toda semana' },
  { id: 'mensal', rotulo: 'Todo mês' },
  { id: 'anual', rotulo: 'Todo ano' },
  { id: 'personalizado', rotulo: 'Personalizado' },
];
const UNIDADES_REP: UnidadeRep[] = ['dias', 'semanas', 'meses', 'anos'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

function repeticaoDoChip(chip: RepChip, cada: number, unidade: UnidadeRep): Repeticao | null {
  if (chip === 'semanal') return { cada: 1, unidade: 'semanas' };
  if (chip === 'mensal') return { cada: 1, unidade: 'meses' };
  if (chip === 'anual') return { cada: 1, unidade: 'anos' };
  if (chip === 'personalizado') return { cada: cada > 0 ? cada : 1, unidade };
  return null;
}

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
  const [repChip, setRepChip] = useState<RepChip>('nenhuma');
  const [cadaTxt, setCadaTxt] = useState('2');
  const [unidadeRep, setUnidadeRep] = useState<UnidadeRep>('semanas');
  const [avisos, setAvisos] = useState<number[]>([7, 3, 2, 1, 0]);
  const [avisosManual, setAvisosManual] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [qtdLembretes, setQtdLembretes] = useState<number | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  // Enquanto você não mexer nos botões de aviso, eles seguem o padrão da repetição.
  useEffect(() => {
    if (avisosManual) return;
    const cada = parseInt(cadaTxt, 10) || 1;
    setAvisos(avisosPadrao(repeticaoDoChip(repChip, cada, unidadeRep)));
  }, [repChip, cadaTxt, unidadeRep, avisosManual]);

  function mostrarAviso(texto: string, ehErro = false) {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ texto, erro: ehErro });
    temporizador.current = setTimeout(() => setAviso(null), 7000);
  }

  function escolherTipo(t: TipoEvento) {
    if (t === 'Aniversário') setRepChip('anual');
    else if (tipo === 'Aniversário') setRepChip('nenhuma');
    setTipo(t);
  }

  function alternarAviso(dias: number) {
    setAvisosManual(true);
    setAvisos(atual => (atual.includes(dias) ? atual.filter(d => d !== dias) : [...atual, dias]));
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
    const cada = parseInt(cadaTxt, 10);

    if (!tituloLimpo) {
      mostrarAviso('Digite um título para o evento.', true);
      return;
    }
    if (horaLimpa && !HORA_VALIDA.test(horaLimpa)) {
      mostrarAviso('Use o horário no formato HH:MM, por exemplo 14:30.', true);
      return;
    }
    if (repChip === 'personalizado' && (!cada || cada < 1)) {
      mostrarAviso('Informe um intervalo de repetição de 1 ou mais.', true);
      return;
    }

    try {
      const novo = {
        titulo: tituloLimpo,
        tipo,
        data: chaveData(diaSel),
        hora: horaLimpa || null,
        repeticao: repeticaoDoChip(repChip, cada, unidadeRep),
        avisos: [...avisos].sort((a, b) => b - a),
      };
      await addDoc(collection(db, 'eventos'), novo);

      // Mostra os lembretes que valem para a próxima ocorrência.
      const futuros = lembretesDe({ id: '', ...novo });
      const primeira = futuros[0]?.ocorrencia.getTime();
      const dias = futuros
        .filter(l => l.ocorrencia.getTime() === primeira)
        .map(l => l.diasAntes);
      mostrarAviso(
        dias.length
          ? `Salvo! Lembretes: ${descreverAvisos(dias)}.`
          : 'Salvo! Sem lembretes (nenhum aviso marcado ou data muito próxima).'
      );

      setTitulo('');
      setHora('');
      setRepChip(tipo === 'Aniversário' ? 'anual' : 'nenhuma');
      setAvisosManual(false);
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
            <Ionicons name="chevron-back" size={18} color={c.primaria} />
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
            <Ionicons name="chevron-forward" size={18} color={c.primaria} />
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
          const rep = repeticaoDe(ev);
          return (
            <View key={ev.id} style={s.item}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.itemTitulo}>{ev.titulo}</Text>
                <View style={s.linhaPequena}>
                  <View style={[s.etiqueta, { backgroundColor: cor.fundo }]}>
                    <IconeTipo tipo={ev.tipo} cor={cor.texto} />
                    <Text style={[s.etiquetaTexto, { color: cor.texto }]}>{ev.tipo}</Text>
                  </View>
                  {ev.hora ? <Text style={s.suave}>{ev.hora}</Text> : null}
                </View>
                {rep ? (
                  <View style={s.linhaPequena}>
                    <Ionicons name={ICONE_REPETIR} size={14} color={c.textoSuave} />
                    <Text style={s.suave}>{textoRepeticao(rep)}</Text>
                  </View>
                ) : null}
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
          placeholder="Título do evento"
          placeholderTextColor={c.placeholder}
          value={titulo}
          onChangeText={setTitulo}
        />
        <View style={s.linha}>
          {TIPOS.map(t => {
            const ativo = tipo === t;
            return (
              <Pressable
                key={t}
                onPress={() => escolherTipo(t)}
                style={[s.chip, ativo && s.chipAtivo]}
              >
                <IconeTipo tipo={t} cor={ativo ? c.textoPrimaria : c.textoSuave} tamanho={16} />
                <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
        {tipo !== 'Aniversário' && (
          <TextInput
            style={s.input}
            placeholder="Horário (opcional), HH:MM"
            placeholderTextColor={c.placeholder}
            value={hora}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            onChangeText={setHora}
          />
        )}

        <Text style={s.rotulo}>Repetir</Text>
        <View style={s.linha}>
          {REP_CHIPS.map(r => {
            const ativo = repChip === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setRepChip(r.id)}
                style={[s.chip, ativo && s.chipAtivo]}
              >
                {r.id !== 'nenhuma' && (
                  <Ionicons
                    name={ICONE_REPETIR}
                    size={14}
                    color={ativo ? c.textoPrimaria : c.textoSuave}
                  />
                )}
                <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{r.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>
        {repChip === 'personalizado' && (
          <View style={s.linha}>
            <Text style={s.texto}>A cada</Text>
            <TextInput
              style={[s.input, s.inputNumero]}
              keyboardType="numeric"
              maxLength={3}
              value={cadaTxt}
              onChangeText={setCadaTxt}
            />
            {UNIDADES_REP.map(u => (
              <Pressable
                key={u}
                onPress={() => setUnidadeRep(u)}
                style={[s.chip, unidadeRep === u && s.chipAtivo]}
              >
                <Text style={[s.chipTexto, unidadeRep === u && s.chipTextoAtivo]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={s.rotulo}>Avisar</Text>
        <View style={s.linha}>
          {OPCOES_AVISO.map(o => {
            const ligado = avisos.includes(o.dias);
            return (
              <Pressable
                key={o.dias}
                onPress={() => alternarAviso(o.dias)}
                style={[s.chip, ligado && s.chipAtivo]}
              >
                {ligado && <Ionicons name="checkmark" size={14} color={c.textoPrimaria} />}
                <Text style={[s.chipTexto, ligado && s.chipTextoAtivo]}>{o.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.pequeno}>
          Avisos de antecedência às 9h e, no dia do evento, às 8h.
        </Text>

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
                <View style={s.linhaPequena}>
                  <IconeTipo tipo={ev.tipo} cor={cor.texto} tamanho={16} />
                  <Text style={s.itemTitulo}>{ev.titulo}</Text>
                </View>
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
    texto: { color: c.texto },
    suave: { color: c.textoSuave },
    pequeno: { color: c.textoSuave, fontSize: 12 },
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
    etiqueta: {
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
    },
    etiquetaTexto: { fontSize: 12, fontWeight: '700' },
    divisor: { height: 1, backgroundColor: c.borda },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    inputNumero: { width: 60, textAlign: 'center' },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
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