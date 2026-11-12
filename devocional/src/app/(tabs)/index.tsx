import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Botao from "../../componentes/Botao";
import { useProgresso } from "../../lib/progresso";
import { cores, fontes, saudacao, sombra } from "../../tema";

export default function Inicio() {
  const router = useRouter();
  const { carregando, erro, estado, devocional, semana, ofensiva, concluidoHoje, recarregar } =
    useProgresso();

  // Sempre que a aba ganha foco, confere se há novidade (novo dia, nome etc.).
  useFocusEffect(
    useCallback(() => {
      recarregar(true);
    }, [recarregar])
  );

  if (carregando) {
    return (
      <SafeAreaView edges={["top"]} style={[estilos.tela, estilos.centro]}>
        <ActivityIndicator size="large" color={cores.verdeEscuro} />
      </SafeAreaView>
    );
  }

  if (erro && !devocional && !concluidoHoje) {
    return (
      <SafeAreaView edges={["top"]} style={[estilos.tela, estilos.centro]}>
        <Text style={estilos.aviso}>{erro}</Text>
        <Botao texto="Tentar de novo" onPress={() => recarregar()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.topo}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.saudacao}>
              {saudacao()}
              {estado.nome ? `, ${estado.nome}` : ""}!
            </Text>
            <Text style={estilos.subtitulo}>Que hoje seja um dia de paz e propósito.</Text>
          </View>
          <View style={estilos.ofensiva}>
            <Ionicons name="flame" size={18} color={cores.chama} />
            <Text style={estilos.ofensivaNumero}>{ofensiva}</Text>
          </View>
        </View>

        {concluidoHoje ? (
          <View style={estilos.concluido}>
            <Ionicons name="checkmark-circle" size={44} color={cores.verdeEscuro} />
            <Text style={estilos.concluidoTitulo}>Devocional de hoje concluído</Text>
            <Text style={estilos.concluidoTexto}>
              Você está há {ofensiva} {ofensiva === 1 ? "dia" : "dias"} seguidos. O próximo
              devocional será liberado amanhã.
            </Text>
          </View>
        ) : devocional ? (
          <>
            <View style={estilos.destaque}>
              <Ionicons name="leaf-outline" size={22} color={cores.verdeEscuro} />
              <Text style={estilos.destaqueTexto} numberOfLines={5}>
                {devocional.versiculoTexto}
              </Text>
              <Text style={estilos.destaqueRef}>{devocional.versiculoRef}</Text>
            </View>

            <Text style={estilos.secao}>Seu devocional de hoje</Text>
            <Pressable style={estilos.linhaDevocional} onPress={() => router.push("/devocional")}>
              <View style={estilos.iconeLivro}>
                <Ionicons name="book-outline" size={24} color={cores.aviso} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.devocionalTitulo} numberOfLines={2}>
                  {devocional.titulo}
                </Text>
                <Text style={estilos.devocionalRef}>{devocional.passagemRef}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} />
            </Pressable>
            <Botao texto="Ler devocional" onPress={() => router.push("/devocional")} />

            <View style={estilos.cartaoSemana}>
              <Text style={estilos.rotuloSemana}>Semana {devocional.semana}</Text>
              <Text style={estilos.temaSemana}>{semana?.tema ?? ""}</Text>
              {!!semana?.descricao && <Text style={estilos.descricao}>{semana.descricao}</Text>}
              <Text style={estilos.progressoSemana}>Dia {devocional.dia} de 7</Text>
            </View>
          </>
        ) : (
          <View style={estilos.concluido}>
            <Ionicons name="sparkles-outline" size={40} color={cores.verdeEscuro} />
            <Text style={estilos.concluidoTitulo}>Você concluiu todos os devocionais</Text>
            <Text style={estilos.concluidoTexto}>Novos conteúdos serão adicionados em breve.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  centro: { justifyContent: "center", padding: 24, gap: 16 },
  conteudo: { padding: 20, gap: 16 },
  topo: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  saudacao: { fontFamily: fontes.titulo, fontSize: 26, color: cores.texto },
  subtitulo: { fontFamily: fontes.corpo, fontSize: 15, color: cores.textoSuave, marginTop: 2 },
  ofensiva: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: cores.cartao,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    ...sombra,
  },
  ofensivaNumero: { fontFamily: fontes.corpoNegrito, fontSize: 16, color: cores.chama },
  destaque: {
    backgroundColor: cores.verdeClaro,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  destaqueTexto: {
    fontFamily: fontes.citacao,
    fontSize: 19,
    lineHeight: 28,
    color: cores.texto,
  },
  destaqueRef: { fontFamily: fontes.corpoMedio, fontSize: 14, color: cores.textoSuave },
  secao: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto, marginTop: 4 },
  linhaDevocional: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 14,
    ...sombra,
  },
  iconeLivro: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: cores.pessego,
    alignItems: "center",
    justifyContent: "center",
  },
  devocionalTitulo: { fontFamily: fontes.corpoNegrito, fontSize: 16, color: cores.texto },
  devocionalRef: { fontFamily: fontes.corpo, fontSize: 14, color: cores.textoSuave },
  cartaoSemana: {
    backgroundColor: cores.pessego,
    borderRadius: 18,
    padding: 18,
    gap: 4,
    marginTop: 4,
  },
  rotuloSemana: {
    fontFamily: fontes.corpoNegrito,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: cores.aviso,
  },
  temaSemana: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  descricao: { fontFamily: fontes.corpo, fontSize: 15, lineHeight: 22, color: cores.textoSuave },
  progressoSemana: {
    fontFamily: fontes.corpoMedio,
    fontSize: 13,
    color: cores.textoSuave,
    marginTop: 6,
  },
  concluido: {
    alignItems: "center",
    gap: 10,
    backgroundColor: cores.verdeClaro,
    borderRadius: 20,
    padding: 28,
  },
  concluidoTitulo: {
    fontFamily: fontes.titulo,
    fontSize: 20,
    color: cores.texto,
    textAlign: "center",
  },
  concluidoTexto: {
    fontFamily: fontes.corpo,
    fontSize: 15,
    lineHeight: 22,
    color: cores.textoSuave,
    textAlign: "center",
  },
  aviso: { fontFamily: fontes.corpo, fontSize: 15, color: cores.aviso, textAlign: "center" },
});
