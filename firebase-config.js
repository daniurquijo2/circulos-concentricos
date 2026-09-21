import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCeDjPgzfTUfhGSGSmOkYEqXetKkBpXlfs",
  authDomain: "circulos-concentricos.firebaseapp.com",
  projectId: "circulos-concentricos",
  storageBucket: "circulos-concentricos.firebasestorage.app",
  messagingSenderId: "28754062710",
  appId: "1:28754062710:web:83aa534d8bc1d1a8d81e57"
};

let app = null;
export let auth = null;
export let db = null;

export function initFirebaseCloud(onAuthCallback) {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY") {
    console.log("Modo local activo (localStorage).");
    return;
  }
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    onAuthStateChanged(auth, (user) => {
      if (onAuthCallback) onAuthCallback(user);
    });
  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

export async function loginUser(email, password) {
  if (!auth) throw new Error("Firebase no está configurado aún.");
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerUser(email, password) {
  if (!auth) throw new Error("Firebase no está configurado aún.");
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  if (!auth) return;
  return await signOut(auth);
}

/* --- Lectura en tiempo real ------------------------------------------- */

export function subscribeToNucleusData(nucleusId, callback) {
  if (!db) return () => {};

  let nucleusData = null;
  let participants = [];
  const emit = () => callback(nucleusData, participants);

  const unsubNucleus = onSnapshot(
    doc(db, "nuclei", nucleusId),
    (snap) => { nucleusData = snap.exists() ? snap.data() : null; emit(); },
    (err) => console.error("Error leyendo el núcleo:", err)
  );

  const unsubParticipants = onSnapshot(
    collection(db, "nuclei", nucleusId, "participants"),
    (qs) => { participants = qs.docs.map((d) => d.data()); emit(); },
    (err) => console.error("Error leyendo los participantes:", err)
  );

  return () => { unsubNucleus(); unsubParticipants(); };
}

/* --- Escritura --------------------------------------------------------- */

export async function saveParticipantDoc(nucleusId, participant) {
  if (!db) return;
  await setDoc(doc(db, "nuclei", nucleusId, "participants", participant.id), participant, { merge: true });
}

export async function deleteParticipantDoc(nucleusId, participantId) {
  if (!db) return;
  await deleteDoc(doc(db, "nuclei", nucleusId, "participants", participantId));
}

export async function saveNucleusDoc(nucleus) {
  if (!db || !auth || !auth.currentUser) return;
  const uid = auth.currentUser.uid;

  // members vive en una subcolección, no dentro del documento.
  const { members, ...data } = nucleus;
  if (!data.ownerId) data.ownerId = uid;

  await setDoc(doc(db, "nuclei", nucleus.id), data, { merge: true });
  await setDoc(doc(db, "nuclei", nucleus.id, "members", uid),
    { uid, joinedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, "users", uid, "nuclei", nucleus.id),
    { id: nucleus.id, name: data.name || "" }, { merge: true });
}

/* --- Núcleos del usuario ----------------------------------------------- */

export async function getUserNucleiList(userId) {
  if (!db) return [];
  const index = await getDocs(collection(db, "users", userId, "nuclei"));
  const list = [];
  for (const entry of index.docs) {
    try {
      const snap = await getDoc(doc(db, "nuclei", entry.id));
      if (snap.exists()) list.push(snap.data());
    } catch (err) {
      console.warn("Sin acceso al núcleo", entry.id, err);
    }
  }
  return list;
}

export async function joinNucleusByInvite(nucleusId, userId) {
  if (!db) return;
  await setDoc(doc(db, "nuclei", nucleusId, "members", userId),
    { uid: userId, joinedAt: serverTimestamp() }, { merge: true });

  const snap = await getDoc(doc(db, "nuclei", nucleusId));
  const name = snap.exists() ? (snap.data().name || "Núcleo compartido") : "Núcleo compartido";
  await setDoc(doc(db, "users", userId, "nuclei", nucleusId),
    { id: nucleusId, name }, { merge: true });
}
