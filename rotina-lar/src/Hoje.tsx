import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useTema, type Tema } from './tema';
import { chaveData, ocorreEm, EMOJI, type Evento, type TipoEvento } from './eventos';
import {
  foiFeitaHoje, venceAteHoje, marcarTarefaFeita, situacao, rotuloUnidade, type Tarefa,
} from './tarefasLogica';

type Destino = 'tarefas' | 'cardapio' | 'calendario';
type ItemCardapio = { id: string; data: string; refeicao: string; prato: string };

const REFEICOES = ['Café', 'Almoço', 'Lanche', 'Jantar'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function corDoTipo(c: Tema, tipo: TipoEvento) {
  if (tipo === 'Aniversário') return { fundo: c.primariaSuave, texto: c.primaria };
  if (tipo === 'Compromisso') return { fundo: c.lavandaSuave, texto: c.lavanda };
  return { fundo: c.pessegoSuave, texto: c.pessego };
}

type Props = {
  tarefas: Tarefa[];
  eventos: Evento[];
  onIrPara: (destino: Destino) => void;
};

export default function Hoje({ tarefas, eventos, onIrPara }: Props) {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const hoje = new Date();
  const chaveHoje = chaveData(hoje);

  const [cardapio, setCardapio] = useState<ItemCardapio[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'cardapio'), where('data', '==', chaveHoje));
    return onSnapshot(
      q,
      snap => {
        setCardapio(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ItemCardapio, 'id'>) }))
        );
      },
      e => console.error('Erro ao ler cardápio de hoje:', e)
    );
  }, [chaveHoje]);

  // Tarefas que vencem até hoje (ou já foram feitas hoje): pendentes primeiro.
  const agenda = tarefas
    .filter(t => foiFeitaHoje(t) || venceAteHoje(t))
    .sort(
      (a, b) =>
        Number(foiFeitaHoje(a)) - Number(foiFeitaHoje(b)) || a.proxima - b.proxima
    );
  const feitas = agenda.filter(foiFeitaHoje).length;
  const total = agenda.length;
  const pct = total === 0 ? 0 : Math.round((feitas / total) * 100);
  const frase =
    total === 0
      ? 'Nenhuma tarefa para hoje.'
      : pct === 100
      ? 'Tudo feito por hoje!'
      : pct > 0
      ? 'Você já começou muito bem!'
      : 'Vamos começar?';

  const eventosHoje = eventos
    .filter(ev => ocorreEm(ev, hoje))
    .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));

  // Faixa da semana (segunda a domingo)
  const segunda = new Date(hoje);
  segunda.setHours(0, 0, 0, 0);
  segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    return d;
  });
  const temAlgo = (d: Date) =>
    eventos.some(ev => ocorreEm(ev, d)) ||
    tarefas.some(t => chaveData(new Date(t.proxima)) === chaveData(d));

  async function concluir(t: Tarefa) {
    if (ocupadoId || foiFeitaHoje(t)) return;
    setOcupadoId(t.id);
    try {
      await marcarTarefaFeita(t);
      setAviso(null);
    } catch (e: any) {
      console.error('Erro ao marcar como feita:', e);
      setAviso(`Não foi possível marcar como feita: ${e?.message ?? e}`);
    } finally {
      setOcupadoId(null);
    }
  }

  const dataExtenso = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const dataBonita = dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1);

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.cabecalho}>
        <View style={s.logo}>
          <Ionicons name="home" size={20} color={c.primaria} />
        </View>
        <View>
          <Text style={s.app}>Rotina do Lar</Text>
          <Text style={s.suave}>{dataBonita}</Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={s.eyebrow}>SEU ESPAÇO, SEU RITMO</Text>
        <Text style={s.manchete}>Vamos organizar{'\n'}seu dia?</Text>
        <Text style={s.suave}>Pequenos passos deixam tudo mais leve. ♡</Text>
      </View>

      {aviso ? <Text style={s.bannerErro}>{aviso}</Text> : null}

      <View style={s.progresso}>
        <View style={s.linhaEntre}>
          <Text style={s.progressoTitulo}>Seu progresso de hoje</Text>
          <Text style={s.progressoContagem}>{feitas} de {total}</Text>
        </View>
        <Text style={s.suave}>{frase}</Text>
        <View style={s.barra}>
          <View style={[s.barraPreenchida, { width: `${pct}%` }]} />
        </View>
        <View style={s.linhaEntre}>
          <Text style={s.pequeno}>{pct === 100 ? 'Parabéns!' : 'Continue assim'}</Text>
          <Text style={s.pequeno}>{pct}%</Text>
        </View>
      </View>

      <View style={s.linhaEntre}>
        <Text style={s.secao}>Esta semana</Text>
        <Pressable onPress={() => onIrPara('calendario')}>
          <Text style={s.link}>Ver calendário ↗</Text>
        </Pressable>
      </View>
      <View style={s.semana}>
        {semana.map((d, i) => {
          const ehHoje = chaveData(d) === chaveHoje;
          return (
            <View key={i} style={[s.diaCelula, ehHoje && s.diaHoje]}>
              <Text style={s.diaSemana}>{DIAS_SEMANA[i]}</Text>
              <Text style={[s.diaNumero, ehHoje && s.diaNumeroHoje]}>{d.getDate()}</Text>
              <View style={[s.diaPonto, temAlgo(d) && s.diaPontoAtivo]} />
            </View>
          );
        })}
      </View>

      <View style={s.linhaEntre}>
        <Text style={s.secao}>Tarefas de hoje</Text>
        <Pressable onPress={() => onIrPara('tarefas')}>
          <Text style={s.link}>+ Nova tarefa</Text>
        </Pressable>
      </View>
      {agenda.length === 0 && <Text style={s.suave}>Nenhuma tarefa para hoje. 🎉</Text>}
      {agenda.map(t => {
        const feita = foiFeitaHoje(t);
        const sit = situacao(t.proxima);
        return (
          <View key={t.id} style={s.item}>
            <Pressable
              onPress={() => concluir(t)}
              hitSlop={8}
              style={[s.caixa, feita && s.caixaFeita, ocupadoId === t.id && { opacity: 0.5 }]}
            >
              {feita && <Ionicons name="checkmark" size={16} color={c.textoPrimaria} />}
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.itemTitulo, feita && s.riscado]}>{t.nome}</Text>
              <View style={s.linhaPequena}>
                <View style={[s.etiqueta, { backgroundColor: c.lavandaSuave }]}>
                  <Text style={[s.etiquetaTexto, { color: c.lavanda }]}>
                    A cada {t.intervalo} {rotuloUnidade(t.intervalo, t.unidade)}
                  </Text>
                </View>
                {!feita && sit.tipo === 'perigo' && (
                  <Text style={s.atrasada}>{sit.texto}</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}

      <View style={s.linhaEntre}>
        <Text style={s.secao}>Compromissos de hoje</Text>
        <Pressable onPress={() => onIrPara('calendario')}>
          <Text style={s.link}>Calendário</Text>
        </Pressable>
      </View>
      {eventosHoje.length === 0 && <Text style={s.suave}>Nada marcado para hoje.</Text>}
      {eventosHoje.map(ev => {
        const cor = corDoTipo(c, ev.tipo);
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
          </View>
        );
      })}

      <View style={s.linhaEntre}>
        <Text style={s.secao}>Cardápio de hoje</Text>
        <Pressable onPress={() => onIrPara('cardapio')}>
          <Text style={s.link}>Editar</Text>
        </Pressable>
      </View>
      <View style={s.cartao}>
        {REFEICOES.map(r => {
          const pratos = cardapio.filter(it => it.refeicao === r).map(it => it.prato);
          return (
            <View key={r} style={s.linhaRefeicao}>
              <Text style={s.refeicao}>{r}</Text>
              <Text style={pratos.length ? s.prato : s.suave}>
                {pratos.length ? pratos.join(', ') : 'Não definido'}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable style={s.botao} onPress={() => onIrPara('tarefas')}>
        <Text style={s.botaoTexto}>+  Adicionar tarefa</Text>
      </Pressable>
    </ScrollView>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 14 },
    cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: {
      width: 42, height: 42, borderRadius: 14, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primariaSuave,
      borderWidth: 1, borderColor: c.borda,
    },
    app: { fontSize: 16, fontWeight: '700', color: c.texto },
    suave: { color: c.textoSuave },
    pequeno: { color: c.textoSuave, fontSize: 12 },
    eyebrow: { color: c.primaria, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
    manchete: { fontSize: 28, fontWeight: '800', color: c.texto, lineHeight: 34 },
    bannerErro: {
      backgroundColor: c.perigoSuave, color: c.perigo, fontWeight: '600',
      padding: 10, borderRadius: 10, overflow: 'hidden',
    },
    linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progresso: {
      backgroundColor: c.primariaSuave, borderWidth: 1, borderColor: c.borda,
      borderRadius: 18, padding: 16, gap: 8,
    },
    progressoTitulo: { fontWeight: '700', color: c.texto, fontSize: 15 },
    progressoContagem: { fontWeight: '800', color: c.texto },
    barra: { height: 8, borderRadius: 4, backgroundColor: c.borda, overflow: 'hidden' },
    barraPreenchida: { height: 8, borderRadius: 4, backgroundColor: c.primaria },
    secao: { fontSize: 17, fontWeight: '700', color: c.texto, marginTop: 6 },
    link: { color: c.primaria, fontWeight: '700', fontSize: 13 },
    semana: { flexDirection: 'row', gap: 6 },
    diaCelula: {
      flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4,
      borderRadius: 14, borderWidth: 1, borderColor: 'transparent',
    },
    diaHoje: { backgroundColor: c.primariaSuave, borderColor: c.primaria },
    diaSemana: { fontSize: 11, color: c.textoSuave },
    diaNumero: { fontSize: 16, fontWeight: '700', color: c.texto },
    diaNumeroHoje: { color: c.primaria },
    diaPonto: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
    diaPontoAtivo: { backgroundColor: c.primaria },
    item: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 14,
    },
    caixa: {
      width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: c.borda,
      alignItems: 'center', justifyContent: 'center',
    },
    caixaFeita: { backgroundColor: c.sucesso, borderColor: c.sucesso },
    itemTitulo: { fontWeight: '700', color: c.texto, fontSize: 15 },
    riscado: { textDecorationLine: 'line-through', color: c.textoSuave },
    linhaPequena: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    etiqueta: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    etiquetaTexto: { fontSize: 12, fontWeight: '700' },
    atrasada: { color: c.perigo, fontSize: 12, fontWeight: '700' },
    cartao: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 14, gap: 10,
    },
    linhaRefeicao: { flexDirection: 'row', gap: 12 },
    refeicao: { width: 68, fontWeight: '700', color: c.texto },
    prato: { flex: 1, color: c.texto },
    botao: { backgroundColor: c.destaque, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 6 },
    botaoTexto: { color: c.textoDestaque, fontWeight: '800' },
  });
}