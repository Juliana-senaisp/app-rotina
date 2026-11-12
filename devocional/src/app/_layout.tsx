import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import TelaLogin from "../componentes/TelaLogin";
import { useUsuario } from "../lib/useUsuario";

export default function RootLayout() {
  const { usuario, carregando } = useUsuario();

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#ffffff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!usuario) return <TelaLogin />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
