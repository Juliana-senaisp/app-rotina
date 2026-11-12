import { Pressable, StyleSheet, Text } from "react-native";

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
        styles.botao,
        secundario && styles.botaoSecundario,
        desativado && styles.botaoDesativado,
      ]}
    >
      <Text style={[styles.texto, secundario && styles.textoSecundario]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: "#2f4f6f",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2f4f6f",
  },
  botaoSecundario: { backgroundColor: "#ffffff" },
  botaoDesativado: { opacity: 0.5 },
  texto: { color: "#ffffff", fontSize: 16, fontWeight: "600", textAlign: "center" },
  textoSecundario: { color: "#2f4f6f" },
});
