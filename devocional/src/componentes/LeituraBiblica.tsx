import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { cores, fontes } from "../tema";

type Props = { referencia: string; texto: string };

// Caixa de leitura bíblica: aceita um versículo ou uma passagem maior.
// Textos longos abrem recolhidos, com "Ler mais".
export default function LeituraBiblica({ referencia, texto }: Props) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > 380;

  return (
    <View style={estilos.caixa}>
      <View style={estilos.cabecalho}>
        <Ionicons name="leaf-outline" size={18} color={cores.verdeEscuro} />
        <Text style={estilos.rotulo}>Leitura bíblica</Text>
      </View>
      <Text style={estilos.texto} numberOfLines={longo && !aberto ? 7 : undefined}>
        {texto}
      </Text>
      <Text style={estilos.referencia}>{referencia}</Text>
      {longo && (
        <Pressable onPress={() => setAberto((v) => !v)}>
          <Text style={estilos.mais}>{aberto ? "Mostrar menos" : "Ler mais"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    backgroundColor: cores.ambar,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 6 },
  rotulo: {
    fontFamily: fontes.corpoNegrito,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: cores.verdeEscuro,
  },
  texto: {
    fontFamily: fontes.citacao,
    fontSize: 17,
    lineHeight: 26,
    color: cores.texto,
  },
  referencia: { fontFamily: fontes.corpoMedio, fontSize: 14, color: cores.textoSuave },
  mais: { fontFamily: fontes.corpoNegrito, fontSize: 14, color: cores.verdeEscuro },
});
