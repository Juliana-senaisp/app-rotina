import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { dataLocal } from "../lib/datas";
import { cores, fontes, sombra } from "../tema";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  concluidos: Set<string>; // datas "aaaa-mm-dd" com devocional feito
  primeira: string | null; // data da primeira conclusão
  hoje: string;
};

export default function Calendario({ concluidos, primeira, hoje }: Props) {
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);
  const [ref, setRef] = useState({ ano: anoHoje, mes: mesHoje - 1 });

  const primeiroDiaDaSemana = new Date(ref.ano, ref.mes, 1).getDay(); // 0 = domingo
  const totalDias = new Date(ref.ano, ref.mes + 1, 0).getDate();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaDaSemana; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

  const linhas: (number | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));

  function mover(delta: number) {
    setRef((r) => {
      const d = new Date(r.ano, r.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  return (
    <View style={estilos.cartao}>
      <View style={estilos.cabecalho}>
        <Pressable onPress={() => mover(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={cores.verdeEscuro} />
        </Pressable>
        <Text style={estilos.mes}>
          {MESES[ref.mes]} de {ref.ano}
        </Text>
        <Pressable onPress={() => mover(1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={cores.verdeEscuro} />
        </Pressable>
      </View>

      <View style={estilos.linha}>
        {DIAS_SEMANA.map((d, i) => (
          <Text key={i} style={estilos.diaSemana}>
            {d}
          </Text>
        ))}
      </View>

      {linhas.map((linha, i) => (
        <View key={i} style={estilos.linha}>
          {linha.map((dia, j) => {
            if (dia === null) return <View key={j} style={estilos.celula} />;
            const data = dataLocal(new Date(ref.ano, ref.mes, dia));
            const feito = concluidos.has(data);
            const ehHoje = data === hoje;
            const perdido = !feito && primeira !== null && data >= primeira && data < hoje;
            return (
              <View key={j} style={estilos.celula}>
                <View
                  style={[
                    estilos.bolinha,
                    feito && estilos.feito,
                    perdido && estilos.perdido,
                    ehHoje && estilos.hoje,
                  ]}
                >
                  <Text style={[estilos.numero, feito && estilos.numeroFeito]}>{dia}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View style={estilos.legenda}>
        <Legenda cor={cores.verde} texto="Feito" />
        <Legenda cor={cores.pessego} texto="Não feito" />
        <Legenda cor="transparent" borda={cores.verde} texto="Hoje" />
      </View>
    </View>
  );
}

function Legenda({ cor, texto, borda }: { cor: string; texto: string; borda?: string }) {
  return (
    <View style={estilos.itemLegenda}>
      <View
        style={[
          estilos.marca,
          { backgroundColor: cor },
          borda ? { borderWidth: 1.5, borderColor: borda } : null,
        ]}
      />
      <Text style={estilos.textoLegenda}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    ...sombra,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mes: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.texto,
    textTransform: "capitalize",
  },
  linha: { flexDirection: "row" },
  diaSemana: {
    flex: 1,
    textAlign: "center",
    fontFamily: fontes.corpoNegrito,
    fontSize: 12,
    color: cores.textoSuave,
    paddingBottom: 4,
  },
  celula: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  bolinha: {
    width: "82%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  feito: { backgroundColor: cores.verde },
  perdido: { backgroundColor: cores.pessego },
  hoje: { borderColor: cores.verdeEscuro },
  numero: { fontFamily: fontes.corpoMedio, fontSize: 14, color: cores.texto },
  numeroFeito: { color: "#FFFFFF", fontFamily: fontes.corpoNegrito },
  legenda: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 10 },
  itemLegenda: { flexDirection: "row", alignItems: "center", gap: 6 },
  marca: { width: 14, height: 14, borderRadius: 999 },
  textoLegenda: { fontFamily: fontes.corpo, fontSize: 12, color: cores.textoSuave },
});
