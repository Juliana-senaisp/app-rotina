// Identidade visual do app (baseada no protótipo). Para mudar o nome, as cores
// ou as fontes, altere apenas este arquivo.
export const app = {
  nome: "Devocional",
  frase: "Um momento de paz e reflexão a cada dia.",
};

export const cores = {
  fundo: "#FAF7F1",
  cartao: "#FFFDF9",
  verde: "#899C8E",
  verdeEscuro: "#72897C",
  verdeClaro: "#ECEFE9",
  pessego: "#FAECE6",
  ambar: "#FDF1DE",
  texto: "#2B2B28",
  textoSuave: "#6B6B64",
  borda: "#E8E2D8",
  aviso: "#A4532F",
  chama: "#C8742E",
};

export const fontes = {
  titulo: "Lora_600SemiBold",
  citacao: "Lora_400Regular_Italic",
  corpo: "Nunito_400Regular",
  corpoMedio: "Nunito_600SemiBold",
  corpoNegrito: "Nunito_700Bold",
};

export const sombra = {
  shadowColor: "#000000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export function saudacao(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
