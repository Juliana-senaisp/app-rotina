import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../../firebase";
import { salvarNome } from "../lib/devocional";
import { app, cores, fontes, sombra } from "../tema";
import Botao from "./Botao";

function mensagemDeErro(erro: unknown): string {
  const codigo = (erro as { code?: string })?.code ?? "";
  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com esse e-mail. Use “Entrar”.";
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/missing-password":
      return "Digite a senha.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente de novo.";
    case "auth/network-request-failed":
      return "Sem conexão com a internet.";
    default:
      return "Algo deu errado. " + (codigo || String(erro));
  }
}

export default function TelaLogin() {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    setAviso("");
    try {
      await acao();
    } catch (erro) {
      setAviso(mensagemDeErro(erro));
    } finally {
      setOcupado(false);
    }
  }

  const entrar = () =>
    executar(async () => {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    });

  // Ao criar a conta, o login é feito automaticamente. O e-mail de verificação
  // só é necessário para o acesso de administrador.
  const criarConta = () =>
    executar(async () => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      if (nome.trim()) await salvarNome(cred.user.uid, nome.trim());
      await sendEmailVerification(cred.user);
    });

  const esqueciASenha = () =>
    executar(async () => {
      if (!email.trim()) {
        setAviso("Digite o seu e-mail no campo acima.");
        return;
      }
      await sendPasswordResetEmail(auth, email.trim());
      setAviso("Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.");
    });

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.marca}>
            <View style={estilos.icone}>
              <Ionicons name="leaf-outline" size={40} color={cores.verdeEscuro} />
            </View>
            <Text style={estilos.nome}>{app.nome}</Text>
            <Text style={estilos.frase}>{app.frase}</Text>
          </View>

          <View style={estilos.cartao}>
            <Text style={estilos.subtitulo}>{criando ? "Criar conta" : "Entrar"}</Text>

            {criando && (
              <TextInput
                style={estilos.campo}
                placeholder="Seu nome"
                placeholderTextColor={cores.textoSuave}
                autoCapitalize="words"
                value={nome}
                onChangeText={setNome}
              />
            )}
            <TextInput
              style={estilos.campo}
              placeholder="E-mail"
              placeholderTextColor={cores.textoSuave}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={estilos.campo}
              placeholder="Senha (mínimo 6 caracteres)"
              placeholderTextColor={cores.textoSuave}
              autoCapitalize="none"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />

            <Botao
              texto={criando ? "Criar conta" : "Entrar"}
              onPress={criando ? criarConta : entrar}
              desativado={ocupado}
            />

            <Pressable
              onPress={() => {
                setCriando((v) => !v);
                setAviso("");
              }}
              disabled={ocupado}
            >
              <Text style={estilos.link}>
                {criando ? "Já tenho conta" : "Criar uma conta"}
              </Text>
            </Pressable>
            {!criando && (
              <Pressable onPress={esqueciASenha} disabled={ocupado}>
                <Text style={estilos.linkSuave}>Esqueci a senha</Text>
              </Pressable>
            )}

            {!!aviso && <Text style={estilos.aviso}>{aviso}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 28 },
  marca: { alignItems: "center", gap: 10 },
  icone: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: cores.verdeClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  nome: { fontFamily: fontes.titulo, fontSize: 32, color: cores.texto },
  frase: {
    fontFamily: fontes.corpo,
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: "center",
  },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    ...sombra,
  },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
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
  link: {
    fontFamily: fontes.corpoNegrito,
    color: cores.verdeEscuro,
    textAlign: "center",
    fontSize: 15,
    paddingVertical: 4,
  },
  linkSuave: {
    fontFamily: fontes.corpo,
    color: cores.textoSuave,
    textAlign: "center",
    fontSize: 14,
  },
  aviso: { fontFamily: fontes.corpo, fontSize: 14, color: cores.aviso, textAlign: "center" },
});
