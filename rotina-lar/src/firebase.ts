// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);