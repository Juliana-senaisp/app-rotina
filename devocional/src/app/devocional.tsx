import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import Botao from "../componentes/Botao";
import LeituraBiblica from "../componentes/LeituraBiblica";
import { useProgresso } from "../lib/progresso";
import { cores, fontes, sombra } from "../tema";

export default function DevocionalDoDia() {
  const router = useRouter();
  const { devocional, semana, respostas, definirResposta, concluir, salvando, erro, concluidoHoje } =
    useProgresso();
  const [avisoLouvor, setAvisoLouvor] = useState("");

  const voltar = (
    <Pressable onPress={() => router.back()} hitSlop={12} style={estilos.voltar}>
      <Ionicons name="chevron-back" size={24} color={cores.texto} />
    </Pressable>
  );

  if (!devocional || concluidoHoje) {
    return (
      <SafeAreaView style={estilos.tela}>
        <View style={estilos.barra}>{voltar}</View>
        <View style={estilos.vazio}>
          <Text style={estilos.titulo}>
            {concluidoHoje ? "Devocional de hoje concluído" : "Nenhum devocional disponível"}
          </Text>
          <Text style={estilos.texto}>
            {concluidoHoje
              ? "O próximo será liberado amanhã."
              : "Novos conteúdos serão adicionados em breve."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function abrirLouvor() {
    if (!devocional?.louvor.link) return;
    setAvisoLouvor("");
    Linking.openURL(devocional.louvor.link).catch(() =>
      setAvisoLouvor("Não foi possível abrir o link do louvor.")
    );
  }

  async function marcarComoFeito() {
    const ok = await concluir();
    if (ok) router.back();
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.barra}>
        {voltar}
        <Text style={estilos.barraTitulo}>Devocional do dia</Text>
        <View style={estilos.voltar} />
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.chips}>
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>
              Semana {devocional.semana}
              {semana ? ` · ${semana.tema}` : ""}
            </Text>
          </View>
          <Text style={estilos.dia}>Dia {devocional.dia} de 7</Text>
        </View>

        <Text style={estilos.titulo}>{devocional.titulo}</Text>
        <Text style={estilos.referencia}>{devocional.passagemRef}</Text>

        <Text style={estilos.texto}>{devocional.reflexao}</Text>

        <LeituraBiblica referencia={devocional.versiculoRef} texto={devocional.versiculoTexto} />

        {!!devocional.fraseChave && (
          <Text style={estilos.fraseChave}>“{devocional.fraseChave}”</Text>
        )}

        {devocional.perguntas.length > 0 && (
          <>
            <Text style={estilos.secao}>Para refletir</Text>
            <Text style={estilos.opcional}>
              Responder é opcional. Escreva só se quiser, e suas respostas ficam guardadas.
            </Text>
            {devocional.perguntas.map((pergunta, i) => (
              <View key={i} style={estilos.bloco}>
                <Text style={estilos.pergunta}>{pergunta}</Text>
                <TextInput
                  style={estilos.resposta}
                  multiline
                  placeholder="Sua resposta (opcional)"
                  placeholderTextColor={cores.textoSuave}
                  textAlignVertical="top"
                  value={respostas[i] ?? ""}
                  onChangeText={(t) => definirResposta(i, t)}
                />
              </View>
            ))}
          </>
        )}

        <Text style={estilos.secao}>Louvor</Text>
        <View style={estilos.cartaoLouvor}>
          <View style={estilos.iconeLouvor}>
            <Ionicons name="musical-notes-outline" size={22} color={cores.verdeEscuro} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={estilos.louvorTitulo}>{devocional.louvor.titulo}</Text>
            <Text style={estilos.louvorArtista}>{devocional.louvor.artista}</Text>
            {!!devocional.hino && (
              <Text style={estilos.louvorArtista}>Harpa Cristã: {devocional.hino}</Text>
            )}
          </View>
          <Pressable onPress={abrirLouvor} style={estilos.tocar}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        {!!avisoLouvor && <Text style={estilos.aviso}>{avisoLouvor}</Text>}

        <View style={estilos.oracao}>
          <Text style={estilos.rotuloOracao}>Oração do dia</Text>
          <Text style={estilos.textoOracao}>{devocional.oracao}</Text>
        </View>

        {!!erro && <Text style={estilos.aviso}>{erro}</Text>}
        <Botao
          texto={salvando ? "Salvando..." : "Marcar como feito"}
          onPress={marcarComoFeito}
          desativado={salvando}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voltar: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  barraTitulo: { fontFamily: fontes.corpoNegrito, fontSize: 16, color: cores.texto },
  vazio: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  conteudo: { padding: 20, paddingBottom: 40, gap: 14 },
  chips: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  chip: {
    backgroundColor: cores.pessego,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipTexto: { fontFamily: fontes.corpoNegrito, fontSize: 12, color: cores.aviso },
  dia: { fontFamily: fontes.corpoMedio, fontSize: 13, color: cores.textoSuave },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, lineHeight: 33, color: cores.texto },
  referencia: { fontFamily: fontes.corpoMedio, fontSize: 15, color: cores.textoSuave },
  texto: { fontFamily: fontes.corpo, fontSize: 16, lineHeight: 25, color: cores.texto },
  fraseChave: {
    fontFamily: fontes.citacao,
    fontSize: 18,
    lineHeight: 27,
    color: cores.verdeEscuro,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  secao: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto, marginTop: 8 },
  opcional: { fontFamily: fontes.corpo, fontSize: 14, color: cores.textoSuave },
  bloco: { gap: 8 },
  pergunta: { fontFamily: fontes.corpoNegrito, fontSize: 16, lineHeight: 23, color: cores.texto },
  resposta: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
    borderRadius: 14,
    padding: 14,
    fontFamily: fontes.corpo,
    fontSize: 16,
    color: cores.texto,
  },
  cartaoLouvor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 14,
    ...sombra,
  },
  iconeLouvor: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: cores.verdeClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  louvorTitulo: { fontFamily: fontes.corpoNegrito, fontSize: 16, color: cores.texto },
  louvorArtista: { fontFamily: fontes.corpo, fontSize: 14, color: cores.textoSuave },
  tocar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: cores.verde,
    alignItems: "center",
    justifyContent: "center",
  },
  oracao: {
    backgroundColor: cores.pessego,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    marginTop: 4,
  },
  rotuloOracao: {
    fontFamily: fontes.corpoNegrito,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: cores.aviso,
  },
  textoOracao: { fontFamily: fontes.corpo, fontSize: 16, lineHeight: 25, color: cores.texto },
  aviso: { fontFamily: fontes.corpo, fontSize: 14, color: cores.aviso },
});
