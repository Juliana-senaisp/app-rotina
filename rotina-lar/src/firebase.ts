import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
// @ts-ignore: a função existe em tempo de execução, mas nem sempre aparece nos tipos
import { getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
  // MANTENHA AQUI OS SEUS VALORES (apiKey, authDomain, projectId, ...)
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

function criarAuth() {
  try {
    return initializeAuth(app, {
      persistence:
        Platform.OS === 'web'
          ? browserLocalPersistence
          : getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Já inicializado (acontece ao recarregar o app em desenvolvimento).
    return getAuth(app);
  }
}

export const auth = criarAuth();