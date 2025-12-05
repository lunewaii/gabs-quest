import { StrictMode, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCGbKgw9Yj2-DYCeX2RsgmBF2Wrw8JGQS0",
//   authDomain: "gabs-quest-353b4.firebaseapp.com",
//   projectId: "gabs-quest-353b4",
//   storageBucket: "gabs-quest-353b4.firebasestorage.app",
//   messagingSenderId: "1022253934513",
//   appId: "1:1022253934513:web:fd67daa541d4d1175eff90"
// };

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Criação do contexto Firebase
const FirebaseContext = createContext(app);

// Hook para acessar o Firebase App
export function useFirebase() {
  return useContext(FirebaseContext);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseContext.Provider value={app}>
      <App />
    </FirebaseContext.Provider>
  </StrictMode>,
)
