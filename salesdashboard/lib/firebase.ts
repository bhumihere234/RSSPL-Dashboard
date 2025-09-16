// Firebase client setup for Next.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrVYC4DKFbZ5UPNkhQWySSwATqiWiTYL4",
  authDomain: "rockersolardashboard.firebaseapp.com",
  projectId: "rockersolardashboard",
  storageBucket: "rockersolardashboard.firebasestorage.app",
  messagingSenderId: "274964107148",
  appId: "1:274964107148:web:4073c2a342333b7c9110a9",
  measurementId: "G-56JK3KHSZZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, app };
