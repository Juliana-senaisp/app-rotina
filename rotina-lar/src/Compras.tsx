import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { useTema, type Tema } from './tema';

type Categoria = { nome: string; subs: string[] };
type ItemCompra = {
  id: string;
  nome: string;
  quantidade: string | null;
  categoria: string;
  subcategoria: string | null;
  comprado: boolean;
};

const ARVORE_PADRAO: Categoria[] = [
  {
    nome: 'Mercado',
    subs: [
      'Hortifruti', 'Mercearia', 'Carnes', 'Laticínios', 'Padaria',
      'Bebidas', 'Limpeza', 'Higiene', 'Outros',
    ],
  },
  { nome: 'Farmácia', subs: [] },
  { nome: 'Papelaria', subs: [] },
  { nome: 'Outros', subs: [] },
];

// Categorias do modelo antigo (sem subcategoria): passam a ser subcategorias de Mercado.
const CATEGORIAS_ANTIGAS = [
  'Hortifruti', 'Mercearia', 'Carnes', 'Laticínios', 'Padaria',
  'Bebidas', 'Limpeza', 'Higiene', 'Outros',
];

function normalizar(id: string, d: any): ItemCompra {
  let categoria: string = d.categoria ?? 'Outros';
  let subcategoria: string | null = d.subcategoria ?? null;
  if (d.subcategoria === undefined && CATEGORIAS_ANTIGAS.includes(categoria)) {
    subcategoria = categoria;
    categoria = 'Mercado';
  }
  return {
    id,
    nome: d.nome ?? '',
    quantidade: d.quantidade ?? null,
    categoria,
    subcategoria,
    comprado: !!d.comprado,
  };
}

