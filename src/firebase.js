import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb1ssYMluwF8v_C5jTD2TiuRTEZPg_75g",
  authDomain: "referralx-app.firebaseapp.com",
  projectId: "referralx-app",
  storageBucket: "referralx-app.firebasestorage.app",
  messagingSenderId: "1092182358189",
  appId: "1:1092182358189:web:c2f4093089d6527a9a2e24",
  measurementId: "G-T8RCGMH0DN",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);