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

/* --- Cuentas: correo + nombre de usuario ------------------------------ */
// usernames/{nombre}  → { uid, email, username }  (para entrar con el usuario)
// profiles/{uid}      → { username }              (para mostrar quién es quién)

export const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

export function normalizeUsername(name) {
  return String(name || '').trim().replace(/^@/, '').toLowerCase();
}

export async function isUsernameAvailable(username) {
  if (!db) throw new Error("Firebase no está configurado aún.");
  const snap = await fb.getDoc(fb.doc(db, "usernames", normalizeUsername(username)));
  return !snap.exists();
}

// Entrar con correo o con nombre de usuario
export async function loginUser(identifier, password) {
  if (!auth) throw new Error("Firebase no está configurado aún.");
  let email = String(identifier || '').trim();
  if (!email.includes('@')) {
    const snap = await fb.getDoc(fb.doc(db, "usernames", normalizeUsername(email)));
    if (!snap.exists()) {
      const err = new Error("No existe ninguna cuenta con ese nombre de usuario.");
      err.code = "app/username-not-found";
      throw err;
    }
    email = snap.data().email;
  }
  return await fb.signInWithEmailAndPassword(auth, email, password);
}

// Reserva el nombre de usuario para la cuenta con sesión iniciada
export async function claimUsername(username) {
  if (!db || !auth || !auth.currentUser) throw new Error("Inicia sesión primero.");
  const name = normalizeUsername(username);
  if (!USERNAME_RE.test(name)) {
    const err = new Error("El usuario debe tener de 3 a 20 caracteres: letras minúsculas, números, punto o guion bajo.");
    err.code = "app/username-invalid";
    throw err;
  }
  const user = auth.currentUser;
  const nameRef = fb.doc(db, "usernames", name);
  const profileRef = fb.doc(db, "profiles", user.uid);
  await fb.runTransaction(db, async (tx) => {
    const taken = await tx.get(nameRef);
    if (taken.exists() && taken.data().uid !== user.uid) {
      const err = new Error("Ese nombre de usuario ya está cogido.");
      err.code = "app/username-taken";
      throw err;
    }
    if (!taken.exists()) tx.set(nameRef, { uid: user.uid, email: user.email, username: name });
    tx.set(profileRef, { username: name });
  });
  return name;
}

export async function registerUser(email, username, password) {
  if (!auth) throw new Error("Firebase no está configurado aún.");
  const name = normalizeUsername(username);
  if (!USERNAME_RE.test(name)) {
    const err = new Error("El usuario debe tener de 3 a 20 caracteres: letras minúsculas, números, punto o guion bajo.");
    err.code = "app/username-invalid";
    throw err;
  }
  if (!(await isUsernameAvailable(name))) {
    const err = new Error("Ese nombre de usuario ya está cogido.");
    err.code = "app/username-taken";
    throw err;
  }
  const cred = await fb.createUserWithEmailAndPassword(auth, email, password);
  try {
    await claimUsername(name);
  } catch (err) {
    // si alguien se lo llevó justo a la vez, deshacemos la cuenta recién creada
    try { await fb.deleteUser(cred.user); } catch (_) {}
    throw err;
  }
  return { cred, username: name };
}

export async function getUsernameOf(uid) {
  if (!db) return null;
  try {
    const snap = await fb.getDoc(fb.doc(db, "profiles", uid));
    return snap.exists() ? snap.data().username || null : null;
  } catch (err) {
    console.warn("No se pudo leer el perfil", uid, err);
    return null;
  }
}

export async function logoutUser() {
  if (!auth) return;
  return await fb.signOut(auth);
}

/* --- Perfil: cambiar usuario, correo, contraseña; borrar cuenta -------- */

async function reauth(password) {
  const user = auth.currentUser;
  const cred = fb.EmailAuthProvider.credential(user.email, password);
  await fb.reauthenticateWithCredential(user, cred);
}

export async function changeUsername(newUsername) {
  if (!db || !auth || !auth.currentUser) throw new Error("Inicia sesión primero.");
  const name = normalizeUsername(newUsername);
  if (!USERNAME_RE.test(name)) {
    const err = new Error("El usuario debe tener de 3 a 20 caracteres: letras minúsculas, números, punto o guion bajo.");
    err.code = "app/username-invalid";
    throw err;
  }
  const user = auth.currentUser;
  const profileRef = fb.doc(db, "profiles", user.uid);
  const newRef = fb.doc(db, "usernames", name);
  await fb.runTransaction(db, async (tx) => {
    const prof = await tx.get(profileRef);
    const old = prof.exists() ? prof.data().username : null;
    if (old === name) return;
    const taken = await tx.get(newRef);
    if (taken.exists() && taken.data().uid !== user.uid) {
      const err = new Error("Ese nombre de usuario ya está cogido.");
      err.code = "app/username-taken";
      throw err;
    }
    if (!taken.exists()) tx.set(newRef, { uid: user.uid, email: user.email, username: name });
    tx.set(profileRef, { username: name });
    if (old) tx.delete(fb.doc(db, "usernames", old));
  });
  return name;
}

export async function changePassword(currentPassword, newPassword) {
  if (!auth || !auth.currentUser) throw new Error("Inicia sesión primero.");
  await reauth(currentPassword);
  await fb.updatePassword(auth.currentUser, newPassword);
}

