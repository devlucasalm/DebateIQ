// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signInWithRedirect,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-functions.js";


const firebaseConfig = {
  apiKey: "AIzaSyC3Z__o1Uiv-OIuFw8lOF1wPlAyY9K3e5I",
  authDomain: "debateiq-login.firebaseapp.com",
  projectId: "debateiq-login",
  storageBucket: "debateiq-login.appspot.com",
  messagingSenderId: "491263620307",
  appId: "1:491263620307:web:4f23e95760c392a0b3d026",
  measurementId: "G-E6M910EDQB"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const functions = getFunctions(app); 

provider.setCustomParameters({
  prompt: 'select_account'
});

export {
  auth,
  provider,
  signInWithPopup,
  onAuthStateChanged,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  functions,
  httpsCallable,
  getRedirectResult,
  signInWithRedirect,
  updateDoc
};