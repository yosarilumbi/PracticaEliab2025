import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAMj9TdNGAntat31NUN5LoRospKI8DYNeA",
  authDomain: "practicaeliab3.firebaseapp.com",
  projectId: "practicaeliab3",
  storageBucket: "practicaeliab3.firebasestorage.app",
  messagingSenderId: "1034599652226",
  appId: "1:1034599652226:web:e49e880b033f49f48f4d9b",
  measurementId: "G-DH3M24JK6D"
};

// Inicializar Firebase
const appfirebase = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(appfirebase);

// Inicializar Auth
const auth = getAuth(appfirebase);

export { appfirebase, db, auth };