// Firebase manda un correo a la dirección nueva; el cambio se aplica al confirmarlo.
export async function changeEmail(newEmail, currentPassword) {
  if (!auth || !auth.currentUser) throw new Error("Inicia sesión primero.");
  await reauth(currentPassword);
  await fb.verifyBeforeUpdateEmail(auth.currentUser, newEmail);
}

// Si el correo de la cuenta cambió, actualizar la ficha del usuario para poder seguir entrando con él
export async function syncUsernameEmail(username) {
  if (!db || !auth || !auth.currentUser || !username) return;
  const user = auth.currentUser;
  const ref = fb.doc(db, "usernames", username);
  try {
    const snap = await fb.getDoc(ref);
    if (snap.exists() && snap.data().uid === user.uid && snap.data().email !== user.email) {
      await fb.setDoc(ref, { uid: user.uid, email: user.email, username });
    }
  } catch (err) {
    console.warn("No se pudo actualizar el correo del usuario", err);
  }
}

// Borra la cuenta: los núcleos propios (con todo su contenido), su sitio en los
// núcleos compartidos, el nombre de usuario y, por último, la cuenta de acceso.
export async function deleteAccount(currentPassword, onProgress = () => {}) {
  if (!db || !auth || !auth.currentUser) throw new Error("Inicia sesión primero.");
  await reauth(currentPassword);
  const user = auth.currentUser;
  const uid = user.uid;

  const index = await fb.getDocs(fb.collection(db, "users", uid, "nuclei"));
  for (const entry of index.docs) {
    const nid = entry.id;
    onProgress(`Borrando núcleos…`);
    try {
      const snap = await fb.getDoc(fb.doc(db, "nuclei", nid));
      if (snap.exists() && snap.data().ownerId === uid) {
        const parts = await fb.getDocs(fb.collection(db, "nuclei", nid, "participants"));
        await Promise.all(parts.docs.map((d) => fb.deleteDoc(d.ref)));
        const members = await fb.getDocs(fb.collection(db, "nuclei", nid, "members"));
        await Promise.all(members.docs.filter((d) => d.id !== uid).map(async (d) => {
          await fb.deleteDoc(d.ref);
          try { await fb.deleteDoc(fb.doc(db, "users", d.id, "nuclei", nid)); } catch (_) {}
        }));
        await fb.deleteDoc(fb.doc(db, "nuclei", nid, "members", uid));
        await fb.deleteDoc(fb.doc(db, "nuclei", nid));
      } else {
        try { await fb.deleteDoc(fb.doc(db, "nuclei", nid, "members", uid)); } catch (_) {}
      }
    } catch (err) {
      console.warn("No se pudo limpiar el núcleo", nid, err);
    }
    await fb.deleteDoc(entry.ref);
  }

  onProgress("Borrando el perfil…");
  const prof = await fb.getDoc(fb.doc(db, "profiles", uid));
  if (prof.exists()) {
    const name = prof.data().username;
    if (name) { try { await fb.deleteDoc(fb.doc(db, "usernames", name)); } catch (_) {} }
    await fb.deleteDoc(prof.ref);
  }

  onProgress("Borrando la cuenta…");
  await fb.deleteUser(user);
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

export async function renameNucleusDoc(nucleusId, name) {
  if (!db || !auth || !auth.currentUser) return;
  await fb.updateDoc(fb.doc(db, "nuclei", nucleusId), { name });
  await fb.setDoc(fb.doc(db, "users", auth.currentUser.uid, "nuclei", nucleusId),
    { id: nucleusId, name }, { merge: true });
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
  if (!db) return null;
  // 1) apuntarse como miembro (las reglas solo permiten añadirse a uno mismo)
  const memberRef = fb.doc(db, "nuclei", nucleusId, "members", userId);
  await fb.setDoc(memberRef, { uid: userId, joinedAt: fb.serverTimestamp() }, { merge: true });

  // 2) comprobar que el núcleo existe de verdad
  const snap = await fb.getDoc(fb.doc(db, "nuclei", nucleusId));
  if (!snap.exists()) {
    try { await fb.deleteDoc(memberRef); } catch (_) {}
    return null;
  }
  const name = snap.data().name || "Núcleo compartido";

  // 3) añadirlo a mi índice de núcleos
  await fb.setDoc(fb.doc(db, "users", userId, "nuclei", nucleusId),
    { id: nucleusId, name }, { merge: true });
  return name;
}

/* --- Lectura puntual (para la página de inicio) ------------------------ */

/* --- Personas con acceso a un núcleo ---------------------------------- */

export async function listNucleusMembers(nucleusId) {
  if (!db) return [];
  const qs = await fb.getDocs(fb.collection(db, "nuclei", nucleusId, "members"));
  const members = qs.docs.map((d) => ({ uid: d.id, joinedAt: d.data().joinedAt || null }));
  await Promise.all(members.map(async (m) => { m.username = await getUsernameOf(m.uid); }));
  return members;
}

export async function removeNucleusMember(nucleusId, uid) {
  if (!db) return;
  await fb.deleteDoc(fb.doc(db, "nuclei", nucleusId, "members", uid));
  // quitarlo también de su lista de núcleos (las reglas lo permiten al dueño)
  try { await fb.deleteDoc(fb.doc(db, "users", uid, "nuclei", nucleusId)); } catch (_) {}
}

export async function fetchParticipants(nucleusId) {
  if (!db) return null;
  const qs = await fb.getDocs(fb.collection(db, "nuclei", nucleusId, "participants"));
  return qs.docs.map((d) => d.data());
}
