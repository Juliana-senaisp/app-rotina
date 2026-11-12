import {
  Lora_400Regular_Italic,
  Lora_600SemiBold,
} from "@expo-google-fonts/lora";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import TelaLogin from "../componentes/TelaLogin";
import { ProgressoProvider } from "../lib/progresso";
import { useUsuario } from "../lib/useUsuario";
import { cores } from "../tema";

export default function RootLayout() {
  const [fontesProntas, erroFontes] = useFonts({
    Lora_400Regular_Italic,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const { usuario, carregando } = useUsuario();

  if (!(fontesProntas || erroFontes) || carregando) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.verdeEscuro} />
      </View>
    );
  }

  if (!usuario) {
    return (
      <>
        <StatusBar style="dark" />
        <TelaLogin />
      </>
    );
  }

  return (
    <ProgressoProvider uid={usuario.uid}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="devocional" />
      </Stack>
    </ProgressoProvider>
  );
}
