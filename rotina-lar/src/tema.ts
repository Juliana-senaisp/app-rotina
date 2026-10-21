import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const claro = {
  fundo: '#FFF9F2',
  cartao: '#FFFFFF',
  texto: '#2F2A2E',
  textoSuave: '#7B7078',
  borda: '#F0E4DA',
  input: '#FFFDFA',
  placeholder: '#AFA3A9',
  primaria: '#A65B73',
  primariaSuave: '#FBE8EE',
  textoPrimaria: '#FFFFFF',
  destaque: '#3A363A',
  textoDestaque: '#FFFFFF',
  sucesso: '#3F7D5E',
  sucessoSuave: '#E3F1EA',
  lavanda: '#6F62A8',
  lavandaSuave: '#ECE8F8',
  pessego: '#B5643A',
  pessegoSuave: '#FDE9DC',
  perigo: '#C4443F',
  perigoSuave: '#FDECEA',
  aviso: '#A8741A',
  avisoSuave: '#FFF1D6',
};

const escuro: typeof claro = {
  fundo: '#1B1719',
  cartao: '#262023',
  texto: '#F3ECEF',
  textoSuave: '#B3A6AD',
  borda: '#3A3135',
  input: '#2E2729',
  placeholder: '#857A80',
  primaria: '#E08CA6',
  primariaSuave: '#3C2630',
  textoPrimaria: '#2A1520',
  destaque: '#F3ECEF',
  textoDestaque: '#1B1719',
  sucesso: '#7FC4A0',
  sucessoSuave: '#203329',
  lavanda: '#B8ABEB',
  lavandaSuave: '#2D2842',
  pessego: '#F0A57B',
  pessegoSuave: '#3B2A20',
  perigo: '#EF7B78',
  perigoSuave: '#3C2222',
  aviso: '#FFC46B',
  avisoSuave: '#3B2E17',
};

export type Tema = typeof claro;
export type ModoTema = 'claro' | 'escuro';

const CHAVE = 'tema-preferido';
let modo: ModoTema = 'claro';
const ouvintes = new Set<() => void>();

function definir(novo: ModoTema) {
  if (novo === modo) return;
  modo = novo;
  ouvintes.forEach(avisar => avisar());
}

// Ao abrir o app, recupera a escolha salva (se houver).
AsyncStorage.getItem(CHAVE)
  .then(valor => {
    if (valor === 'claro' || valor === 'escuro') definir(valor);
  })
  .catch(() => {});

export function alternarTema() {
  const novo: ModoTema = modo === 'claro' ? 'escuro' : 'claro';
  definir(novo);
  AsyncStorage.setItem(CHAVE, novo).catch(() => {});
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

function ler() {
  return modo;
}

export function useModoTema(): ModoTema {
  return useSyncExternalStore(assinar, ler, ler);
}

export function useTema(): Tema {
  return useModoTema() === 'escuro' ? escuro : claro;
}