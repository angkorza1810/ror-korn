/* Ror-Korn : ชั้นฐานข้อมูล
 * มี 2 แบบที่ใช้คำสั่งเดียวกัน
 *   FirebaseBackend : Firebase Auth + Cloud Firestore (ใช้ร่วมกันได้ทุกเครื่อง)
 *   LocalBackend    : เก็บในเบราว์เซอร์ (โหมดทดลอง)
 * path ใช้รูปแบบ 'collection/docId/subcollection/docId'
 */
(function () {
  'use strict';

  const rid = () => {
    const a = crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(12)) : Array.from({ length: 12 }, () => Math.random() * 256 | 0);
    return Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('') + Date.now().toString(36).slice(-4);
  };
  const authErr = (code) => { const e = new Error(code); e.code = code; return e; };

  /* ======================= Firebase ======================= */
  class FirebaseBackend {
    constructor(cfg) {
      this.mode = 'cloud';
      this.app = firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      this.fs = firebase.firestore();
      this.DELETE = firebase.firestore.FieldValue.delete();
    }
    arrayUnion(v) { return firebase.firestore.FieldValue.arrayUnion(v); }
    arrayRemove(v) { return firebase.firestore.FieldValue.arrayRemove(v); }
    newId() { return this.fs.collection('_').doc().id; }
    onAuth(cb) { return this.auth.onAuthStateChanged((u) => cb(u ? u.uid : null, u ? u.email : null)); }
    async signUp(email, pass) { const c = await this.auth.createUserWithEmailAndPassword(email, pass); return c.user.uid; }
    async signIn(email, pass) { const c = await this.auth.signInWithEmailAndPassword(email, pass); return c.user.uid; }
    async signOut() { await this.auth.signOut(); }
    async changePassword(email, oldPass, newPass) {
      const u = this.auth.currentUser;
      await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(email, oldPass));
      await u.updatePassword(newPass);
    }
    snapList(qs) { return qs.docs.map((d) => ({ id: d.id, ...d.data() })); }
    ref(colPath, filter) {
      let r = this.fs.collection(colPath);
      if (filter) r = r.where(filter[0], filter[1], filter[2]);
      return r;
    }
    async get(path) { const s = await this.fs.doc(path).get(); return s.exists ? { id: s.id, ...s.data() } : null; }
    async set(path, data) { await this.fs.doc(path).set(data); }
    async add(colPath, data) { const r = await this.fs.collection(colPath).add(data); return r.id; }
    async update(path, patch) { await this.fs.doc(path).update(patch); }
    async del(path) { await this.fs.doc(path).delete(); }
    async query(colPath, filter) { return this.snapList(await this.ref(colPath, filter).get()); }
    listen(colPath, filter, cb, onErr) {
      return this.ref(colPath, filter).onSnapshot((qs) => cb(this.snapList(qs)), (e) => { console.error('listen', colPath, e); if (onErr) onErr(e); });
    }
    listenDoc(path, cb, onErr) {
      return this.fs.doc(path).onSnapshot((s) => cb(s.exists ? { id: s.id, ...s.data() } : null), (e) => { console.error('listenDoc', path, e); if (onErr) onErr(e); });
    }
  }

  /* ======================= Local ======================= */
  const LKEY = 'rorkorn-local-v1';
  const DEL = { __delete: true };
  class LocalBackend {
    constructor() {
      this.mode = 'local';
      this.DELETE = DEL;
      this.listeners = new Set();
      this.authCbs = new Set();
      this.data = this.read();
      window.addEventListener('storage', (e) => { if (e.key === LKEY) { this.data = this.read(); this.notify(); } });
    }
    read() {
      try { const d = JSON.parse(localStorage.getItem(LKEY)); if (d && d.docs) return d; } catch (e) { /* ว่าง */ }
      return { docs: {}, users: {}, session: null };
    }
    save() { try { localStorage.setItem(LKEY, JSON.stringify(this.data)); } catch (e) { throw new Error('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม'); } this.notify(); }
    notify() { queueMicrotask(() => this.listeners.forEach((l) => l.fire())); }
    newId() { return rid(); }
    arrayUnion(v) { return { __union: v }; }
    arrayRemove(v) { return { __remove: v }; }
    async hash(s) {
      if (crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
      let h = 0; for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619); return String(h >>> 0);
    }
    onAuth(cb) {
      this.authCbs.add(cb);
      const s = this.data.session; const u = s && Object.entries(this.data.users).find(([, v]) => v.uid === s);
      setTimeout(() => cb(u ? u[1].uid : null, u ? u[0] : null), 0);
      return () => this.authCbs.delete(cb);
    }
    fireAuth() { const s = this.data.session; const u = s && Object.entries(this.data.users).find(([, v]) => v.uid === s); this.authCbs.forEach((cb) => cb(u ? u[1].uid : null, u ? u[0] : null)); }
    async signUp(email, pass) {
      if (this.data.users[email]) throw authErr('auth/email-already-in-use');
      if (pass.length < 6) throw authErr('auth/weak-password');
      const uid = rid();
      this.data.users[email] = { uid, pass: await this.hash(email + ':' + pass) };
      this.data.session = uid; this.save(); this.fireAuth(); return uid;
    }
    async signIn(email, pass) {
      const u = this.data.users[email];
      if (!u || u.pass !== await this.hash(email + ':' + pass)) throw authErr('auth/invalid-credential');
      this.data.session = u.uid; this.save(); this.fireAuth(); return u.uid;
    }
    async signOut() { this.data.session = null; this.save(); this.fireAuth(); }
    async changePassword(email, oldPass, newPass) {
      const u = this.data.users[email];
      if (!u || u.pass !== await this.hash(email + ':' + oldPass)) throw authErr('auth/wrong-password');
      if (newPass.length < 6) throw authErr('auth/weak-password');
      u.pass = await this.hash(email + ':' + newPass); this.save();
    }
    parent(path) { return path.split('/').slice(0, -1).join('/'); }
    clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
    match(d, f) {
      if (!f) return true;
      const v = d[f[0]];
      if (f[1] === '==') return v === f[2];
      if (f[1] === 'array-contains') return Array.isArray(v) && v.includes(f[2]);
      if (f[1] === 'in') return f[2].includes(v);
      throw new Error('op ' + f[1]);
    }
    list(colPath, filter) {
      const out = [];
      for (const [p, d] of Object.entries(this.data.docs)) if (this.parent(p) === colPath && this.match(d, filter)) out.push({ id: p.split('/').pop(), ...this.clone(d) });
      return out;
    }
    async get(path) { const d = this.data.docs[path]; return d ? { id: path.split('/').pop(), ...this.clone(d) } : null; }
    async set(path, data) { this.data.docs[path] = this.clone(data); this.save(); }
    async add(colPath, data) { const id = rid(); await this.set(colPath + '/' + id, data); return id; }
    async update(path, patch) {
      const d = this.data.docs[path]; if (!d) throw new Error('not-found: ' + path);
      for (const [k, v] of Object.entries(patch)) {
        const keys = k.split('.'); let o = d;
        for (let i = 0; i < keys.length - 1; i++) { o[keys[i]] = o[keys[i]] && typeof o[keys[i]] === 'object' ? o[keys[i]] : {}; o = o[keys[i]]; }
        const last = keys[keys.length - 1];
        if (v === DEL) delete o[last];
        else if (v && typeof v === 'object' && '__union' in v) { const a = Array.isArray(o[last]) ? o[last] : []; if (!a.includes(v.__union)) a.push(v.__union); o[last] = a; }
        else if (v && typeof v === 'object' && '__remove' in v) { o[last] = (Array.isArray(o[last]) ? o[last] : []).filter((x) => x !== v.__remove); }
        else o[last] = this.clone(v);
      }
      this.save();
    }
    async del(path) {
      delete this.data.docs[path];
      for (const p of Object.keys(this.data.docs)) if (p.startsWith(path + '/')) delete this.data.docs[p];
      this.save();
    }
    async query(colPath, filter) { return this.list(colPath, filter); }
    listen(colPath, filter, cb) {
      const l = { fire: () => cb(this.list(colPath, filter)) };
      this.listeners.add(l); queueMicrotask(l.fire);
      return () => this.listeners.delete(l);
    }
    listenDoc(path, cb) {
      const l = { fire: () => { const d = this.data.docs[path]; cb(d ? { id: path.split('/').pop(), ...this.clone(d) } : null); } };
      this.listeners.add(l); queueMicrotask(l.fire);
      return () => this.listeners.delete(l);
    }
  }

  const cfg = (window.RORKORN_CONFIG || {}).firebaseConfig || {};
  const ready = cfg.apiKey && cfg.projectId && window.firebase && window.firebase.initializeApp;
  window.RKDB = ready ? new FirebaseBackend(cfg) : new LocalBackend();
})();
