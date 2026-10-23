import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema, type Tema } from './tema';
import { useUsuario, sair } from './auth';
import { sincronizarLembretesEventos } from './notificacoes';

type Icone = keyof typeof Ionicons.glyphMap;

const ITENS: {
  id: 'compras' | 'gastos';
  titulo: string;
  descricao: string;
  icone: Icone;
  disponivel: boolean;
}[] = [
  {
    id: 'compras',
    titulo: 'Lista de compras',
    descricao: 'Itens organizados por categoria',
    icone: 'cart-outline',
    disponivel: true,
  },
  {
    id: 'gastos',
    titulo: 'Gastos do cartão',
    descricao: 'Fatura do mês e parcelas',
    icone: 'card-outline',
    disponivel: false,
  },
];

export default function Mais({ onAbrir }: { onAbrir: (destino: 'compras') => void }) {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);
  const { usuario } = useUsuario();
  const [confirmandoSair, setConfirmandoSair] = useState(false);

  async function aoSair() {
    if (!confirmandoSair) {
      setConfirmandoSair(true);
      setTimeout(() => setConfirmandoSair(false), 4000);
      return;
    }
    try {
      // Remove os lembretes de eventos deste aparelho antes de sair.
      await sincronizarLembretesEventos([]);
    } catch (e) {
      console.error('Erro ao limpar lembretes:', e);
    }
    await sair();
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.titulo}>Mais</Text>

      {ITENS.map(item => (
        <Pressable
          key={item.id}
          disabled={!item.disponivel}
          onPress={() => item.id === 'compras' && onAbrir('compras')}
          style={[s.cartao, !item.disponivel && s.indisponivel]}
        >
          <View style={s.iconeBox}>
            <Ionicons name={item.icone} size={24} color={c.primaria} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.cartaoTitulo}>{item.titulo}</Text>
            <Text style={s.suave}>{item.descricao}</Text>
          </View>
          {item.disponivel ? (
            <Ionicons name="chevron-forward" size={20} color={c.textoSuave} />
          ) : (
            <View style={s.etiqueta}>
              <Text style={s.etiquetaTexto}>Em breve</Text>
            </View>
          )}
        </Pressable>
      ))}

      <Text style={s.secao}>Conta</Text>
      <View style={s.cartao}>
        <View style={[s.iconeBox, { backgroundColor: c.lavandaSuave }]}>
          <Ionicons name="person-outline" size={24} color={c.lavanda} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.cartaoTitulo}>Conectada como</Text>
          <Text style={s.suave}>{usuario?.email ?? ''}</Text>
        </View>
      </View>
      <Pressable style={[s.sair, confirmandoSair && s.sairConfirmar]} onPress={aoSair}>
        <Text style={confirmandoSair ? s.sairTextoConfirmar : s.sairTexto}>
          {confirmandoSair ? 'Confirmar?' : 'Sair da conta'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 12 },
    titulo: { fontSize: 22, fontWeight: '700', color: c.texto },
    secao: { fontSize: 17, fontWeight: '700', color: c.texto, marginTop: 8 },
    suave: { color: c.textoSuave },
    cartao: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 16, padding: 16,
    },
    indisponivel: { opacity: 0.6 },
    iconeBox: {
      width: 48, height: 48, borderRadius: 16, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primariaSuave,
    },
    cartaoTitulo: { fontSize: 16, fontWeight: '700', color: c.texto },
    etiqueta: { backgroundColor: c.lavandaSuave, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    etiquetaTexto: { color: c.lavanda, fontSize: 12, fontWeight: '700' },
    sair: {
      borderWidth: 1, borderColor: c.perigo, padding: 13,
      borderRadius: 12, alignItems: 'center',
    },
    sairConfirmar: { backgroundColor: c.perigo },
    sairTexto: { color: c.perigo, fontWeight: '700' },
    sairTextoConfirmar: { color: '#FFFFFF', fontWeight: '700' },
  });
}