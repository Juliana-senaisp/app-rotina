import { Pressable, StyleSheet, Text } from "react-native";

import { cores, fontes } from "../tema";

type Props = {
  texto: string;
  onPress: () => void;
  desativado?: boolean;
  secundario?: boolean;
};

export default function Botao({ texto, onPress, desativado, secundario }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desativado}
      style={[
        estilos.botao,
        secundario && estilos.botaoSecundario,
        desativado && estilos.botaoDesativado,
      ]}
    >
      <Text style={[estilos.texto, secundario && estilos.textoSecundario]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    backgroundColor: cores.verde,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: cores.verde,
  },
  botaoSecundario: { backgroundColor: "transparent" },
  botaoDesativado: { opacity: 0.5 },
  texto: {
    color: "#FFFFFF",
    fontFamily: fontes.corpoNegrito,
    fontSize: 16,
    textAlign: "center",
  },
  textoSecundario: { color: cores.verdeEscuro },
});
