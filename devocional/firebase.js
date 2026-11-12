import { initializeApp, getApps, getApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyACNP9Jy0GJlNL3JOJY9rVYeRU1AkGlxhM",
  authDomain: "devocional-62f75.firebaseapp.com",
  projectId: "devocional-62f75",
  storageBucket: "devocional-62f75.firebasestorage.app",
  messagingSenderId: "336201070920",
  appId: "1:336201070920:web:c80557bf23fa0b55ce5b7d"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = FirebaseAuth.initializeAuth(app, {
    persistence: FirebaseAuth.getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = FirebaseAuth.getAuth(app);
}
auth.languageCode = "pt-BR";

export { auth };
export const db = getFirestore(app);