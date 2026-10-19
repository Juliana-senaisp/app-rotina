import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, query, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { useTema, type Tema } from './tema';

type Refeicao = 'Café' | 'Almoço' | 'Lanche' | 'Jantar';
const REFEICOES: Refeicao[] = ['Café', 'Almoço', 'Lanche', 'Jantar'];

type Item = { id: string; data: string; refeicao: Refeicao; prato: string };
type Prato = { id: string; nome: string; refeicao: Refeicao };

function chave(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function segundaDaSemana(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

function somarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function Cardapio() {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const [inicio, setInicio] = useState(segundaDaSemana(new Date()));
  const [itens, setItens] = useState<Item[]>([]);
  const [pratos, setPratos] = useState<Prato[]>([]);
  const [diaSel, setDiaSel] = useState(0);
  const [refeicao, setRefeicao] = useState<Refeicao>('Almoço');
  const [prato, setPrato] = useState('');
  const [editando, setEditando] = useState(false);

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const hoje = chave(new Date());

  useEffect(() => {
    const q = query(
      collection(db, 'cardapio'),
      where('data', '>=', chave(dias[0])),
      where('data', '<=', chave(dias[6]))
    );
    const cancelar = onSnapshot(
      q,
      snap => {
        setItens(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) }))
        );
      },
      erro => console.error('Erro ao ler cardápio:', erro)
    );
    return cancelar;
  }, [inicio]);

  useEffect(() => {
    const cancelar = onSnapshot(
      collection(db, 'pratos'),
      snap => {
        setPratos(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Prato, 'id'>) }))
        );
      },
      erro => console.error('Erro ao ler pratos:', erro)
    );
    return cancelar;
  }, []);

  const pratosDaRefeicao = pratos
    .filter(p => p.refeicao === refeicao)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  async function salvarNaLista(nome: string) {
    const jaExiste = pratos.some(
      p => p.refeicao === refeicao && p.nome.toLowerCase() === nome.toLowerCase()
    );
    if (!jaExiste) {
      await addDoc(collection(db, 'pratos'), { nome, refeicao });
    }
  }

  async function adicionarAoCardapio(nome: string) {
    await addDoc(collection(db, 'cardapio'), {
      data: chave(dias[diaSel]),
      refeicao,
      prato: nome,
    });
    await salvarNaLista(nome);
  }

  async function adicionarDigitado() {
    if (!prato.trim()) return;
    await adicionarAoCardapio(prato.trim());
    setPrato('');
  }

  async function soSalvar() {
    if (!prato.trim()) return;
    await salvarNaLista(prato.trim());
    setPrato('');
  }

  async function excluirItem(id: string) {
    await deleteDoc(doc(db, 'cardapio', id));
  }

  async function excluirPrato(id: string) {
    await deleteDoc(doc(db, 'pratos', id));
  }

  const nomeDia = (d: Date) =>
    d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.titulo}>Cardápio da semana</Text>

      <View style={s.linha}>
        <Pressable style={s.nav} onPress={() => setInicio(somarDias(inicio, -7))}>
          <Text style={s.texto}>‹ Anterior</Text>
        </Pressable>
        <Pressable
          style={s.nav}
          onPress={() => { setInicio(segundaDaSemana(new Date())); setDiaSel(0); }}
        >
          <Text style={s.texto}>Hoje</Text>
        </Pressable>
        <Pressable style={s.nav} onPress={() => setInicio(somarDias(inicio, 7))}>
          <Text style={s.texto}>Próxima ›</Text>
        </Pressable>
      </View>

      <View style={s.painel}>
        <Text style={s.rotulo}>Dia</Text>
        <View style={s.linha}>
          {dias.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => setDiaSel(i)}
              style={[s.chip, diaSel === i && s.chipAtivo]}
            >
              <Text style={[s.chipTexto, diaSel === i && s.chipTextoAtivo]}>{nomeDia(d)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.rotulo}>Refeição</Text>
        <View style={s.linha}>
          {REFEICOES.map(r => (
            <Pressable
              key={r}
              onPress={() => setRefeicao(r)}
              style={[s.chip, refeicao === r && s.chipAtivo]}
            >
              <Text style={[s.chipTexto, refeicao === r && s.chipTextoAtivo]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.cabecalhoLista}>
          <Text style={s.rotulo}>Pratos salvos ({refeicao})</Text>
          <Pressable onPress={() => setEditando(!editando)}>
            <Text style={s.link}>{editando ? 'Concluir' : 'Editar lista'}</Text>
          </Pressable>
        </View>
        <View style={s.linha}>
          {pratosDaRefeicao.length === 0 && (
            <Text style={s.suave}>
              Nenhum prato salvo para esta refeição. Escreva abaixo e ele será salvo automaticamente.
            </Text>
          )}
          {pratosDaRefeicao.map(p => (
            <Pressable
              key={p.id}
              onPress={() => (editando ? excluirPrato(p.id) : adicionarAoCardapio(p.nome))}
              style={[s.chipPrato, editando && s.chipPratoEditando]}
            >
              <Text style={editando ? s.chipPratoTextoEditando : s.chipPratoTexto}>
                {editando ? '✕ ' : '+ '}{p.nome}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={s.input}
          placeholder="Novo prato (ex: Arroz, feijão e frango grelhado)"
          placeholderTextColor={c.placeholder}
          value={prato}
          onChangeText={setPrato}
        />
        <Pressable style={s.botao} onPress={adicionarDigitado}>
          <Text style={s.botaoTexto}>Adicionar ao cardápio</Text>
        </Pressable>
        <Pressable style={s.botaoSecundario} onPress={soSalvar}>
          <Text style={s.botaoSecundarioTexto}>Só salvar na lista</Text>
        </Pressable>
      </View>

      {dias.map((d, i) => {
        const doDia = itens
          .filter(it => it.data === chave(d))
          .sort((a, b) => REFEICOES.indexOf(a.refeicao) - REFEICOES.indexOf(b.refeicao));
        return (
          <View key={i} style={[s.card, chave(d) === hoje && s.cardHoje]}>
            <Text style={s.cardTitulo}>{nomeDia(d)}</Text>
            {doDia.length === 0 && <Text style={s.suave}>Sem refeições cadastradas</Text>}
            {doDia.map(it => (
              <View key={it.id} style={s.item}>
                <Text style={s.itemTexto}>
                  <Text style={s.negrito}>{it.refeicao}: </Text>
                  {it.prato}
                </Text>
                <Pressable onPress={() => excluirItem(it.id)} hitSlop={8}>
                  <Text style={s.x}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 12 },
    titulo: { fontSize: 22, fontWeight: '700', color: c.texto },
    texto: { color: c.texto },
    suave: { color: c.textoSuave },
    rotulo: { fontWeight: '600', color: c.textoSuave },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    painel: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 16, gap: 12,
    },
    cabecalhoLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    link: { color: c.primaria, fontWeight: '700' },
    nav: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.cartao,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    },
    chip: {
      borderWidth: 1, borderColor: c.borda, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.input,
    },
    chipAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    chipTexto: { color: c.texto },
    chipTextoAtivo: { color: c.textoPrimaria, fontWeight: '600' },
    chipPrato: {
      borderWidth: 1, borderColor: c.primaria, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.primariaSuave,
    },
    chipPratoTexto: { color: c.primaria, fontWeight: '600' },
    chipPratoEditando: { borderColor: c.perigo, backgroundColor: c.perigoSuave },
    chipPratoTextoEditando: { color: c.perigo, fontWeight: '600' },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    botao: { backgroundColor: c.primaria, padding: 13, borderRadius: 10, alignItems: 'center' },
    botaoTexto: { color: c.textoPrimaria, fontWeight: '700' },
    botaoSecundario: { borderWidth: 1, borderColor: c.primaria, padding: 11, borderRadius: 10, alignItems: 'center' },
    botaoSecundarioTexto: { color: c.primaria, fontWeight: '600' },
    card: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 14, gap: 6,
    },
    cardHoje: { borderColor: c.primaria, borderWidth: 2 },
    cardTitulo: { fontWeight: '700', fontSize: 16, color: c.texto, textTransform: 'capitalize' },
    item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemTexto: { flex: 1, color: c.texto },
    negrito: { fontWeight: '700' },
    x: { color: c.perigo, fontSize: 16, paddingHorizontal: 6 },
  });
}