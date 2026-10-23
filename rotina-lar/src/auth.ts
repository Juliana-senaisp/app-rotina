import { useEffect, useState } from 'react';
import {
  onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User,
} from 'firebase/auth';
import { auth } from './firebase';

export function useUsuario() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUsuario(u);
      setCarregando(false);
    });
  }, []);

  return { usuario, carregando };
}

export async function entrar(email: string, senha: string) {
  await signInWithEmailAndPassword(auth, email.trim(), senha);
}

export function sair() {
  return signOut(auth);
}

export async function enviarRedefinicao(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export function mensagemDeErro(e: any): string {
  switch (e?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    case 'auth/operation-not-allowed':
      return 'O login por e-mail e senha não está ativado no Firebase.';
    default:
      return `Não foi possível concluir: ${e?.message ?? e}`;
  }
}