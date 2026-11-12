import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../../../firebase";
import Calendario from "../../componentes/Calendario";
import { carregarConclusoes, carregarSemanas } from "../../lib/devocional";
import { useProgresso } from "../../lib/progresso";
import type { Conclusao, Semana } from "../../lib/tipos";
import { cores, fontes, sombra } from "../../tema";

export default function Jornada() {
  const { estado, ofensiva, hoje, devocional } = useProgresso();
  const [conclusoes, setConclusoes] = useState<Conclusao[]>([]);
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      let ativo = true;
      (async () => {
        try {
          const [c, s] = await Promise.all([carregarConclusoes(uid), carregarSemanas()]);
          if (!ativo) return;
          setConclusoes(c);
          setSemanas(s);
          setErro("");
        } catch {
          if (ativo) setErro("Não foi possível carregar. Verifique a conexão.");
        } finally {
          if (ativo) setCarregando(false);
        }
      })();
      return () => {
        ativo = false;
      };
    }, [])
  );

  const concluidos = useMemo(() => new Set(conclusoes.map((c) => c.data)), [conclusoes]);
  const primeira = useMemo(
    () => (conclusoes.length ? conclusoes.map((c) => c.data).sort()[0] : null),
    [conclusoes]
  );
  const feitosPorSemana = useMemo(() => {
    const mapa = new Map<number, number>();
    conclusoes.forEach((c) => mapa.set(c.semana, (mapa.get(c.semana) ?? 0) + 1));
    return mapa;
  }, [conclusoes]);
  const semanaAtual = devocional?.semana ?? null;

  return (
    <SafeAreaView edges={["top"]} style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.titulo}>Sua jornada</Text>

        <View style={estilos.cartaoOfensiva}>
          <View style={estilos.iconeChama}>
            <Ionicons name="flame" size={28} color={cores.chama} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.ofensivaTitulo}>
              {ofensiva} {ofensiva === 1 ? "dia" : "dias"} seguidos
            </Text>
            <Text style={estilos.ofensivaTexto}>
              Melhor sequência: {Math.max(estado.melhorOfensiva, ofensiva)}{" "}
              {Math.max(estado.melhorOfensiva, ofensiva) === 1 ? "dia" : "dias"}
            </Text>
          </View>
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color={cores.verdeEscuro} style={{ marginTop: 24 }} />
        ) : (
          <>
            {!!erro && <Text style={estilos.aviso}>{erro}</Text>}
            <Calendario concluidos={concluidos} primeira={primeira} hoje={hoje} />

            <Text style={estilos.secao}>Semanas</Text>
            {semanas.map((s) => {
              const feitos = feitosPorSemana.get(s.numero) ?? 0;
              const atual = s.numero === semanaAtual;
              return (
                <View key={s.numero} style={[estilos.cartaoSemana, atual && estilos.cartaoAtual]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={estilos.rotuloSemana}>
                      Semana {s.numero}
                      {atual ? " · em andamento" : ""}
                    </Text>
                    <Text style={estilos.temaSemana}>{s.tema}</Text>
                    <View style={estilos.barra}>
                      <View style={[estilos.barraCheia, { flex: feitos }]} />
                      <View style={{ flex: 7 - feitos }} />
                    </View>
                  </View>
                  <Text style={estilos.contagem}>{feitos}/7</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 20, gap: 16 },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, color: cores.texto },
  cartaoOfensiva: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: cores.pessego,
    borderRadius: 18,
    padding: 16,
  },
  iconeChama: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: cores.cartao,
    alignItems: "center",
    justifyContent: "center",
  },
  ofensivaTitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  ofensivaTexto: { fontFamily: fontes.corpo, fontSize: 14, color: cores.textoSuave },
  secao: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto, marginTop: 8 },
  cartaoSemana: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...sombra,
  },
  cartaoAtual: { borderColor: cores.verde },
  rotuloSemana: {
    fontFamily: fontes.corpoNegrito,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: cores.verdeEscuro,
  },
  temaSemana: { fontFamily: fontes.corpoNegrito, fontSize: 16, color: cores.texto },
  barra: {
    flexDirection: "row",
    height: 6,
    borderRadius: 999,
    backgroundColor: cores.verdeClaro,
    overflow: "hidden",
    marginTop: 6,
  },
  barraCheia: { backgroundColor: cores.verde, borderRadius: 999 },
  contagem: { fontFamily: fontes.corpoMedio, fontSize: 14, color: cores.textoSuave },
  aviso: { fontFamily: fontes.corpo, fontSize: 14, color: cores.aviso },
});
