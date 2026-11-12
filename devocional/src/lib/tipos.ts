export type Devocional = {
  id: string;
  semana: number;
  dia: number;
  ordem: number;
  titulo: string;
  versiculoRef: string;
  versiculoTexto: string;
  passagemRef: string;
  reflexao: string;
  fraseChave: string;
  perguntas: string[];
  louvor: { titulo: string; artista: string; link: string };
  hino: string;
  oracao: string;
};

export type Semana = {
  numero: number;
  tema: string;
  descricao: string;
};

export type EstadoUsuario = {
  ordemAtual: number; // próximo devocional a ser feito (1 a 364)
  ultimaConclusaoData: string | null; // "aaaa-mm-dd" (data local do celular)
  ofensiva: number;
  melhorOfensiva: number;
};

export const ESTADO_INICIAL: EstadoUsuario = {
  ordemAtual: 1,
  ultimaConclusaoData: null,
  ofensiva: 0,
  melhorOfensiva: 0,
};
