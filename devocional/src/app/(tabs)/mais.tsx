import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../../../firebase";
import Botao from "../../componentes/Botao";
import { useProgresso } from "../../lib/progresso";
import { cores, fontes, sombra } from "../../tema";

export default function Mais() {
  const { estado, atualizarNome } = useProgresso();
  const email = auth.currentUser?.email ?? "";
  const [nome, setNome] = useState(estado.nome);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    setNome(estado.nome);
  }, [estado.nome]);

  async function salvar() {
    setSalvando(true);
    setAviso("");
    try {
      await atualizarNome(nome);
      setAviso("Nome salvo.");
    } catch {
      setAviso("Não foi possível salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  }

  const inicial = (estado.nome || email).charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={["top"]} style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>Mais</Text>

        <View style={estilos.perfil}>
          <View style={estilos.avatar}>
            <Text style={estilos.inicial}>{inicial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.nome}>{estado.nome || "Sem nome"}</Text>
            <Text style={estilos.email}>{email}</Text>
          </View>
        </View>

        <View style={estilos.cartao}>
          <Text style={estilos.rotulo}>Seu nome</Text>
          <TextInput
            style={estilos.campo}
            placeholder="Como você quer ser chamado(a)"
            placeholderTextColor={cores.textoSuave}
            autoCapitalize="words"
            value={nome}
            onChangeText={setNome}
          />
          <Botao
            secundario
            texto={salvando ? "Salvando..." : "Salvar nome"}
            onPress={salvar}
            desativado={salvando || nome.trim() === estado.nome}
          />
          {!!aviso && <Text style={estilos.aviso}>{aviso}</Text>}
        </View>

        <Pressable style={estilos.linha} onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={22} color={cores.verdeEscuro} />
          <Text style={estilos.linhaTexto}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 20, gap: 16 },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, color: cores.texto },
  perfil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: cores.cartao,
    borderRadius: 18,
    padding: 16,
    ...sombra,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: cores.verdeClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  inicial: { fontFamily: fontes.titulo, fontSize: 22, color: cores.verdeEscuro },
  nome: { fontFamily: fontes.corpoNegrito, fontSize: 17, color: cores.texto },
  email: { fontFamily: fontes.corpo, fontSize: 14, color: cores.textoSuave },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    ...sombra,
  },
  rotulo: {
    fontFamily: fontes.corpoNegrito,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: cores.verdeEscuro,
  },
  campo: {
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: fontes.corpo,
    fontSize: 16,
    color: cores.texto,
  },
  aviso: { fontFamily: fontes.corpo, fontSize: 14, color: cores.textoSuave },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 16,
    ...sombra,
  },
  linhaTexto: { fontFamily: fontes.corpoMedio, fontSize: 16, color: cores.texto },
});
