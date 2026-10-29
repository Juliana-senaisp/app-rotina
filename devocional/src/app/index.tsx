import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { doc, writeBatch } from "firebase/firestore";

import { db } from "../../firebase";
import dados from "../dados/devocionais.json";

// TELA TEMPORÁRIA: envia as semanas e os devocionais do arquivo
// devocionais.json para o Firestore. Será substituída pela tela real do app.
export default function CargaInicial() {
  const [status, setStatus] = useState("Pronto para enviar.");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    setStatus("Enviando...");
    try {
      const batch = writeBatch(db);

      for (const semana of dados.semanas) {
        batch.set(doc(db, "semanas", String(semana.numero)), semana);
      }
      for (const devocional of dados.devocionais) {
        batch.set(doc(db, "devocionais", devocional.id), devocional);
      }

      await batch.commit();
      setStatus(
        `Concluído: ${dados.semanas.length} semanas e ${dados.devocionais.length} devocionais enviados.`
      );
    } catch (erro) {
      setStatus("Erro: " + (erro instanceof Error ? erro.message : String(erro)));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Carga inicial</Text>
      <Text style={styles.texto}>
        {dados.semanas.length} semanas e {dados.devocionais.length} devocionais
        no arquivo.
      </Text>

      <Pressable
        style={[styles.botao, enviando && styles.botaoDesativado]}
        onPress={enviar}
        disabled={enviando}
      >
        <Text style={styles.botaoTexto}>Enviar para o Firebase</Text>
      </Pressable>

      <Text style={styles.status}>{status}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "#ffffff",
  },
  titulo: { fontSize: 24, fontWeight: "700", color: "#1f2d3d" },
  texto: { fontSize: 16, color: "#333333" },
  botao: {
    backgroundColor: "#2f4f6f",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  botaoDesativado: { opacity: 0.5 },
  botaoTexto: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  status: { fontSize: 15, color: "#333333" },
});