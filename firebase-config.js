// Los SDK de Firebase se cargan de forma diferida (dynamic import) para que
// un CDN lento o bloqueado nunca retrase el primer pintado de la app.
const CDN = "https://www.gstatic.com/firebasejs/10.9.0/";
let fb = null;

async function loadFirebaseSdk() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(CDN + "firebase-app.js"),
    import(CDN + "firebase-auth.js"),
    import(CDN + "firebase-firestore.js")
  ]);
  fb = { ...appMod, ...authMod, ...fsMod };
  return fb;
}

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

export async function initFirebaseCloud(onAuthCallback) {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY") {
    console.log("Modo local activo (localStorage).");
    return;
  }
  try {
    const { initializeApp, getAuth, getFirestore, onAuthStateChanged } = await loadFirebaseSdk();
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
  return await fb.signInWithEmailAndPassword(auth, email, password);
}

export async function registerUser(email, password) {
  if (!auth) throw new Error("Firebase no está configurado aún.");
  return await fb.createUserWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  if (!auth) return;
  return await fb.signOut(auth);
}

/* --- Lectura en tiempo real ------------------------------------------- */

export function subscribeToNucleusData(nucleusId, callback) {
  if (!db) return () => {};

  let nucleusData = null;
  let participants = [];
  const emit = () => callback(nucleusData, participants);

  const unsubNucleus = fb.onSnapshot(
    fb.doc(db, "nuclei", nucleusId),
    (snap) => { nucleusData = snap.exists() ? snap.data() : null; emit(); },
    (err) => console.error("Error leyendo el núcleo:", err)
  );

  const unsubParticipants = fb.onSnapshot(
    fb.collection(db, "nuclei", nucleusId, "participants"),
    (qs) => { participants = qs.docs.map((d) => d.data()); emit(); },
    (err) => console.error("Error leyendo los participantes:", err)
  );

  return () => { unsubNucleus(); unsubParticipants(); };
}

/* --- Escritura --------------------------------------------------------- */

export async function saveParticipantDoc(nucleusId, participant) {
  if (!db) return;
  await fb.setDoc(fb.doc(db, "nuclei", nucleusId, "participants", participant.id), participant, { merge: true });
}

export async function deleteParticipantDoc(nucleusId, participantId) {
  if (!db) return;
  await fb.deleteDoc(fb.doc(db, "nuclei", nucleusId, "participants", participantId));
}

export async function saveNucleusDoc(nucleus) {
  if (!db || !auth || !auth.currentUser) return;
  const uid = auth.currentUser.uid;

  // members vive en una subcolección, no dentro del documento.
  const { members, ...data } = nucleus;
  if (!data.ownerId) data.ownerId = uid;

  await fb.setDoc(fb.doc(db, "nuclei", nucleus.id), data, { merge: true });
  await fb.setDoc(fb.doc(db, "nuclei", nucleus.id, "members", uid),
    { uid, joinedAt: fb.serverTimestamp() }, { merge: true });
  await fb.setDoc(fb.doc(db, "users", uid, "nuclei", nucleus.id),
    { id: nucleus.id, name: data.name || "" }, { merge: true });
}

/* --- Núcleos del usuario ----------------------------------------------- */

export async function getUserNucleiList(userId) {
  if (!db) return [];
  const index = await fb.getDocs(fb.collection(db, "users", userId, "nuclei"));
  const list = [];
  for (const entry of index.docs) {
    try {
      const snap = await fb.getDoc(fb.doc(db, "nuclei", entry.id));
      if (snap.exists()) list.push(snap.data());
    } catch (err) {
      console.warn("Sin acceso al núcleo", entry.id, err);
    }
  }
  return list;
}

export async function joinNucleusByInvite(nucleusId, userId) {
  if (!db) return;
  await fb.setDoc(fb.doc(db, "nuclei", nucleusId, "members", userId),
    { uid: userId, joinedAt: fb.serverTimestamp() }, { merge: true });

  const snap = await fb.getDoc(fb.doc(db, "nuclei", nucleusId));
  const name = snap.exists() ? (snap.data().name || "Núcleo compartido") : "Núcleo compartido";
  await fb.setDoc(fb.doc(db, "users", userId, "nuclei", nucleusId),
    { id: nucleusId, name }, { merge: true });
}
