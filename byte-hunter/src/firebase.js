import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importamos la Base de Datos

// Tu configuración (La que me acabas de dar)
const firebaseConfig = {
  apiKey: "AIzaSyBX9FD1dM9ioBiSULY04xYzvsX8hXx4rSE",
  authDomain: "bytehunter-2cdc6.firebaseapp.com",
  projectId: "bytehunter-2cdc6",
  storageBucket: "bytehunter-2cdc6.firebasestorage.app",
  messagingSenderId: "68770434671",
  appId: "1:68770434671:web:21e4916fb142174373c79a"
};

// Inicializamos la app
const app = initializeApp(firebaseConfig);

// Exportamos la base de datos para usarla en el juego
export const db = getFirestore(app);