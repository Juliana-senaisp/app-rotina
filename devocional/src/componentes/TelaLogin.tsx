import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../../firebase";
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

  // Ao criar a conta, o login é feito automaticamente e um e-mail de
  // verificação é enviado (necessário apenas para o acesso de administrador).
  const criarConta = () =>
    executar(async () => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Devocional</Text>

      <TextInput
        style={styles.campo}
        placeholder="E-mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.campo}
        placeholder="Senha (mínimo 6 caracteres)"
        autoCapitalize="none"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <Botao texto="Entrar" onPress={entrar} desativado={ocupado} />
      <Botao texto="Criar conta" onPress={criarConta} desativado={ocupado} secundario />
      <Pressable onPress={esqueciASenha} disabled={ocupado}>
        <Text style={styles.link}>Esqueci a senha</Text>
      </Pressable>

      {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: "#ffffff",
  },
  titulo: { fontSize: 26, fontWeight: "700", color: "#1f2d3d", marginBottom: 8 },
  campo: {
    borderWidth: 1,
    borderColor: "#c9d1d9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2d3d",
  },
  link: { color: "#2f4f6f", textAlign: "center", fontSize: 15, paddingVertical: 4 },
  aviso: { fontSize: 15, color: "#8a3b12" },
});
