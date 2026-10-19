import { useColorScheme } from 'react-native';

const claro = {
  fundo: '#F4F6F3',
  cartao: '#FFFFFF',
  texto: '#1F2A24',
  textoSuave: '#66736B',
  borda: '#E1E6E0',
  input: '#FFFFFF',
  placeholder: '#9AA5A0',
  primaria: '#2E7D32',
  primariaSuave: '#E6F2E7',
  textoPrimaria: '#FFFFFF',
  perigo: '#C62828',
  perigoSuave: '#FDECEC',
  aviso: '#B26A00',
  avisoSuave: '#FFF3E0',
};

const escuro: typeof claro = {
  fundo: '#101412',
  cartao: '#1A201C',
  texto: '#ECF1ED',
  textoSuave: '#9FB0A5',
  borda: '#2B342E',
  input: '#222A25',
  placeholder: '#6F7F75',
  primaria: '#4CAF50',
  primariaSuave: '#1F3323',
  textoPrimaria: '#0B140D',
  perigo: '#EF5350',
  perigoSuave: '#3A1E1E',
  aviso: '#FFB74D',
  avisoSuave: '#3A2E17',
};

export type Tema = typeof claro;

export function useTema(): Tema {
  return useColorScheme() === 'dark' ? escuro : claro;
}