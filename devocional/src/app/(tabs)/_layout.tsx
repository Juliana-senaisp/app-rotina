import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { cores, fontes } from "../../tema";

type NomeIcone = ComponentProps<typeof Ionicons>["name"];

function icone(ativo: NomeIcone, inativo: NomeIcone) {
  return function Icone({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return <Ionicons name={focused ? ativo : inativo} size={size} color={color} />;
  };
}

export default function AbasLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.verdeEscuro,
        tabBarInactiveTintColor: "#9A978D",
        tabBarStyle: { backgroundColor: cores.fundo, borderTopColor: cores.borda },
        tabBarLabelStyle: { fontFamily: fontes.corpoMedio, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: icone("home", "home-outline") }} />
      <Tabs.Screen name="jornada" options={{ title: "Jornada", tabBarIcon: icone("calendar", "calendar-outline") }} />
      <Tabs.Screen name="mais" options={{ title: "Mais", tabBarIcon: icone("menu", "menu-outline") }} />
    </Tabs>
  );
}
