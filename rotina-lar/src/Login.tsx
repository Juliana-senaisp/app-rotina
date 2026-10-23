import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { entrar, enviarRedefinicao, mensagemDeErro } from './auth';
import { useTema, type Tema } from './tema';

export default function Login() {
  const c = useTema();
  const s = useMemo(() => criarEstilos(c), [c]);
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  async function aoEntrar() {
    if (ocupado) return;
    if (!email.trim() || !senha) {
      setMensagem({ texto: 'Informe o e-mail e a senha.', erro: true });
      return;
    }
    setOcupado(true);
    setMensagem(null);
    try {
      await entrar(email, senha);
      // Ao entrar, o app troca de tela sozinho.
    } catch (e: any) {
      console.error('Erro no login:', e);
      setMensagem({ texto: mensagemDeErro(e), erro: true });
      setOcupado(false);
    }
  }

  async function aoEsquecer() {
    if (!email.trim()) {
      setMensagem({ texto: 'Digite seu e-mail para receber o link de redefinição.', erro: true });
      return;
    }
    try {
      await enviarRedefinicao(email);
      setMensagem({
        texto: 'Enviamos um e-mail para redefinir a senha. Confira também o spam.',
        erro: false,
      });
    } catch (e: any) {
      console.error('Erro ao redefinir senha:', e);
      setMensagem({ texto: mensagemDeErro(e), erro: true });
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.fundo }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.logo}>
        <Ionicons name="home" size={32} color={c.primaria} />
      </View>
      <Text style={s.titulo}>Rotina do Lar</Text>
      <Text style={s.suave}>Entre para acessar seus dados.</Text>

      <View style={s.painel}>
        <TextInput
          style={s.input}
          placeholder="E-mail"
          placeholderTextColor={c.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
        />
        <View style={s.campoSenha}>
          <TextInput
            style={[s.input, s.inputSenha]}
            placeholder="Senha"
            placeholderTextColor={c.placeholder}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!mostrarSenha}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            onSubmitEditing={aoEntrar}
            returnKeyType="done"
          />
          <Pressable style={s.olho} onPress={() => setMostrarSenha(!mostrarSenha)} hitSlop={8}>
            <Ionicons
              name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={c.textoSuave}
            />
          </Pressable>
        </View>

        {mensagem ? (
          <Text style={[s.banner, mensagem.erro ? s.bannerErro : s.bannerOk]}>
            {mensagem.texto}
          </Text>
        ) : null}

        <Pressable style={[s.botao, ocupado && s.desabilitado]} onPress={aoEntrar} disabled={ocupado}>
          <Text style={s.botaoTexto}>{ocupado ? 'Entrando...' : 'Entrar'}</Text>
        </Pressable>

        <Pressable onPress={aoEsquecer}>
          <Text style={s.link}>Esqueci minha senha</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function criarEstilos(c: Tema) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 24, gap: 10, justifyContent: 'center' },
    logo: {
      width: 72, height: 72, borderRadius: 24, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primariaSuave,
      borderWidth: 1, borderColor: c.borda, alignSelf: 'center',
    },
    titulo: { fontSize: 26, fontWeight: '800', color: c.texto, textAlign: 'center' },
    suave: { color: c.textoSuave, textAlign: 'center', marginBottom: 8 },
    painel: {
      backgroundColor: c.cartao, borderWidth: 1, borderColor: c.borda,
      borderRadius: 18, padding: 18, gap: 12,
    },
    input: {
      borderWidth: 1, borderColor: c.borda, backgroundColor: c.input,
      color: c.texto, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    },
    campoSenha: { justifyContent: 'center' },
    inputSenha: { paddingRight: 44 },
    olho: { position: 'absolute', right: 12 },
    banner: { padding: 10, borderRadius: 10, fontWeight: '600', overflow: 'hidden' },
    bannerOk: { backgroundColor: c.primariaSuave, color: c.primaria },
    bannerErro: { backgroundColor: c.perigoSuave, color: c.perigo },
    botao: { backgroundColor: c.destaque, padding: 14, borderRadius: 12, alignItems: 'center' },
    desabilitado: { opacity: 0.6 },
    botaoTexto: { color: c.textoDestaque, fontWeight: '700' },
    link: { color: c.primaria, fontWeight: '700', textAlign: 'center' },
  });
}