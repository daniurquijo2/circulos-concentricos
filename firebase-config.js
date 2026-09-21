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
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  getDocs, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

let app = null;
export let auth = null;
export let db = null;

export function initFirebaseCloud(onAuthCallback) {
  if (firebaseConfig.apiKey === "TU_API_KEY") {
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

export function subscribeToNucleusData(nucleusId, callback) {
  if (!db) return () => {};

  const nucleusRef = doc(db, "nuclei", nucleusId);
  const unsubNucleus = onSnapshot(nucleusRef, (docSnap) => {
    let nucleusData = null;
    if (docSnap.exists()) nucleusData = docSnap.data();
    
    const participantsCol = collection(db, "nuclei", nucleusId, "participants");
    const unsubParticipants = onSnapshot(participantsCol, (querySnap) => {
      const participants = [];
      querySnap.forEach((d) => participants.push(d.data()));
      callback(nucleusData, participants);
    });
  });

  return () => unsubNucleus();
}

export async function saveParticipantDoc(nucleusId, participant) {
  if (!db) return;
  const ref = doc(db, "nuclei", nucleusId, "participants", participant.id);
  await setDoc(ref, participant, { merge: true });
}

export async function deleteParticipantDoc(nucleusId, participantId) {
  if (!db) return;
  const ref = doc(db, "nuclei", nucleusId, "participants", participantId);
  await deleteDoc(ref);
}

export async function saveNucleusDoc(nucleus) {
  if (!db) return;
  const ref = doc(db, "nuclei", nucleus.id);
  await setDoc(ref, nucleus, { merge: true });
}

export async function getUserNucleiList(userId) {
  if (!db) return [];
  const q = query(collection(db, "nuclei"), where("members", "array-contains", userId));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach(d => list.push(d.data()));
  return list;
}

export async function joinNucleusByInvite(nucleusId, userId) {
  if (!db) return;
  const ref = doc(db, "nuclei", nucleusId);
  await setDoc(ref, { members: [userId] }, { merge: true });
}