function formatarNome(texto: string) {
  const t = texto.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const porNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
const porItem = (a: ItemCompra, b: ItemCompra) =>
  Number(a.comprado) - Number(b.comprado) || porNome(a.nome, b.nome);

export default function Compras({ onVoltar }: { onVoltar: () => void }) {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);

  const [arvore, setArvore] = useState<Categoria[]>(ARVORE_PADRAO);
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [catSel, setCatSel] = useState('Mercado');
  const [subSel, setSubSel] = useState<string | null>(null);
  const [criandoCat, setCriandoCat] = useState(false);
  const [novaCat, setNovaCat] = useState('');
  const [criandoSub, setCriandoSub] = useState(false);
  const [novaSub, setNovaSub] = useState('');
  const [editando, setEditando] = useState(false);
  const [filtro, setFiltro] = useState('Todas');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mostrar(texto: string, erro = false) {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ texto, erro });
    temporizador.current = setTimeout(() => setAviso(null), 6000);
  }

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  // Categorias e subcategorias (guardadas em um único documento)
  useEffect(() => {
    const ref = doc(db, 'config', 'listaCompras');
    return onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const dados = snap.data() as { categorias?: Categoria[] };
          if (dados.categorias) setArvore(dados.categorias);
        } else if (!snap.metadata.fromCache) {
          // Primeira vez: grava o modelo inicial.
          setDoc(ref, { categorias: ARVORE_PADRAO }).catch(e =>
            console.error('Erro ao criar categorias:', e)
          );
        }
      },
      e => console.error('Erro ao ler categorias:', e)
    );
  }, []);

  // Itens da lista
  useEffect(() => {
    return onSnapshot(
      collection(db, 'compras'),
      snap => setItens(snap.docs.map(d => normalizar(d.id, d.data()))),
      e => {
        console.error('Erro ao ler a lista de compras:', e);
        mostrar(`Não foi possível carregar a lista: ${e.message}`, true);
      }
    );
  }, []);

  async function salvarArvore(nova: Categoria[]) {
    setArvore(nova);
    try {
      await setDoc(doc(db, 'config', 'listaCompras'), { categorias: nova });
    } catch (e: any) {
      console.error('Erro ao salvar categorias:', e);
      mostrar(`Não foi possível salvar as categorias: ${e?.message ?? e}`, true);
    }
  }

  // Categoria e subcategoria realmente válidas no formulário
  const catAtual = arvore.some(x => x.nome === catSel) ? catSel : arvore[0]?.nome ?? 'Outros';
  const subsDaCat = arvore.find(x => x.nome === catAtual)?.subs ?? [];
  const subAtual = subSel && subsDaCat.includes(subSel) ? subSel : null;

  // Categorias da árvore + categorias antigas que ainda têm itens
  const nomesCategorias = useMemo(() => {
    const daArvore = arvore.map(x => x.nome);
    const extras = Array.from(new Set(itens.map(i => i.categoria)))
      .filter(n => !daArvore.includes(n))
      .sort(porNome);
    return [...daArvore, ...extras];
  }, [arvore, itens]);

  const categoriasComItens = nomesCategorias.filter(n => itens.some(i => i.categoria === n));
  const filtroAtivo = categoriasComItens.includes(filtro) ? filtro : 'Todas';
  const visiveis = itens.filter(i => filtroAtivo === 'Todas' || i.categoria === filtroAtivo);

  const grupos = nomesCategorias
    .map(nomeCat => {
      const doGrupo = visiveis.filter(i => i.categoria === nomeCat);
      const subsArvore = arvore.find(x => x.nome === nomeCat)?.subs ?? [];
      const extras = Array.from(
        new Set(doGrupo.map(i => i.subcategoria).filter((x): x is string => !!x))
      )
        .filter(x => !subsArvore.includes(x))
        .sort(porNome);
      const blocos = [null, ...subsArvore, ...extras]
        .map(sub => ({
          sub,
          itens: doGrupo.filter(i => i.subcategoria === sub).sort(porItem),
        }))
        .filter(b => b.itens.length > 0);
      return { nome: nomeCat, itens: doGrupo, blocos };
    })
    .filter(g => g.itens.length > 0);

  const total = visiveis.length;
  const comprados = visiveis.filter(i => i.comprado).length;
  const pct = total === 0 ? 0 : Math.round((comprados / total) * 100);

  async function adicionar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      mostrar('Digite o nome do item.', true);
      return;
    }
    try {
      await addDoc(collection(db, 'compras'), {
        nome: nomeLimpo,
        quantidade: quantidade.trim() || null,
        categoria: catAtual,
        subcategoria: subAtual,
        comprado: false,
        criadoEm: Date.now(),
      });
      setNome('');
      setQuantidade('');
    } catch (e: any) {
      console.error('Erro ao adicionar item:', e);
      mostrar(`Não foi possível adicionar: ${e?.message ?? e}`, true);
    }
  }

  async function criarCategoria() {
    const nomeCat = formatarNome(novaCat);
    if (!nomeCat) {
      mostrar('Digite o nome da categoria.', true);
      return;
    }
    if (arvore.some(x => x.nome.toLowerCase() === nomeCat.toLowerCase())) {
      mostrar('Essa categoria já existe.', true);
      return;
    }
    await salvarArvore([...arvore, { nome: nomeCat, subs: [] }]);
    setCatSel(nomeCat);
    setSubSel(null);
    setNovaCat('');
    setCriandoCat(false);
  }

  async function criarSub() {
    const nomeSub = formatarNome(novaSub);
    if (!nomeSub) {
      mostrar('Digite o nome da subcategoria.', true);
      return;
    }
    if (subsDaCat.some(x => x.toLowerCase() === nomeSub.toLowerCase())) {
      mostrar('Essa subcategoria já existe nesta categoria.', true);
      return;
    }
    await salvarArvore(
      arvore.map(x => (x.nome === catAtual ? { ...x, subs: [...x.subs, nomeSub] } : x))
    );
    setSubSel(nomeSub);
    setNovaSub('');
    setCriandoSub(false);
  }

  async function excluirCategoria(nomeCat: string) {
    const emUso = itens.filter(i => i.categoria === nomeCat).length;
    if (emUso > 0) {
      mostrar(
        `"${nomeCat}" ainda tem ${emUso} ${emUso === 1 ? 'item' : 'itens'} na lista. ` +
          'Exclua os itens antes de remover a categoria.',
        true
      );
      return;
    }
    await salvarArvore(arvore.filter(x => x.nome !== nomeCat));
  }

  async function excluirSub(sub: string) {
    const emUso = itens.filter(i => i.categoria === catAtual && i.subcategoria === sub).length;
    if (emUso > 0) {
      mostrar(
        `"${sub}" ainda tem ${emUso} ${emUso === 1 ? 'item' : 'itens'} na lista. ` +
          'Exclua os itens antes de remover a subcategoria.',
        true
      );
      return;
    }
    await salvarArvore(
      arvore.map(x => (x.nome === catAtual ? { ...x, subs: x.subs.filter(y => y !== sub) } : x))
    );
  }

  async function alternar(item: ItemCompra) {
    try {
      await updateDoc(doc(db, 'compras', item.id), { comprado: !item.comprado });
    } catch (e: any) {
      console.error('Erro ao atualizar item:', e);
      mostrar(`Não foi possível atualizar: ${e?.message ?? e}`, true);
    }
  }

  async function excluir(item: ItemCompra) {
    try {
      await deleteDoc(doc(db, 'compras', item.id));
    } catch (e: any) {
      console.error('Erro ao excluir item:', e);
      mostrar(`Não foi possível excluir: ${e?.message ?? e}`, true);
    }
  }

  async function limparComprados() {
    if (!confirmandoLimpar) {
      setConfirmandoLimpar(true);
      setTimeout(() => setConfirmandoLimpar(false), 4000);
      return;
    }
    setConfirmandoLimpar(false);
    try {
      const lote = writeBatch(db);
      visiveis.filter(i => i.comprado).forEach(i => lote.delete(doc(db, 'compras', i.id)));
      await lote.commit();
      mostrar('Itens comprados removidos.');
    } catch (e: any) {
      console.error('Erro ao limpar comprados:', e);
      mostrar(`Não foi possível limpar: ${e?.message ?? e}`, true);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.cabecalho}>
        <Pressable onPress={onVoltar} style={s.voltar} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.primaria} />
        </Pressable>
        <Text style={s.titulo}>Lista de compras</Text>
      </View>

      {aviso ? (
        <Text style={[s.banner, aviso.erro ? s.bannerErro : s.bannerOk]}>{aviso.texto}</Text>
      ) : null}

      {itens.length > 0 && (
        <View style={s.linha}>
          {['Todas', ...categoriasComItens].map(nomeCat => {
            const ativo = filtroAtivo === nomeCat;
            return (
              <Pressable
                key={nomeCat}
                onPress={() => setFiltro(nomeCat)}
                style={[s.chip, ativo && s.chipAtivo]}
              >
                <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{nomeCat}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {total > 0 && (
        <View style={s.progresso}>
          <View style={s.linhaEntre}>
            <Text style={s.progressoTitulo}>No carrinho</Text>
            <Text style={s.progressoTitulo}>{comprados} de {total}</Text>
          </View>
          <View style={s.barra}>
            <View style={[s.barraPreenchida, { width: `${pct}%` }]} />
          </View>
        </View>
      )}

      <View style={s.painel}>
        <Text style={s.rotulo}>Novo item</Text>
        <TextInput
          style={s.input}
          placeholder="Nome do item"
          placeholderTextColor={c.placeholder}
          value={nome}
          onChangeText={setNome}
          onSubmitEditing={adicionar}
          returnKeyType="done"
        />
        <TextInput
          style={s.input}
          placeholder="Quantidade (opcional)"
          placeholderTextColor={c.placeholder}
          value={quantidade}
          onChangeText={setQuantidade}
        />

        <View style={s.linhaEntre}>
          <Text style={s.rotulo}>Categoria</Text>
          <Pressable onPress={() => setEditando(!editando)}>
            <Text style={s.link}>{editando ? 'Concluir' : 'Editar categorias'}</Text>
          </Pressable>
        </View>
        <View style={s.linha}>
          {arvore.map(cat => {
            const ativo = catAtual === cat.nome && !editando;
            return (
              <Pressable
                key={cat.nome}
                onPress={() => {
                  if (editando) excluirCategoria(cat.nome);
                  else {
                    setCatSel(cat.nome);
                    setSubSel(null);
                  }
                }}
                style={[s.chip, ativo && s.chipAtivo, editando && s.chipEditando]}
              >
                {editando && <Ionicons name="close" size={14} color={c.perigo} />}
                <Text
                  style={[s.chipTexto, ativo && s.chipTextoAtivo, editando && s.chipTextoEditando]}
                >
                  {cat.nome}
                </Text>
              </Pressable>
            );
          })}
          {!editando && (
            <Pressable style={s.chipNovo} onPress={() => setCriandoCat(!criandoCat)}>
              <Ionicons name="add" size={14} color={c.primaria} />
              <Text style={s.chipNovoTexto}>Nova</Text>
            </Pressable>
          )}
        </View>
        {criandoCat && !editando && (
          <View style={s.linha}>
            <TextInput
              style={[s.input, s.inputFlex]}
              placeholder="Nome da categoria"
              placeholderTextColor={c.placeholder}
              value={novaCat}
              onChangeText={setNovaCat}
              onSubmitEditing={criarCategoria}
            />
            <Pressable style={s.botaoPequeno} onPress={criarCategoria}>
              <Text style={s.botaoPequenoTexto}>Criar</Text>
            </Pressable>
          </View>
        )}

        <Text style={s.rotulo}>Subcategoria de {catAtual} (opcional)</Text>
        <View style={s.linha}>
          {subsDaCat.map(sub => {
            const ativo = subAtual === sub && !editando;
            return (
              <Pressable
                key={sub}
                onPress={() => {
                  if (editando) excluirSub(sub);
                  else setSubSel(subAtual === sub ? null : sub);
                }}
                style={[s.chip, ativo && s.chipAtivo, editando && s.chipEditando]}
              >
                {editando && <Ionicons name="close" size={14} color={c.perigo} />}
                <Text
                  style={[s.chipTexto, ativo && s.chipTextoAtivo, editando && s.chipTextoEditando]}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
          {!editando && (
            <Pressable style={s.chipNovo} onPress={() => setCriandoSub(!criandoSub)}>
              <Ionicons name="add" size={14} color={c.primaria} />
              <Text style={s.chipNovoTexto}>Nova</Text>
            </Pressable>
          )}
          {subsDaCat.length === 0 && !criandoSub && !editando && (
            <Text style={s.suave}>Ainda sem subcategorias.</Text>
          )}
        </View>
        {criandoSub && !editando && (
          <View style={s.linha}>
            <TextInput
              style={[s.input, s.inputFlex]}
              placeholder="Nome da subcategoria"
              placeholderTextColor={c.placeholder}
              value={novaSub}
              onChangeText={setNovaSub}
              onSubmitEditing={criarSub}
            />
            <Pressable style={s.botaoPequeno} onPress={criarSub}>
              <Text style={s.botaoPequenoTexto}>Criar</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={s.botao} onPress={adicionar}>
          <Text style={s.botaoTexto}>Adicionar à lista</Text>
        </Pressable>
      </View>

      {grupos.length === 0 && <Text style={s.vazio}>Sua lista está vazia.</Text>}

      {grupos.map(g => {
        const pendentes = g.itens.filter(i => !i.comprado).length;
        return (
          <View key={g.nome} style={s.grupo}>
            <View style={s.linhaEntre}>
              <Text style={s.grupoTitulo}>{g.nome}</Text>
              <Text style={s.suave}>
                {pendentes === 0
                  ? 'Tudo comprado'
                  : `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`}
              </Text>
            </View>

            {g.blocos.map(b => (
              <View key={b.sub ?? '_geral'} style={{ gap: 10 }}>
                {b.sub ? <Text style={s.subTitulo}>{b.sub}</Text> : null}
                {b.itens.map(item => (
                  <View key={item.id} style={s.item}>
                    <Pressable
                      onPress={() => alternar(item)}
                      hitSlop={8}
                      style={[s.caixa, item.comprado && s.caixaMarcada]}
                    >
                      {item.comprado && (
                        <Ionicons name="checkmark" size={16} color={c.textoPrimaria} />
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.itemNome, item.comprado && s.riscado]}>{item.nome}</Text>
                      {item.quantidade ? <Text style={s.suave}>{item.quantidade}</Text> : null}
                    </View>
                    <Pressable onPress={() => excluir(item)} hitSlop={8}>
                      <Ionicons name="close" size={20} color={c.perigo} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      })}

      {comprados > 0 && (
        <Pressable
          style={[s.limpar, confirmandoLimpar && s.limparConfirmar]}
          onPress={limparComprados}
        >
          <Text style={confirmandoLimpar ? s.limparTextoConfirmar : s.limparTexto}>
            {confirmandoLimpar ? 'Confirmar?' : `Limpar comprados (${comprados})`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 12 },
    cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    voltar: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primariaSuave,
    },
    titulo: { fontSize: 22, fontWeight: '700', color: c.texto },
    suave: { color: c.textoSuave },
    rotulo: { fontWeight: '600', color: c.textoSuave },
    link: { color: c.primaria, fontWeight: '700' },
    banner: { padding: 10, borderRadius: 10, fontWeight: '600', overflow: 'hidden' },
    bannerOk: { backgroundColor: c.primariaSuave, color: c.primaria },
    bannerErro: { backgroundColor: c.perigoSuave, color: c.perigo },
    linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progresso: {
      backgroundColor: c.primariaSuave, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 14, gap: 8,
    },
    progressoTitulo: { fontWeight: '700', color: c.texto },
    barra: { height: 8, borderRadius: 4, backgroundColor: c.borda, overflow: 'hidden' },
    barraPreenchida: { height: 8, borderRadius: 4, backgroundColor: c.primaria },
    painel: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 16, gap: 12,
    },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    inputFlex: { flex: 1 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderColor: c.borda, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.input,
    },
    chipAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    chipTexto: { color: c.texto },
    chipTextoAtivo: { color: c.textoPrimaria, fontWeight: '600' },
    chipEditando: { borderColor: c.perigo, backgroundColor: c.perigoSuave },
    chipTextoEditando: { color: c.perigo, fontWeight: '600' },
    chipNovo: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: c.primaria, borderStyle: 'dashed', borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    chipNovoTexto: { color: c.primaria, fontWeight: '600' },
    botao: { backgroundColor: c.destaque, padding: 13, borderRadius: 12, alignItems: 'center' },
    botaoTexto: { color: c.textoDestaque, fontWeight: '700' },
    botaoPequeno: {
      backgroundColor: c.primaria, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
    },
    botaoPequenoTexto: { color: c.textoPrimaria, fontWeight: '700' },
    vazio: { textAlign: 'center', color: c.textoSuave, marginTop: 12 },
    grupo: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 14, gap: 12,
    },
    grupoTitulo: { fontSize: 16, fontWeight: '700', color: c.texto },
    subTitulo: {
      fontSize: 12, fontWeight: '800', color: c.primaria,
      letterSpacing: 0.8, textTransform: 'uppercase',
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    caixa: {
      width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: c.borda,
      alignItems: 'center', justifyContent: 'center',
    },
    caixaMarcada: { backgroundColor: c.sucesso, borderColor: c.sucesso },
    itemNome: { fontWeight: '600', color: c.texto, fontSize: 15 },
    riscado: { textDecorationLine: 'line-through', color: c.textoSuave },
    limpar: {
      borderWidth: 1, borderColor: c.perigo, padding: 12,
      borderRadius: 12, alignItems: 'center',
    },
    limparConfirmar: { backgroundColor: c.perigo },
    limparTexto: { color: c.perigo, fontWeight: '700' },
    limparTextoConfirmar: { color: '#FFFFFF', fontWeight: '700' },
  });
}