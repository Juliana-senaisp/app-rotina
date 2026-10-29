import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACNP9Jy0GJlNL3JOJY9rVYeRU1AkGlxhM",
  authDomain: "devocional-62f75.firebaseapp.com",
  projectId: "devocional-62f75",
  storageBucket: "devocional-62f75.firebasestorage.app",
  messagingSenderId: "336201070920",
  appId: "1:336201070920:web:c80557bf23fa0b55ce5b7d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);