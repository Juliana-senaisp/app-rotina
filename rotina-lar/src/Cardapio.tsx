import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, query, where,
} from 'firebase/firestore';
import { db } from './firebase';

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
  const [inicio, setInicio] = useState(segundaDaSemana(new Date()));
  const [itens, setItens] = useState<Item[]>([]);
  const [pratos, setPratos] = useState<Prato[]>([]);
  const [diaSel, setDiaSel] = useState(0);
  const [refeicao, setRefeicao] = useState<Refeicao>('Almoço');
  const [prato, setPrato] = useState('');
  const [editando, setEditando] = useState(false);

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const hoje = chave(new Date());

  // Cardápio da semana exibida
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

  // Lista de pratos salvos
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
          <Text>‹ Anterior</Text>
        </Pressable>
        <Pressable
          style={s.nav}
          onPress={() => { setInicio(segundaDaSemana(new Date())); setDiaSel(0); }}
        >
          <Text>Hoje</Text>
        </Pressable>
        <Pressable style={s.nav} onPress={() => setInicio(somarDias(inicio, 7))}>
          <Text>Próxima ›</Text>
        </Pressable>
      </View>

      <Text style={s.rotulo}>Dia</Text>
      <View style={s.linha}>
        {dias.map((d, i) => (
          <Pressable
            key={i}
            onPress={() => setDiaSel(i)}
            style={[s.chip, diaSel === i && s.chipAtivo]}
          >
            <Text style={diaSel === i && s.chipTextoAtivo}>{nomeDia(d)}</Text>
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
            <Text style={refeicao === r && s.chipTextoAtivo}>{r}</Text>
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
          <Text style={s.vazio}>
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
        value={prato}
        onChangeText={setPrato}
      />
      <Pressable style={s.botao} onPress={adicionarDigitado}>
        <Text style={s.botaoTexto}>Adicionar ao cardápio</Text>
      </Pressable>
      <Pressable style={s.botaoSecundario} onPress={soSalvar}>
        <Text style={s.botaoSecundarioTexto}>Só salvar na lista</Text>
      </Pressable>

      {dias.map((d, i) => {
        const doDia = itens
          .filter(it => it.data === chave(d))
          .sort((a, b) => REFEICOES.indexOf(a.refeicao) - REFEICOES.indexOf(b.refeicao));
        return (
          <View key={i} style={[s.card, chave(d) === hoje && s.cardHoje]}>
            <Text style={s.cardTitulo}>{nomeDia(d)}</Text>
            {doDia.length === 0 && <Text style={s.vazio}>Sem refeições cadastradas</Text>}
            {doDia.map(it => (
              <View key={it.id} style={s.item}>
                <Text style={{ flex: 1 }}>
                  <Text style={s.negrito}>{it.refeicao}: </Text>
                  {it.prato}
                </Text>
                <Pressable onPress={() => excluirItem(it.id)}>
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

const s = StyleSheet.create({
  container: { padding: 20, paddingTop: 16, gap: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  rotulo: { fontWeight: '600' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cabecalhoLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: '#2e7d32', fontWeight: '600' },
  nav: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipAtivo: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  chipTextoAtivo: { color: '#fff' },
  chipPrato: { borderWidth: 1, borderColor: '#2e7d32', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e8f5e9' },
  chipPratoTexto: { color: '#2e7d32', fontWeight: '600' },
  chipPratoEditando: { borderColor: '#c62828', backgroundColor: '#ffebee' },
  chipPratoTextoEditando: { color: '#c62828', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  botao: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: '600' },
  botaoSecundario: { borderWidth: 1, borderColor: '#2e7d32', padding: 10, borderRadius: 8, alignItems: 'center' },
  botaoSecundarioTexto: { color: '#2e7d32', fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, gap: 6 },
  cardHoje: { borderColor: '#2e7d32', borderWidth: 2 },
  cardTitulo: { fontWeight: 'bold', fontSize: 16, textTransform: 'capitalize' },
  vazio: { color: '#888' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  negrito: { fontWeight: '600' },
  x: { color: '#c62828', fontSize: 16, paddingHorizontal: 6 },
});