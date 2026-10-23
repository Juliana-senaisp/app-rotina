import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
// @ts-ignore: a função existe em tempo de execução, mas nem sempre aparece nos tipos
import { getReactNativePersistence } from 'firebase/auth';
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbNJT-_P6MlrIs1TLVTBhSHxfExSQr7Gg",
  authDomain: "rotina-app-23370.firebaseapp.com",
  projectId: "rotina-app-23370",
  storageBucket: "rotina-app-23370.firebasestorage.app",
  messagingSenderId: "1019092833587",
  appId: "1:1019092833587:web:624aaa7d25885492c95a46",
  measurementId: "G-KKFEB7294G"
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