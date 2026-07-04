import { initializeApp, deleteApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  Timestamp,
  increment
} from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0505714105",
  appId: "1:108589670013:web:49bcfd9539fc8772d05b14",
  apiKey: "AIzaSyCu7tcEqr_5pJBi8ccGrhTSgPm_8XJKjtQ",
  authDomain: "gen-lang-client-0505714105.firebaseapp.com",
  storageBucket: "gen-lang-client-0505714105.firebasestorage.app",
  messagingSenderId: "108589670013"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

// Enable Offline Caching (IndexedDB Persistence)
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore offline persistence enabled successfully.");
    })
    .catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Firestore persistence failed-precondition: Multiple tabs open?");
      } else if (err.code === "unimplemented") {
        console.warn("Firestore persistence unimplemented: Browser does not support IndexedDB.");
      }
    });
}

export async function createAuthUserWithoutLoggingOut(email: string, pass: string) {
  const tempAppName = `TempApp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);
  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, email, pass);
    return cred.user;
  } finally {
    await deleteApp(tempApp);
  }
}

export {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  Timestamp,
  increment
};
export type { User };
