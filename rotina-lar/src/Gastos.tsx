import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useTema, type Tema } from './tema';
import {
  useCartoes, useGastos, expandir, formatarReais, lerValor, lerDataBR, textoBR,
  dataCurta, primeiraFatura, valoresParcelas, somarMeses, chaveMes, rotuloMes,
  rotuloMesCurto, diasNoMes, type Gasto,
} from './gastosLogica';

const PARCELAS_RAPIDAS = ['1', '2', '3', '6', '10', '12'];

export default function Gastos({ onVoltar }: { onVoltar: () => void }) {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);
  const { cartoes, erro: erroCartoes } = useCartoes();
  const { gastos, erro: erroGastos } = useGastos();

  const hoje = new Date();
  const [mesVisto, setMesVisto] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [filtro, setFiltro] = useState('todos');
  const [formAberto, setFormAberto] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [valorTxt, setValorTxt] = useState('');
  const [modoValor, setModoValor] = useState<'total' | 'parcela'>('total');
  const [parcelasTxt, setParcelasTxt] = useState('1');
  const [dataTxt, setDataTxt] = useState(textoBR(hoje));
  const [cartaoSel, setCartaoSel] = useState<string | null>(null);

  const [cartaoFormAberto, setCartaoFormAberto] = useState(false);
  const [nomeCartao, setNomeCartao] = useState('');
  const [fechTxt, setFechTxt] = useState('');
  const [vencTxt, setVencTxt] = useState('');

  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mostrar(texto: string, erro = false) {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ texto, erro });
    temporizador.current = setTimeout(() => setAviso(null), 7000);
  }

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  // ---------- Cálculos ----------

  const cartaoAtual = cartoes.find(x => x.id === cartaoSel) ?? cartoes[0] ?? null;
  const filtroAtivo =
    filtro === 'todos' || cartoes.some(x => x.id === filtro) ? filtro : 'todos';

  const lancamentos = useMemo(() => expandir(gastos, cartoes), [gastos, cartoes]);
  const visiveis = lancamentos.filter(l => filtroAtivo === 'todos' || l.cartao.id === filtroAtivo);

  const chaveVista = chaveMes(mesVisto.ano, mesVisto.mes);
  const doMes = visiveis
    .filter(l => l.chave === chaveVista)
    .sort(
      (a, b) =>
        b.gasto.data.localeCompare(a.gasto.data) ||
        a.gasto.descricao.localeCompare(b.gasto.descricao, 'pt-BR')
    );
  const totalMes = doMes.reduce((soma, l) => soma + l.valor, 0);

  const proximas = Array.from({ length: 6 }, (_, i) => {
    const m = somarMeses(hoje.getFullYear(), hoje.getMonth(), i);
    const total = visiveis
      .filter(l => l.chave === chaveMes(m.ano, m.mes))
      .reduce((soma, l) => soma + l.valor, 0);
    return { ...m, total };
  });

  const cartaoDaFatura =
    filtroAtivo !== 'todos'
      ? cartoes.find(x => x.id === filtroAtivo)
      : cartoes.length === 1
      ? cartoes[0]
      : undefined;
  const textoVenc = cartaoDaFatura
    ? `Vence em ${String(
        Math.min(cartaoDaFatura.vencimento, diasNoMes(mesVisto.ano, mesVisto.mes))
      ).padStart(2, '0')}/${String(mesVisto.mes + 1).padStart(2, '0')}/${mesVisto.ano} · `
    : '';
  const textoQtd = `${doMes.length} ${doMes.length === 1 ? 'lançamento' : 'lançamentos'}`;

  // Prévia da compra que está sendo digitada
  const nParcelas = parseInt(parcelasTxt, 10);
  const valorLido = lerValor(valorTxt);
  const dataISO = lerDataBR(dataTxt);
  const parcelasOk = Number.isInteger(nParcelas) && nParcelas >= 1 && nParcelas <= 60;
  const totalCent =
    valorLido && parcelasOk ? (modoValor === 'total' ? valorLido : valorLido * nParcelas) : null;

  let previa: string | null = null;
  if (totalCent && dataISO && cartaoAtual) {
    const valores = valoresParcelas(totalCent, nParcelas);
    const inicio = primeiraFatura(dataISO, cartaoAtual);
    const fim = somarMeses(inicio.ano, inicio.mes, nParcelas - 1);
    const iguais = valores.every(v => v === valores[0]);
    previa =
      nParcelas === 1
        ? `À vista: ${formatarReais(totalCent)} na fatura de ${rotuloMesCurto(inicio.ano, inicio.mes)}.`
        : `${nParcelas}x de ${iguais ? '' : '~'}${formatarReais(valores[0])} ` +
          `(total ${formatarReais(totalCent)}), de ${rotuloMesCurto(inicio.ano, inicio.mes)} ` +
          `até ${rotuloMesCurto(fim.ano, fim.mes)}.`;
  }

  // ---------- Ações ----------

  async function salvarCompra() {
    if (!cartaoAtual) {
      mostrar('Cadastre um cartão primeiro.', true);
      return;
    }
    if (!descricao.trim()) {
      mostrar('Digite a descrição da compra.', true);
      return;
    }
    if (!valorLido) {
      mostrar('Informe um valor válido, por exemplo 89,90.', true);
      return;
    }
    if (!parcelasOk) {
      mostrar('Informe de 1 a 60 parcelas.', true);
      return;
    }
    if (!dataISO) {
      mostrar('Use a data no formato DD/MM/AAAA.', true);
      return;
    }
    if (!totalCent) return;

    try {
      await addDoc(collection(db, 'gastos'), {
        descricao: descricao.trim(),
        valorTotal: totalCent,
        parcelas: nParcelas,
        data: dataISO,
        cartaoId: cartaoAtual.id,
        criadoEm: Date.now(),
      });
      const inicio = primeiraFatura(dataISO, cartaoAtual);
      setMesVisto(inicio);
      setDescricao('');
      setValorTxt('');
      setParcelasTxt('1');
      setFormAberto(false);
      mostrar(`Compra salva. Primeira parcela na fatura de ${rotuloMes(inicio.ano, inicio.mes)}.`);
    } catch (e: any) {
      console.error('Erro ao salvar compra:', e);
      mostrar(`Não foi possível salvar: ${e?.message ?? e}`, true);
    }
  }

  async function excluirCompra(g: Gasto) {
    if (confirmandoId !== g.id) {
      setConfirmandoId(g.id);
      setTimeout(() => setConfirmandoId(atual => (atual === g.id ? null : atual)), 4000);
      return;
    }
    setConfirmandoId(null);
    try {
      await deleteDoc(doc(db, 'gastos', g.id));
      mostrar(`"${g.descricao}" excluída, com todas as parcelas.`);
    } catch (e: any) {
      console.error('Erro ao excluir compra:', e);
      mostrar(`Não foi possível excluir: ${e?.message ?? e}`, true);
    }
  }

  async function criarCartao() {
    const nome = nomeCartao.trim();
    const fechamento = parseInt(fechTxt, 10);
    const vencimento = parseInt(vencTxt, 10);
    if (!nome) {
      mostrar('Digite o nome do cartão.', true);
      return;
    }
    if (!(fechamento >= 1 && fechamento <= 31) || !(vencimento >= 1 && vencimento <= 31)) {
      mostrar('Informe os dias de fechamento e de vencimento (de 1 a 31).', true);
      return;
    }
    try {
      await addDoc(collection(db, 'cartoes'), { nome, fechamento, vencimento });
      setNomeCartao('');
      setFechTxt('');
      setVencTxt('');
      setCartaoFormAberto(false);
      mostrar(`Cartão "${nome}" cadastrado.`);
    } catch (e: any) {
      console.error('Erro ao criar cartão:', e);
      mostrar(`Não foi possível cadastrar o cartão: ${e?.message ?? e}`, true);
    }
  }

  async function excluirCartao(id: string, nome: string) {
    const emUso = gastos.filter(g => g.cartaoId === id).length;
    if (emUso > 0) {
      mostrar(
        `"${nome}" tem ${emUso} ${emUso === 1 ? 'compra' : 'compras'} registrada(s). ` +
          'Exclua as compras antes de remover o cartão.',
        true
      );
      return;
    }
    if (confirmandoId !== id) {
      setConfirmandoId(id);
      setTimeout(() => setConfirmandoId(atual => (atual === id ? null : atual)), 4000);
      return;
    }
    setConfirmandoId(null);
    try {
      await deleteDoc(doc(db, 'cartoes', id));
      mostrar(`Cartão "${nome}" removido.`);
    } catch (e: any) {
      console.error('Erro ao excluir cartão:', e);
      mostrar(`Não foi possível remover o cartão: ${e?.message ?? e}`, true);
    }
  }

  function definirData(diasAtras: number) {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    setDataTxt(textoBR(d));
  }

  // ---------- Telas ----------

  const formularioCartao = (
    <View style={s.painel}>
      <Text style={s.subtitulo}>{cartoes.length === 0 ? 'Cadastre seu cartão' : 'Novo cartão'}</Text>
      <Text style={s.suave}>
        Os dias de fechamento e de vencimento definem em qual fatura cada compra entra.
      </Text>
      <TextInput
        style={s.input}
        placeholder="Nome do cartão"
        placeholderTextColor={c.placeholder}
        value={nomeCartao}
        onChangeText={setNomeCartao}
      />
      <View style={s.linha}>
        <TextInput
          style={[s.input, s.inputFlex]}
          placeholder="Dia do fechamento"
          placeholderTextColor={c.placeholder}
          value={fechTxt}
          onChangeText={setFechTxt}
          keyboardType="numeric"
          maxLength={2}
        />
        <TextInput
          style={[s.input, s.inputFlex]}
          placeholder="Dia do vencimento"
          placeholderTextColor={c.placeholder}
          value={vencTxt}
          onChangeText={setVencTxt}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>
      <Pressable style={s.botao} onPress={criarCartao}>
        <Text style={s.botaoTexto}>Salvar cartão</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.cabecalho}>
        <Pressable onPress={onVoltar} style={s.voltar} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.primaria} />
        </Pressable>
        <Text style={s.titulo}>Gastos do cartão</Text>
      </View>

      {aviso ? (
        <Text style={[s.banner, aviso.erro ? s.bannerErro : s.bannerOk]}>{aviso.texto}</Text>
      ) : null}
      {erroCartoes || erroGastos ? (
        <Text style={[s.banner, s.bannerErro]}>
          Não foi possível carregar os dados: {erroCartoes ?? erroGastos}
        </Text>
      ) : null}

      {cartoes.length === 0 ? (
        formularioCartao
      ) : (
        <>
          <View style={s.painel}>
            <View style={s.linhaEntre}>
              <Pressable
                style={s.nav}
                onPress={() => setMesVisto(somarMeses(mesVisto.ano, mesVisto.mes, -1))}
              >
                <Ionicons name="chevron-back" size={18} color={c.primaria} />
              </Pressable>
              <Pressable
                onPress={() => setMesVisto({ ano: hoje.getFullYear(), mes: hoje.getMonth() })}
              >
                <Text style={s.tituloMes}>{rotuloMes(mesVisto.ano, mesVisto.mes)}</Text>
              </Pressable>
              <Pressable
                style={s.nav}
                onPress={() => setMesVisto(somarMeses(mesVisto.ano, mesVisto.mes, 1))}
              >
                <Ionicons name="chevron-forward" size={18} color={c.primaria} />
              </Pressable>
            </View>

            {cartoes.length > 1 && (
              <View style={s.linha}>
                {[{ id: 'todos', nome: 'Todos' }, ...cartoes].map(x => {
                  const ativo = filtroAtivo === x.id;
                  return (
                    <Pressable
                      key={x.id}
                      onPress={() => setFiltro(x.id)}
                      style={[s.chip, ativo && s.chipAtivo]}
                    >
                      <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{x.nome}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={s.resumo}>
              <Text style={s.suave}>Fatura de {rotuloMes(mesVisto.ano, mesVisto.mes)}</Text>
              <Text style={s.total}>{formatarReais(totalMes)}</Text>
              <Text style={s.suave}>
                {textoVenc}
                {textoQtd}
              </Text>
            </View>

            <Pressable style={s.botao} onPress={() => setFormAberto(!formAberto)}>
              <Text style={s.botaoTexto}>{formAberto ? 'Fechar' : '+ Nova compra'}</Text>
            </Pressable>
          </View>

          {formAberto && (
            <View style={s.painel}>
              <Text style={s.subtitulo}>Nova compra</Text>
              <TextInput
                style={s.input}
                placeholder="Descrição da compra"
                placeholderTextColor={c.placeholder}
                value={descricao}
                onChangeText={setDescricao}
              />

              <View style={s.linha}>
                {(['total', 'parcela'] as const).map(m => {
                  const ativo = modoValor === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setModoValor(m)}
                      style={[s.chip, ativo && s.chipAtivo]}
                    >
                      <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>
                        {m === 'total' ? 'Valor total' : 'Valor da parcela'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={s.input}
                placeholder={modoValor === 'total' ? 'Valor total (ex: 1078,80)' : 'Valor da parcela (ex: 89,90)'}
                placeholderTextColor={c.placeholder}
                value={valorTxt}
                onChangeText={setValorTxt}
                keyboardType="decimal-pad"
              />

              <Text style={s.rotulo}>Parcelas</Text>
              <View style={s.linha}>
                <TextInput
                  style={[s.input, s.inputNumero]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={parcelasTxt}
                  onChangeText={setParcelasTxt}
                />
                {PARCELAS_RAPIDAS.map(p => {
                  const ativo = parcelasTxt === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setParcelasTxt(p)}
                      style={[s.chip, ativo && s.chipAtivo]}
                    >
                      <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{p}x</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.rotulo}>Data da compra</Text>
              <View style={s.linha}>
                <TextInput
                  style={[s.input, s.inputFlex]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={c.placeholder}
                  value={dataTxt}
                  onChangeText={setDataTxt}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                <Pressable style={s.chip} onPress={() => definirData(0)}>
                  <Text style={s.chipTexto}>Hoje</Text>
                </Pressable>
                <Pressable style={s.chip} onPress={() => definirData(1)}>
                  <Text style={s.chipTexto}>Ontem</Text>
                </Pressable>
              </View>

              {cartoes.length > 1 && (
                <>
                  <Text style={s.rotulo}>Cartão</Text>
                  <View style={s.linha}>
                    {cartoes.map(x => {
                      const ativo = cartaoAtual?.id === x.id;
                      return (
                        <Pressable
                          key={x.id}
                          onPress={() => setCartaoSel(x.id)}
                          style={[s.chip, ativo && s.chipAtivo]}
                        >
                          <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{x.nome}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {previa ? <Text style={s.previa}>{previa}</Text> : null}

              <Pressable style={s.botao} onPress={salvarCompra}>
                <Text style={s.botaoTexto}>Salvar compra</Text>
              </Pressable>
            </View>
          )}

          <View style={s.painel}>
            <Text style={s.subtitulo}>Lançamentos</Text>
            {doMes.length === 0 && <Text style={s.suave}>Nenhum lançamento nesta fatura.</Text>}
            {doMes.map(l => {
              const confirmando = confirmandoId === l.gasto.id;
              return (
                <View key={`${l.gasto.id}-${l.parcela}`} style={s.item}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.itemTitulo}>{l.gasto.descricao}</Text>
                    <Text style={s.suave}>
                      {l.total > 1 ? `Parcela ${l.parcela}/${l.total} · ` : ''}
                      compra em {dataCurta(l.gasto.data)}
                      {cartoes.length > 1 ? ` · ${l.cartao.nome}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={s.valor}>{formatarReais(l.valor)}</Text>
                    <Pressable
                      onPress={() => excluirCompra(l.gasto)}
                      hitSlop={8}
                      style={confirmando ? s.excluirConfirmar : undefined}
                    >
                      {confirmando ? (
                        <Text style={s.excluirTextoConfirmar}>Excluir compra?</Text>
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={c.perigo} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {doMes.length > 0 && (
              <Text style={s.pequeno}>Excluir remove a compra e todas as suas parcelas.</Text>
            )}
          </View>

          <View style={s.painel}>
            <Text style={s.subtitulo}>Próximas faturas</Text>
            {proximas.map(p => {
              const ativa = p.ano === mesVisto.ano && p.mes === mesVisto.mes;
              return (
                <Pressable
                  key={chaveMes(p.ano, p.mes)}
                  onPress={() => setMesVisto({ ano: p.ano, mes: p.mes })}
                  style={[s.linhaFatura, ativa && s.linhaFaturaAtiva]}
                >
                  <Text style={[s.itemTitulo, ativa && { color: c.primaria }]}>
                    {rotuloMes(p.ano, p.mes)}
                  </Text>
                  <Text style={s.valor}>{p.total > 0 ? formatarReais(p.total) : '—'}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.painel}>
            <View style={s.linhaEntre}>
              <Text style={s.subtitulo}>Meus cartões</Text>
              <Pressable onPress={() => setCartaoFormAberto(!cartaoFormAberto)}>
                <Text style={s.link}>{cartaoFormAberto ? 'Fechar' : '+ Novo cartão'}</Text>
              </Pressable>
            </View>
            {cartoes.map(x => {
              const confirmando = confirmandoId === x.id;
              return (
                <View key={x.id} style={s.item}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.itemTitulo}>{x.nome}</Text>
                    <Text style={s.suave}>
                      Fecha dia {x.fechamento} · vence dia {x.vencimento}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => excluirCartao(x.id, x.nome)}
                    hitSlop={8}
                    style={confirmando ? s.excluirConfirmar : undefined}
                  >
                    {confirmando ? (
                      <Text style={s.excluirTextoConfirmar}>Remover?</Text>
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={c.perigo} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {cartaoFormAberto && formularioCartao}
        </>
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
    subtitulo: { fontSize: 16, fontWeight: '700', color: c.texto },
    suave: { color: c.textoSuave },
    pequeno: { color: c.textoSuave, fontSize: 12 },
    rotulo: { fontWeight: '600', color: c.textoSuave },
    link: { color: c.primaria, fontWeight: '700' },
    banner: { padding: 10, borderRadius: 10, fontWeight: '600', overflow: 'hidden' },
    bannerOk: { backgroundColor: c.primariaSuave, color: c.primaria },
    bannerErro: { backgroundColor: c.perigoSuave, color: c.perigo },
    painel: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 16, gap: 12,
    },
    linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nav: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primariaSuave,
    },
    tituloMes: { fontSize: 16, fontWeight: '700', color: c.texto },
    resumo: {
      backgroundColor: c.primariaSuave, borderRadius: 14, padding: 14, gap: 4,
      alignItems: 'center',
    },
    total: { fontSize: 32, fontWeight: '800', color: c.texto },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    inputFlex: { flex: 1, minWidth: 120 },
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
    botaoTexto: { color: c.textoDestaque, fontWeight: '700' },
    previa: {
      backgroundColor: c.lavandaSuave, color: c.lavanda, fontWeight: '600',
      padding: 10, borderRadius: 10, overflow: 'hidden',
    },
    item: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: c.borda, borderRadius: 12, padding: 12,
    },
    itemTitulo: { fontWeight: '700', color: c.texto },
    valor: { fontWeight: '800', color: c.texto },
    excluirConfirmar: {
      backgroundColor: c.perigo, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    excluirTextoConfirmar: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    linhaFatura: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 1, borderColor: c.borda, borderRadius: 12, padding: 12,
    },
    linhaFaturaAtiva: { backgroundColor: c.primariaSuave, borderColor: c.primaria },
  });
}