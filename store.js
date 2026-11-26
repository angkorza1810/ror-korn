/* Ror-Korn : ตรรกะของแอป (บัญชี, อนุมัติสมาชิก, กระเป๋า, รายการ, เป้าหมาย, แชร์ค่าใช้จ่าย, แจ้งเตือน)
 * ข้อมูลใน Firestore
 *   users/{uid}                 โปรไฟล์ {id, nick, avatar, status, via}
 *   wallets/{wid}               กระเป๋า {name, kind, ownerUid, members{uid:role}, memberUids[], inviteCode}
 *   wallets/{wid}/tx/{id}       รายการรายรับรายจ่าย
 *   wallets/{wid}/goals/{id}    เป้าหมาย
 *   wallets/{wid}/entries/{id}  เงินที่หยอด/ถอนจากเป้าหมาย
 *   invites/{code}              ลิงก์เชิญ -> walletId
 *   splits/{id}                 ค่าใช้จ่ายที่แชร์กับเพื่อน
 *   notifications/{id}          แจ้งเตือน
 */
(function () {
  'use strict';
  const db = window.RKDB;
  const cfg = window.RORKORN_CONFIG || {};
  const ADMIN = (cfg.adminId || 'angkor').toLowerCase();
  const DOMAIN = cfg.emailDomain || 'rorkorn.app';
  const nowIso = () => new Date().toISOString();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const code10 = () => db.newId().replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10).padEnd(10, '0');

  const ERR = {
    'auth/email-already-in-use': 'ID นี้มีคนใช้แล้ว ลอง ID อื่นนะ',
    'auth/invalid-credential': 'ID หรือรหัสผ่านไม่ถูกต้อง',
    'auth/invalid-login-credentials': 'ID หรือรหัสผ่านไม่ถูกต้อง',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/user-not-found': 'ID หรือรหัสผ่านไม่ถูกต้อง',
    'auth/weak-password': 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว',
    'auth/too-many-requests': 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่นะ',
    'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้',
    'auth/requires-recent-login': 'กรุณาออกจากระบบแล้วเข้าใหม่ก่อนเปลี่ยนรหัสผ่าน',
    'auth/operation-not-allowed': 'ยังไม่ได้เปิดการเข้าสู่ระบบแบบ Email/Password ใน Firebase (ดูคู่มือขั้นที่ 3)',
    'permission-denied': 'คุณไม่มีสิทธิ์ทำรายการนี้',
    'unavailable': 'เชื่อมต่อฐานข้อมูลไม่ได้ ลองใหม่อีกครั้ง'
  };
  function nice(e) {
    if (e && e.userFacing) return e;
    const code = (e && (e.code || '')).replace(/^firestore\//, '');
    const msg = ERR[code] || (/permission/i.test(String(e && e.message)) ? ERR['permission-denied'] : null);
    const out = new Error(msg || 'มีบางอย่างผิดพลาด ลองใหม่อีกครั้งนะ');
    out.userFacing = true; out.cause = e; return out;
  }
  const fail = (m) => { const e = new Error(m); e.userFacing = true; return e; };
  async function guard(fn) { try { return await fn(); } catch (e) { throw nice(e); } }

  const S = {
    mode: db.mode, ADMIN, uid: null, email: null, me: null, phase: 'loading',  // loading | out | pending | blocked | in
    wallets: [], wid: null, wallet: null, tx: [], goals: [], entries: [],
    notifs: [], splits: [], users: {}, allUsers: [],
    _subs: [], _wsubs: [], _onChange: null, _signingUp: false, _t: null,

    get isAdmin() { return !!this.me && this.me.handle === ADMIN; },
    get role() { return this.wallet && this.wallet.members ? this.wallet.members[this.uid] || null : null; },
    emailOf(id) { return String(id).trim().toLowerCase() + '@' + DOMAIN; },
    validId(id) { return /^[a-z0-9_]{3,20}$/.test(String(id).trim().toLowerCase()); },
    emit() { clearTimeout(this._t); this._t = setTimeout(() => this._onChange && this._onChange(), 16); },
    profile(uid) { return this.users[uid] || null; },

    /* ---------- เริ่มต้น / เข้าสู่ระบบ ---------- */
    start(onChange) {
      this._onChange = onChange;
      db.onAuth(async (uid, email) => {
        if (this._signingUp) return;          // signUp จัดการเอง
        try { await this.afterAuth(uid, email); } catch (e) { console.error(e); this.phase = 'out'; this.emit(); }
      });
    },
    stopAll() { this._subs.forEach((u) => u()); this._subs = []; this._wsubs.forEach((u) => u()); this._wsubs = []; },
    async afterAuth(uid, email, extra) {
      this.stopAll();
      Object.assign(this, { _sel: null, _want: null, uid, email, me: null, wallets: [], wid: null, wallet: null, tx: [], goals: [], entries: [], notifs: [], splits: [], allUsers: [] });
      if (!uid) { this.phase = 'out'; this.emit(); return; }
      const id = String(email || '').split('@')[0];
      let me = await db.get('users/' + uid);
      if (!me) {
        // บัญชีที่สร้างจาก Firebase Console (เช่น angkor) หรือสมัครแล้วเน็ตหลุดก่อนสร้างโปรไฟล์
        const doc = { handle: id, nick: id === ADMIN ? (cfg.adminNick || 'อังกอร์') : id, avatar: 'a1', status: id === ADMIN ? 'active' : 'pending', via: 'signup', inviteCode: null, createdAt: nowIso() };
        if (extra) Object.assign(doc, extra);
        await db.set('users/' + uid, doc);
        me = { id: uid, ...doc };
        if (doc.status === 'pending') this.notifyAdmin(doc).catch(() => {});
      }
      this.me = me; this.users[uid] = me;
      // ติดตามสถานะตัวเอง (พออนุมัติแล้วเข้าใช้ได้ทันที)
      this._subs.push(db.listenDoc('users/' + uid, (d) => {
        if (!d) return;
        const was = this.me && this.me.status;
        this.me = d; this.users[uid] = d;
        if (was !== d.status) this.applyStatus(); else this.emit();
      }));
      await this.applyStatus();
    },
    async applyStatus() {
      const st = this.me.status;
      if (st === 'active' || this.isAdmin) {
        if (this.phase !== 'in') { this.phase = 'in'; await this.startData(); }
      } else {
        this._wsubs.forEach((u) => u()); this._wsubs = [];
        this.phase = st === 'pending' ? 'pending' : 'blocked';
        const code = sessionStorage.getItem('rk-join');
        if (code && st === 'pending') { try { await this.activateWithInvite(code); } catch (e) { console.warn(e); } }
      }
      this.emit();
    },
    async signUp({ id, pass, nick, avatar, invite }) {
      id = String(id || '').trim().toLowerCase();
      if (!this.validId(id)) throw fail('ID ใช้ได้เฉพาะภาษาอังกฤษตัวเล็ก ตัวเลข และ _ ยาว 3–20 ตัว');
      if (id === ADMIN && db.mode === 'cloud') throw fail('ID นี้สงวนไว้สำหรับเจ้าของเว็บ (สร้างใน Firebase Console ตามคู่มือ)');
      if (String(pass).length < 6) throw fail('รหัสผ่านต้องยาวอย่างน้อย 6 ตัว');
      nick = String(nick || '').trim() || id;
      this._signingUp = true;
      try {
        let inv = null;
        const uid = await guard(() => db.signUp(this.emailOf(id), pass));
        if (invite) { try { inv = await db.get('invites/' + invite); } catch (e) { inv = null; } }
        const extra = { nick: nick.slice(0, 40), avatar: avatar || 'a1', status: inv || id === ADMIN ? 'active' : 'pending', via: inv ? 'invite' : 'signup', inviteCode: inv ? invite : null };
        await guard(() => this.afterAuth(uid, this.emailOf(id), extra));
        if (inv) { sessionStorage.removeItem('rk-join'); await this.joinByCode(invite, true); }
      } finally { this._signingUp = false; }
    },
    async signIn(id, pass) {
      id = String(id || '').trim().toLowerCase();
      if (!id) throw fail('กรอก ID ก่อนนะ');
      await guard(() => db.signIn(this.emailOf(id), pass));
    },
    async signOut() { this.stopAll(); await db.signOut(); },
    async changePassword(oldPass, newPass) {
      if (String(newPass).length < 6) throw fail('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว');
      await guard(() => db.changePassword(this.email, oldPass, newPass));
    },
    async updateProfile(patch) {
      const p = {};
      if ('nick' in patch) { const n = String(patch.nick || '').trim(); if (!n) throw fail('ชื่อเล่นว่างไม่ได้'); p.nick = n.slice(0, 40); }
      if ('avatar' in patch) p.avatar = patch.avatar;
      await guard(() => db.update('users/' + this.uid, p));
    },
    async notifyAdmin(doc) {
      const admins = await db.query('users', ['handle', '==', ADMIN]);
      for (const a of admins) await this.notify(a.id, 'signup', { handle: doc.handle, nick: doc.nick });
    },
    async activateWithInvite(code) {
      const inv = await db.get('invites/' + code);
      if (!inv) throw fail('ลิงก์เชิญไม่ถูกต้องหรือถูกยกเลิกแล้ว');
      await db.update('users/' + this.uid, { status: 'active', via: 'invite', inviteCode: code });
    },

    /* ---------- ข้อมูลหลัง login ---------- */
    async startData() {
      await this.ensurePersonal();
      this._subs.push(db.listen('wallets', ['memberUids', 'array-contains', this.uid], (list) => {
        this.wallets = list.sort((a, b) => (a.kind === 'personal' ? -1 : 1) - (b.kind === 'personal' ? -1 : 1) || String(a.createdAt).localeCompare(String(b.createdAt)));
        const keep = (this._want && this.wallets.find((w) => w.id === this._want)) || this.wallets.find((w) => w.id === this._sel) || this.wallets.find((w) => w.id === localStorage.getItem('rk-wid')) || this.wallets.find((w) => w.id === 'p_' + this.uid) || this.wallets[0];
        if (keep && this._want === keep.id) this._want = null;
        if (keep && keep.id !== this._sel) this.selectWallet(keep.id);
        else { this.wallet = keep || null; }
        this.loadUsers(this.wallets.flatMap((w) => w.memberUids || []));
        this.emit();
      }));
      this._subs.push(db.listen('notifications', ['to', '==', this.uid], (list) => {
        this.notifs = list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 80);
        this.loadUsers(this.notifs.map((n) => n.from)); this.emit();
      }));
      this._subs.push(db.listen('splits', ['participants', 'array-contains', this.uid], (list) => {
        this.splits = list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        this.loadUsers(this.splits.flatMap((s) => s.participants)); this.emit();
      }));
      if (this.isAdmin) this._subs.push(db.listen('users', null, (list) => { this.allUsers = list; list.forEach((u) => { this.users[u.id] = u; }); this.emit(); }));
      const code = sessionStorage.getItem('rk-join');
      if (code) { sessionStorage.removeItem('rk-join'); try { await this.joinByCode(code, true); } catch (e) { this.lastError = e; } }
    },
    async ensurePersonal() {
      const wid = 'p_' + this.uid;
      let w = null;
      try { w = await db.get('wallets/' + wid); } catch (e) { w = null; }
      if (!w) await guard(() => db.set('wallets/' + wid, { name: 'กระเป๋าส่วนตัว', kind: 'personal', ownerUid: this.uid, members: { [this.uid]: 'admin' }, memberUids: [this.uid], inviteCode: null, createdAt: nowIso() }));
    },
    async loadUsers(uids) {
      const miss = [...new Set(uids.filter((u) => u && !this.users[u]))];
      if (!miss.length) return;
      await Promise.all(miss.map(async (u) => { try { const p = await db.get('users/' + u); if (p) this.users[u] = p; } catch (e) { /* ไม่มีสิทธิ์ก็ข้าม */ } }));
      this.emit();
    },
    selectWallet(wid) {
      this._wsubs.forEach((u) => u()); this._wsubs = [];
      this._sel = wid; this.wid = wid; this.wallet = this.wallets.find((w) => w.id === wid) || null;
      this.tx = []; this.goals = []; this.entries = [];
      localStorage.setItem('rk-wid', wid);
      const base = 'wallets/' + wid;
      this._wsubs.push(db.listen(base + '/tx', null, (l) => { this.tx = l.sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt))); this.loadUsers(l.map((t) => t.uid)); this.emit(); }));
      this._wsubs.push(db.listen(base + '/goals', null, (l) => { this.goals = l.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); this.emit(); }));
      this._wsubs.push(db.listen(base + '/entries', null, (l) => { this.entries = l.sort((a, b) => a.date.localeCompare(b.date)); this.emit(); }));
      this.emit();
    },
    members() {
      const w = this.wallet; if (!w) return [];
      return Object.entries(w.members || {}).map(([uid, role]) => ({ uid, role, ...(this.users[uid] || { handle: '?', nick: '…' }) }));
    },
    async findUserById(id) {
      id = String(id || '').trim().toLowerCase().replace(/^@/, '');
      if (!this.validId(id)) throw fail('รูปแบบ ID ไม่ถูกต้อง');
      const r = await guard(() => db.query('users', ['handle', '==', id]));
      const u = r[0];
      if (!u) throw fail(`ไม่พบผู้ใช้ ID "${id}"`);
      if (u.status !== 'active') throw fail(`ID "${id}" ยังไม่ได้รับอนุมัติให้ใช้งาน`);
      this.users[u.id] = u;
      return u;
    },

    /* ---------- กระเป๋า / กลุ่ม ---------- */
    async createGroup(name) {
      name = String(name || '').trim(); if (!name) throw fail('ตั้งชื่อกลุ่มก่อนนะ');
      const wid = db.newId(), code = code10();
      this._want = wid; localStorage.setItem('rk-wid', wid);
      await guard(async () => {
        await db.set('wallets/' + wid, { name: name.slice(0, 60), kind: 'group', ownerUid: this.uid, members: { [this.uid]: 'admin' }, memberUids: [this.uid], inviteCode: code, createdAt: nowIso() });
        await db.set('invites/' + code, { walletId: wid, createdBy: this.uid, createdAt: nowIso() });
      });
      return wid;
    },
    async joinByCode(code, silentIfMember) {
      code = String(code || '').trim();
      const inv = await guard(() => db.get('invites/' + code));
      if (!inv) throw fail('ลิงก์เชิญไม่ถูกต้องหรือถูกยกเลิกแล้ว');
      if (this.wallets.some((w) => w.id === inv.walletId)) { if (!silentIfMember) throw fail('คุณอยู่ในกลุ่มนี้แล้ว'); this.selectWallet(inv.walletId); return inv.walletId; }
      this._want = inv.walletId;
      await guard(() => db.update('wallets/' + inv.walletId, { ['members.' + this.uid]: 'editor', memberUids: db.arrayUnion(this.uid), joinCode: code }));
      try {
        const w = await db.get('wallets/' + inv.walletId);
        for (const [u, r] of Object.entries(w.members || {})) if (r === 'admin' && u !== this.uid) await this.notify(u, 'joined', { walletName: w.name, nick: this.me.nick, handle: this.me.handle });
      } catch (e) { /* ไม่เป็นไร */ }
      this._want = inv.walletId; localStorage.setItem('rk-wid', inv.walletId);
      return inv.walletId;
    },
    async renameWallet(name) { name = String(name || '').trim(); if (!name) return; await guard(() => db.update('wallets/' + this.wid, { name: name.slice(0, 60) })); },
    async resetInvite() {
      const w = this.wallet, code = code10();
      await guard(async () => {
        await db.set('invites/' + code, { walletId: w.id, createdBy: this.uid, createdAt: nowIso() });
        await db.update('wallets/' + w.id, { inviteCode: code });
        if (w.inviteCode) await db.del('invites/' + w.inviteCode).catch(() => {});
      });
    },
    async addMemberById(id, role) {
      const w = this.wallet;
      const u = await this.findUserById(id);
      if ((w.memberUids || []).includes(u.id)) throw fail(`${u.nick} อยู่ในกระเป๋านี้แล้ว`);
      if (w.kind === 'personal') role = 'viewer';
      await guard(() => db.update('wallets/' + w.id, { ['members.' + u.id]: role, memberUids: db.arrayUnion(u.id) }));
      await this.notify(u.id, 'added', { walletName: w.name, role, kind: w.kind }).catch(() => {});
      return u;
    },
    async setRole(uid, role) { await guard(() => db.update('wallets/' + this.wid, { ['members.' + uid]: role })); },
    async removeMember(uid) { await guard(() => db.update('wallets/' + this.wid, { ['members.' + uid]: db.DELETE, memberUids: db.arrayRemove(uid) })); },
    async leaveWallet() { const wid = this.wid; await this.removeMember(this.uid); localStorage.removeItem('rk-wid'); this.selectWallet('p_' + this.uid); return wid; },
    async deleteWallet() {
      const w = this.wallet; if (!w || w.kind !== 'group' || w.ownerUid !== this.uid) throw fail('ลบได้เฉพาะกลุ่มที่คุณสร้าง');
      await guard(async () => {
        for (const sub of ['tx', 'goals', 'entries']) for (const d of await db.query('wallets/' + w.id + '/' + sub)) await db.del('wallets/' + w.id + '/' + sub + '/' + d.id);
        if (w.inviteCode) await db.del('invites/' + w.inviteCode).catch(() => {});
        await db.del('wallets/' + w.id);
      });
      this.selectWallet('p_' + this.uid);
    },

    /* ---------- รายการ ---------- */
    txRow(row) {
      return { type: row.type, amount: Math.round(Number(row.amount) * 100) / 100, title: String(row.title).slice(0, 120), category: row.category, date: row.date || todayStr(), method: row.method || null, note: row.note || null, icon: row.icon || null };
    },
    async addTx(row, wid) { const w = wid || this.wid; return guard(() => db.add('wallets/' + w + '/tx', { ...this.txRow(row), uid: this.uid, split: row.split || null, createdAt: nowIso() })); },
    async updateTx(id, row) { await guard(() => db.update('wallets/' + this.wid + '/tx/' + id, this.txRow(row))); },
    async deleteTx(id, wid) { await guard(() => db.del('wallets/' + (wid || this.wid) + '/tx/' + id)); },

    /* ---------- เป้าหมาย ---------- */
    async addGoal(g, start) {
      const id = await guard(() => db.add('wallets/' + this.wid + '/goals', { uid: this.uid, name: String(g.name).slice(0, 60), target: Number(g.target), deadline: g.deadline, ride: g.ride, createdAt: nowIso() }));
      if (start > 0) await this.addEntry(id, start, todayStr());
      return id;
    },
    async updateGoal(id, g) { await guard(() => db.update('wallets/' + this.wid + '/goals/' + id, { name: String(g.name).slice(0, 60), target: Number(g.target), deadline: g.deadline, ride: g.ride })); },
    async deleteGoal(id) {
      await guard(async () => {
        for (const e of this.entries.filter((x) => x.goalId === id)) await db.del('wallets/' + this.wid + '/entries/' + e.id).catch(() => {});
        await db.del('wallets/' + this.wid + '/goals/' + id);
      });
    },
    async addEntry(goalId, amount, date) { await guard(() => db.add('wallets/' + this.wid + '/entries', { uid: this.uid, goalId, amount: Math.round(amount * 100) / 100, date: date || todayStr(), createdAt: nowIso() })); },
    async deleteEntry(id) { await guard(() => db.del('wallets/' + this.wid + '/entries/' + id)); },

    /* ---------- แชร์ค่าใช้จ่าย ---------- */
    friendCandidates() {
      const set = new Set(); this.wallets.forEach((w) => (w.memberUids || []).forEach((u) => set.add(u)));
      this.splits.forEach((s) => s.participants.forEach((u) => set.add(u)));
      set.delete(this.uid);
      return [...set].map((u) => this.users[u]).filter((u) => u && u.status === 'active');
    },
    async createSplit(row, shares, mode) {
      const tx = this.txRow(row);
      const parts = Object.keys(shares).filter((u) => shares[u] > 0);
      if (!parts.some((u) => u !== this.uid)) throw fail('เลือกเพื่อนที่จะแชร์อย่างน้อย 1 คน');
      const sum = Math.round(parts.reduce((s, u) => s + shares[u], 0) * 100);
      if (sum !== Math.round(tx.amount * 100)) throw fail('ยอดที่แบ่งยังไม่เท่ากับยอดเต็ม');
      const sid = db.newId();
      const status = {}; parts.forEach((u) => { status[u] = u === this.uid ? 'confirmed' : 'pending'; });
      if (!parts.includes(this.uid)) { parts.push(this.uid); status[this.uid] = 'confirmed'; }
      const cleanShares = {}; Object.keys(shares).forEach((u) => { if (shares[u] > 0) cleanShares[u] = Math.round(shares[u] * 100) / 100; });
      await guard(() => db.set('splits/' + sid, { payerUid: this.uid, title: tx.title, total: tx.amount, mode, shares: cleanShares, participants: parts, status, category: tx.category, icon: tx.icon, date: tx.date, method: tx.method, note: tx.note, lastConfirmed: null, createdAt: nowIso() }));
      if (cleanShares[this.uid] > 0) await this.addTx({ ...tx, amount: cleanShares[this.uid], split: sid });
      for (const u of parts) if (u !== this.uid) await this.notify(u, 'split', { splitId: sid, title: tx.title, total: tx.amount, share: cleanShares[u] }).catch(() => {});
      return sid;
    },
    async respondSplit(sid, accept) {
      const s = this.splits.find((x) => x.id === sid); if (!s) throw fail('ไม่พบรายการแชร์นี้');
      if (s.status[this.uid] !== 'pending') throw fail('ตอบรับรายการนี้ไปแล้ว');
      await guard(() => db.update('splits/' + sid, { ['status.' + this.uid]: accept ? 'accepted' : 'rejected' }));
      if (accept) await this.addTx({ type: 'expense', title: s.title, amount: s.shares[this.uid], category: s.category, date: todayStr(), method: s.method, note: `แชร์จาก ${this.users[s.payerUid]?.nick || 'เพื่อน'} ยอดเต็ม ${s.total} ฿`, icon: s.icon, split: sid }, 'p_' + this.uid);
      await this.notify(s.payerUid, accept ? 'split-accepted' : 'split-rejected', { splitId: sid, title: s.title, share: s.shares[this.uid] }).catch(() => {});
    },
    async markPaid(sid) {
      const s = this.splits.find((x) => x.id === sid);
      await guard(() => db.update('splits/' + sid, { ['status.' + this.uid]: 'paid' }));
      await this.notify(s.payerUid, 'split-paid', { splitId: sid, title: s.title, share: s.shares[this.uid] }).catch(() => {});
    },
    async confirmReceived(sid, uid) {
      const s = this.splits.find((x) => x.id === sid);
      await guard(() => db.update('splits/' + sid, { ['status.' + uid]: 'confirmed', lastConfirmed: uid }));
      await this.notify(uid, 'split-confirmed', { splitId: sid, title: s.title, share: s.shares[uid] }).catch(() => {});
    },
    async cancelSplit(sid) { await guard(() => db.del('splits/' + sid)); },
    balances() {   // บวก = เพื่อนติดเรา / ลบ = เราติดเพื่อน
      const b = {};
      for (const s of this.splits) {
        for (const u of s.participants) {
          if (u === s.payerUid) continue;
          const st = s.status[u]; if (st === 'rejected' || st === 'confirmed') continue;
          const amt = s.shares[u] || 0;
          if (s.payerUid === this.uid) b[u] = (b[u] || 0) + amt;
          else if (u === this.uid) b[s.payerUid] = (b[s.payerUid] || 0) - amt;
        }
      }
      return b;
    },

    /* ---------- แจ้งเตือน ---------- */
    async notify(to, type, data) { if (!to || to === this.uid) return; await db.add('notifications', { to, from: this.uid, type, data: data || {}, read: false, createdAt: nowIso() }); },
    async markRead(id) { await guard(() => db.update('notifications/' + id, { read: true })); },
    async markAllRead() { for (const n of this.notifs.filter((x) => !x.read)) await db.update('notifications/' + n.id, { read: true }).catch(() => {}); },
    async deleteNotif(id) { await guard(() => db.del('notifications/' + id)); },

    /* ---------- เจ้าของเว็บ ---------- */
    async setStatus(uid, status) {
      if (!this.isAdmin) throw fail('เฉพาะเจ้าของเว็บเท่านั้น');
      await guard(() => db.update('users/' + uid, { status }));
      if (status === 'active') await this.notify(uid, 'approved', {}).catch(() => {});
    }
  };
  window.RK = S;
})();
