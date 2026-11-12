import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";

import { auth } from "../../firebase";
import Botao from "../componentes/Botao";
import { dataLocal } from "../lib/datas";
import {
  carregarDevocional,
  carregarEstado,
  carregarSemana,
  concluirDevocional,
  ofensivaAtual,
} from "../lib/devocional";
import { ESTADO_INICIAL, type Devocional, type EstadoUsuario, type Semana } from "../lib/tipos";

export default function Hoje() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState<EstadoUsuario>(ESTADO_INICIAL);
  const [devocional, setDevocional] = useState<Devocional | null>(null);
  const [semana, setSemana] = useState<Semana | null>(null);
  const [respostas, setRespostas] = useState<string[]>([]);
  const idAtual = useRef<string | null>(null);

  const carregar = useCallback(async (silencioso = false) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!silencioso) setCarregando(true);
    setErro("");
    try {
      const est = await carregarEstado(uid);
      const dev = await carregarDevocional(est.ordemAtual);
      const sem = dev ? await carregarSemana(dev.semana) : null;

      setEstado(est);
      setDevocional(dev);
      setSemana(sem);
      // Só zera as respostas quando o devocional muda.
      if ((dev?.id ?? null) !== idAtual.current) {
        idAtual.current = dev?.id ?? null;
        setRespostas(dev ? dev.perguntas.map(() => "") : []);
      }
    } catch {
      setErro("Não foi possível carregar. Verifique a conexão e tente de novo.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Ao voltar para o app (por exemplo, no dia seguinte), atualiza a tela.
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", (s) => {
      if (s === "active") carregar(true);
    });
    return () => assinatura.remove();
  }, [carregar]);

  async function concluir() {
    const uid = auth.currentUser?.uid;
    if (!uid || !devocional) return;
    setSalvando(true);
    setErro("");
    try {
      await concluirDevocional(uid, devocional, respostas.map((r) => r.trim()));
      await carregar(true);
    } catch (e) {
      if (e instanceof Error && e.message === "JA_CONCLUIDO") {
        await carregar(true);
      } else {
        setErro("Não foi possível salvar. Verifique a conexão e tente de novo.");
      }
    } finally {
      setSalvando(false);
    }
  }

  function abrirLouvor() {
    if (!devocional?.louvor.link) return;
    Linking.openURL(devocional.louvor.link).catch(() =>
      setErro("Não foi possível abrir o link do louvor.")
    );
  }

  const hoje = dataLocal();
  const ofensiva = ofensivaAtual(estado, hoje);
  const concluidoHoje =
    estado.ultimaConclusaoData !== null && estado.ultimaConclusaoData >= hoje;

  if (carregando) {
    return (
      <SafeAreaView style={styles.centro}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (erro && !devocional && !concluidoHoje) {
    return (
      <SafeAreaView style={styles.centro}>
        <Text style={styles.aviso}>{erro}</Text>
        <Botao texto="Tentar de novo" onPress={() => carregar()} />
      </SafeAreaView>
    );
  }

  if (concluidoHoje) {
    return (
      <SafeAreaView style={styles.centro}>
        <Text style={styles.titulo}>Devocional de hoje concluído</Text>
        <Text style={styles.ofensivaGrande}>
          🔥 {ofensiva} {ofensiva === 1 ? "dia" : "dias"} seguidos
        </Text>
        <Text style={styles.texto}>O próximo devocional será liberado amanhã.</Text>
        <Pressable onPress={() => signOut(auth)}>
          <Text style={styles.link}>Sair</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!devocional) {
    return (
      <SafeAreaView style={styles.centro}>
        <Text style={styles.titulo}>Você concluiu todos os devocionais cadastrados</Text>
        <Text style={styles.texto}>Novos conteúdos serão adicionados em breve.</Text>
        <Pressable onPress={() => signOut(auth)}>
          <Text style={styles.link}>Sair</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.topo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.semana}>
              Semana {devocional.semana}
              {semana ? ` · ${semana.tema}` : ""}
            </Text>
            <Text style={styles.dia}>Dia {devocional.dia} de 7</Text>
          </View>
          <Text style={styles.ofensiva}>🔥 {ofensiva}</Text>
        </View>

        <Text style={styles.titulo}>{devocional.titulo}</Text>

        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Versículo do dia</Text>
          <Text style={styles.versiculo}>{devocional.versiculoTexto}</Text>
          <Text style={styles.referencia}>{devocional.versiculoRef}</Text>
        </View>

        <Text style={styles.rotulo}>Reflexão · {devocional.passagemRef}</Text>
        <Text style={styles.texto}>{devocional.reflexao}</Text>
        {!!devocional.fraseChave && (
          <Text style={styles.fraseChave}>“{devocional.fraseChave}”</Text>
        )}

        <Text style={styles.rotulo}>Perguntas</Text>
        {devocional.perguntas.map((pergunta, i) => (
          <View key={i} style={styles.bloco}>
            <Text style={styles.pergunta}>{pergunta}</Text>
            <TextInput
              style={styles.resposta}
              multiline
              placeholder="Escreva sua resposta"
              textAlignVertical="top"
              value={respostas[i] ?? ""}
              onChangeText={(t) =>
                setRespostas((atual) => atual.map((r, j) => (j === i ? t : r)))
              }
            />
          </View>
        ))}

        <Text style={styles.rotulo}>Louvor</Text>
        <Botao
          secundario
          texto={`Ouvir: ${devocional.louvor.titulo} – ${devocional.louvor.artista}`}
          onPress={abrirLouvor}
        />
        {!!devocional.hino && (
          <Text style={styles.texto}>Hino da Harpa Cristã: {devocional.hino}</Text>
        )}

        <Text style={styles.rotulo}>Oração</Text>
        <Text style={styles.texto}>{devocional.oracao}</Text>

        {!!erro && <Text style={styles.aviso}>{erro}</Text>}
        <Botao
          texto={salvando ? "Salvando..." : "Marcar como feito"}
          onPress={concluir}
          desativado={salvando}
        />

        <Pressable onPress={() => signOut(auth)}>
          <Text style={styles.link}>Sair</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#ffffff" },
  centro: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "#ffffff",
  },
  conteudo: { padding: 20, gap: 12 },
  topo: { flexDirection: "row", alignItems: "center", gap: 12 },
  semana: { fontSize: 14, fontWeight: "600", color: "#2f4f6f" },
  dia: { fontSize: 13, color: "#667085" },
  ofensiva: { fontSize: 20, fontWeight: "700", color: "#b4531a" },
  ofensivaGrande: { fontSize: 24, fontWeight: "700", color: "#b4531a" },
  titulo: { fontSize: 24, fontWeight: "700", color: "#1f2d3d" },
  cartao: {
    backgroundColor: "#eef3f8",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2f4f6f",
    textTransform: "uppercase",
    marginTop: 8,
  },
  versiculo: { fontSize: 18, lineHeight: 26, color: "#1f2d3d" },
  referencia: { fontSize: 14, fontWeight: "600", color: "#2f4f6f" },
  texto: { fontSize: 16, lineHeight: 24, color: "#333333" },
  fraseChave: { fontSize: 16, fontStyle: "italic", color: "#2f4f6f" },
  bloco: { gap: 8 },
  pergunta: { fontSize: 16, fontWeight: "600", color: "#1f2d3d" },
  resposta: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#c9d1d9",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#1f2d3d",
  },
  aviso: { fontSize: 15, color: "#8a3b12" },
  link: { color: "#2f4f6f", textAlign: "center", fontSize: 15, paddingVertical: 8 },
});
