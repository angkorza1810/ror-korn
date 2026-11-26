/* ===================== Ror-Korn : ตัวแอป ===================== */
(function () {
  'use strict';
  const RK = window.RK, I = window.OmdeeIcons, AV = window.RKAvatars, RD = window.RKRides;
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast-root');

  /* ---------------- เครื่องมือ ---------------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
  const fmt = (n) => nf.format(Math.round((Number(n) || 0) * 100) / 100);
  const fmt0 = (n) => nf0.format(Math.round(Number(n) || 0));
  const baht = (n) => fmt(n) + ' ฿';
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const todayStr = () => ymd(new Date());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const TH_ML = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const TH_D = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const TH_DS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const be = (y) => y + 543;
  const monthLabel = (d) => `${TH_ML[d.getMonth()]} ${be(d.getFullYear())}`;
  const shortDate = (s) => { const d = parseD(s); return `${d.getDate()} ${TH_M[d.getMonth()]} ${String(be(d.getFullYear())).slice(-2)}`; };
  const monthShort = (d) => `${TH_M[d.getMonth()]} ${String(be(d.getFullYear())).slice(-2)}`;
  const monthsDiff = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'เมื่อสักครู่'; if (s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว';
    if (s < 86400) return Math.floor(s / 3600) + ' ชม.ที่แล้ว'; if (s < 604800) return Math.floor(s / 86400) + ' วันที่แล้ว';
    return shortDate(ymd(new Date(iso)));
  }
  const ROLE_TH = { admin: 'แอดมิน', editor: 'เพิ่มรายการได้', viewer: 'ดูอย่างเดียว' };
  const who = (uid) => RK.users[uid] || (uid === RK.uid ? RK.me : null) || { handle: '?', nick: 'ผู้ใช้', avatar: 'a1' };
  const av = (uid, size = 28, cls = '') => AV.html(who(uid).avatar, size, cls);
  const nick = (uid) => uid === RK.uid ? 'คุณ' : who(uid).nick;

  /* ---------------- สถานะหน้าจอ ---------------- */
  const ui = {
    view: localStorage.getItem('rk-view') || 'home',
    an: { mode: 'month', anchor: new Date() },
    list: { month: new Date(), type: 'all', cat: '', q: '' },
    members: 'pending', authMode: 'login', pendingDel: new Map()
  };
  const role = () => RK.role || 'viewer';
  const canAdd = () => role() === 'admin' || role() === 'editor';
  const isWAdmin = () => role() === 'admin';
  const canEditTx = (t) => canAdd() && t.uid === RK.uid;
  const visibleTx = () => RK.tx.filter((t) => !ui.pendingDel.has(t.id));
  const unread = () => RK.notifs.filter((n) => !n.read).length;
  const pendingUsers = () => RK.allUsers.filter((u) => u.status === 'pending');

  /* ---------------- แจ้งเตือนสั้น ---------------- */
  function toast(msg, opts = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' err' : '');
    el.innerHTML = `<span>${esc(msg)}</span>` + (opts.action ? `<button type="button" data-t="act">${esc(opts.action)}</button>` : '') + '<button type="button" class="x" data-t="x" aria-label="ปิด"><i class="ti ti-x"></i></button>';
    const close = () => el.remove();
    el.querySelector('[data-t="x"]').onclick = close;
    if (opts.action) el.querySelector('[data-t="act"]').onclick = () => { opts.onAction(); close(); };
    $toast.appendChild(el);
    setTimeout(close, opts.ms || (opts.action ? 5200 : 3000));
  }
  const fail = (e) => { console.error(e); toast(e && e.userFacing ? e.message : 'มีบางอย่างผิดพลาด ลองใหม่อีกครั้งนะ', { error: true }); };

  /* ---------------- คำนวณ ---------------- */
  function sumTx(list, from, to, type) { let s = 0; for (const t of list) if (t.type === type && t.date >= from && t.date <= to) s += Number(t.amount); return s; }
  function monthRange(d) { return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0))]; }
  function weekStart(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  function periodRange(mode, a) { if (mode === 'month') return monthRange(a); const s = weekStart(a); return [ymd(s), ymd(addDays(s, 6))]; }
  function shiftPeriod(mode, a, n) { return mode === 'month' ? new Date(a.getFullYear(), a.getMonth() + n, 1) : addDays(a, 7 * n); }
  function periodLabel(mode, a) {
    if (mode === 'month') return monthLabel(a);
    const s = weekStart(a), e = addDays(s, 6);
    return `${s.getDate()} ${TH_M[s.getMonth()]} – ${e.getDate()} ${TH_M[e.getMonth()]} ${String(be(e.getFullYear())).slice(-2)}`;
  }
  // เงินเหลือเฉลี่ยต่อเดือน (3 เดือนเต็มล่าสุดที่มีรายการ)
  function avgLeftover() {
    const now = new Date(); let sum = 0, n = 0;
    for (let i = 1; i <= 3; i++) {
      const [a, b] = monthRange(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const inc = sumTx(RK.tx, a, b, 'income'), out = sumTx(RK.tx, a, b, 'expense');
      if (inc || out) { sum += inc - out; n++; }
    }
    if (!n) { const [a, b] = monthRange(now); const inc = sumTx(RK.tx, a, b, 'income'), out = sumTx(RK.tx, a, b, 'expense'); if (inc) return inc - out; return null; }
    return sum / n;
  }
  // แผนการเก็บตามระดับเครื่องเล่น
  function planFor(ride, remaining, deadline) {
    const info = RD.INFO[RD.norm(ride)], now = new Date();
    const monthsLeft = deadline ? Math.max(1, monthsDiff(now, parseD(deadline)) + 1) : 12;
    let months = Math.max(1, Math.ceil(monthsLeft * info.factor));
    let monthly = remaining / months, capped = false;
    if (info.lv > 1 && remaining > 0) {
      const lo = avgLeftover();
      if (lo && lo > 0 && monthly > lo * 0.6) {
        monthly = Math.max(remaining / monthsLeft, lo * 0.6);
        months = Math.max(1, Math.ceil(remaining / monthly)); capped = true;
      }
    }
    const end = new Date(now.getFullYear(), now.getMonth() + months, 0);
    return { monthly, weekly: monthly * 12 / 52, months, monthsLeft, end, capped, info };
  }
  function goalStats(g) {
    const es = RK.entries.filter((e) => e.goalId === g.id);
    const saved = es.reduce((s, e) => s + Number(e.amount), 0), target = Number(g.target);
    const remaining = Math.max(0, target - saved), p = target > 0 ? Math.max(0, Math.min(1, saved / target)) : 0;
    const now = new Date(), [mFrom, mTo] = monthRange(now);
    const thisMonth = es.filter((e) => e.date >= mFrom && e.date <= mTo).reduce((s, e) => s + Number(e.amount), 0);
    const plan = planFor(g.ride, remaining, g.deadline);
    const overdue = remaining > 0 && g.deadline && todayStr() > g.deadline;
    const firstEntry = es.reduce((m, e) => (!m || e.date < m ? e.date : m), null);
    const created = new Date(Math.min(g.createdAt ? new Date(g.createdAt).getTime() : now.getTime(), firstEntry ? parseD(firstEntry).getTime() : now.getTime()));
    const span = Math.max(1, Math.min(3, monthsDiff(created, now) + 1));
    const from = ymd(new Date(now.getFullYear(), now.getMonth() - span + 1, 1));
    const pace = es.filter((e) => e.date >= from).reduce((s, e) => s + Number(e.amount), 0) / span;
    let eta = null; if (remaining > 0 && pace > 0) eta = new Date(now.getFullYear(), now.getMonth() + Math.ceil(remaining / pace), 1);
    let status = 'idle';
    if (remaining <= 0) status = 'done'; else if (overdue) status = 'overdue';
    else if (eta) status = ymd(new Date(eta.getFullYear(), eta.getMonth() + 1, 0)) <= ymd(plan.end) ? 'ok' : 'late';
    return { saved, target, remaining, p, thisMonth, plan, pace, eta, status, entries: es, need: remaining > 0 ? plan.monthly : 0 };
  }
  function cheer(p) {
    if (p >= 1) return ['สำเร็จ!', 'done'];
    if (p >= 0.8) return ['ใกล้แล้วนะ สู้ๆ!', 'near'];
    if (p >= 0.5) return ['มาครึ่งทางแล้ว!', 'half'];
    if (p > 0) return ['ไปได้สวย เก็บต่อเลย', 'go'];
    return ['เริ่มกันเลย!', 'start'];
  }

  /* ---------------- โครงหลัก ---------------- */
  const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 60 L32 30 L44 60" stroke="#16244F" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="32" cy="28" r="22" fill="none" stroke="#8C7CF0" stroke-width="5"/><circle cx="32" cy="6" r="5" fill="#F07FA6"/><circle cx="54" cy="28" r="5" fill="#FFC23D"/><circle cx="10" cy="28" r="5" fill="#0E9F78"/><circle cx="32" cy="50" r="5" fill="#4D9BEF"/><circle cx="32" cy="28" r="5" fill="#16244F"/></svg>`;
  function nav() {
    const items = [['home', 'ti-building-carousel', 'ภาพรวม'], ['list', 'ti-receipt-2', 'รายการ'], ['analysis', 'ti-chart-histogram', 'วิเคราะห์'], ['goals', 'ti-flag-3', 'เป้าหมาย'], ['split', 'ti-users', 'หารเงิน'], ['share', 'ti-wallet', 'กระเป๋า']];
    if (RK.isAdmin) items.push(['members', 'ti-user-check', 'สมาชิก']);
    const pu = RK.isAdmin ? pendingUsers().length : 0;
    return items.map(([k, ic, lab]) => `<button class="${ui.view === k ? 'on' : ''}" data-act="go" data-view="${k}"><i class="ti ${ic}"></i>${lab}${k === 'members' && pu ? `<span class="badge">${pu}</span>` : ''}${k === 'split' && RK.splits.some((s) => s.status[RK.uid] === 'pending') ? '<span class="badge">!</span>' : ''}</button>`).join('');
  }

  // เก็บค่าที่พิมพ์ค้างไว้ในฟอร์ม เวลาหน้าจออัปเดตสด
  function snapshotInputs() {
    const map = {}; let focus = null;
    $app.querySelectorAll('[data-k]').forEach((el) => { map[el.dataset.k] = el.value; });
    const a = document.activeElement;
    if (a && $app.contains(a) && a.dataset && a.dataset.k) focus = { k: a.dataset.k, s: a.selectionStart, e: a.selectionEnd };
    return { map, focus };
  }
  function restoreInputs(snap) {
    $app.querySelectorAll('[data-k]').forEach((el) => { if (snap.map[el.dataset.k] !== undefined && el.type !== 'hidden') el.value = snap.map[el.dataset.k]; });
    if (snap.focus) { const el = $app.querySelector(`[data-k="${snap.focus.k}"]`); if (el) { el.focus(); try { el.setSelectionRange(snap.focus.s, snap.focus.e); } catch (e) { /* select ไม่มี */ } } }
  }

  function render() {
    const snap = snapshotInputs();
    if (RK.phase === 'loading') { $app.innerHTML = `<div class="loading">${LOGO.replace('<svg', '<svg width="60" height="60"')}กำลังเปิดสวนสนุก…</div>`; return; }
    if (RK.phase === 'out') { renderAuth(snap); return; }
    if (RK.phase === 'pending' || RK.phase === 'blocked') { renderWaiting(); return; }
    if (!RK.wallet) { $app.innerHTML = `<div class="loading">${LOGO.replace('<svg', '<svg width="60" height="60"')}กำลังโหลดกระเป๋า…</div>`; return; }
    const views = { home: viewHome, list: viewList, analysis: viewAnalysis, goals: viewGoals, split: viewSplit, share: viewShare, members: viewMembers, settings: viewSettings };
    if (!views[ui.view] || (ui.view === 'members' && !RK.isAdmin)) ui.view = 'home';
    const opts = RK.wallets.map((x) => `<option value="${x.id}" ${x.id === RK.wid ? 'selected' : ''}>${x.kind === 'personal' ? (x.ownerUid === RK.uid ? '🔒 ' : '👀 ') : '👥 '}${esc(x.kind === 'personal' && x.ownerUid !== RK.uid ? 'กระเป๋าของ ' + who(x.ownerUid).nick : x.name)}</option>`).join('');
    const n = unread();
    $app.innerHTML = `
      <header class="top">
        <div class="bunting"></div>
        <div class="bar">
          <div class="brand">${LOGO}<div>Ror-Korn<small>สวนสนุกออมเงิน</small></div></div>
          <div class="spacer"></div>
          <label class="wallet-pick"><span class="sr-only">เลือกกระเป๋า</span><i class="ti ti-wallet" style="color:var(--purple-d)"></i><select data-change="wallet">${opts}</select></label>
          <button class="bell" data-act="notifs" aria-label="แจ้งเตือน ${n} รายการ"><i class="ti ti-bell"></i>${n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : ''}</button>
          <button class="me-chip" data-act="go" data-view="settings" title="ตั้งค่า">${AV.html(RK.me.avatar, 32)}<span class="nm">${esc(RK.me.nick)}</span><i class="ti ti-settings" style="color:var(--ink-3)"></i></button>
        </div>
        <nav class="nav" aria-label="เมนูหลัก">${nav()}
          <span class="status">${RK.mode === 'cloud' ? '<span class="dot"></span>FIREBASE · ออนไลน์' : '<span class="dot local"></span>โหมดทดลอง · เครื่องนี้เท่านั้น'}</span>
        </nav>
      </header>
      <main>
        ${role() === 'viewer' && !['settings', 'members', 'split'].includes(ui.view) ? `<div class="notice blue" style="margin:12px 4px 0"><i class="ti ti-eye"></i><div>คุณ<b>ดูได้อย่างเดียว</b>ในกระเป๋านี้</div></div>` : ''}
        ${views[ui.view]()}
      </main>
      ${canAdd() && ['home', 'list', 'analysis', 'goals', 'split'].includes(ui.view) ? `<button class="btn dark fab" data-act="add-tx"><i class="ti ti-plus"></i><span>เพิ่มรายการ</span></button>` : ''}`;
    restoreInputs(snap);
    RD.place($app);
  }

  /* ---------------- หน้า: ภาพรวม ---------------- */
  function viewHome() {
    const now = new Date(), [a, b] = monthRange(now), tx = visibleTx();
    const inc = sumTx(tx, a, b, 'income'), out = sumTx(tx, a, b, 'expense'), net = inc - out;
    const [pa, pb] = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const pnet = sumTx(tx, pa, pb, 'income') - sumTx(tx, pa, pb, 'expense'), diff = net - pnet;
    const hr = now.getHours(), hello = hr < 11 ? 'อรุณสวัสดิ์' : hr < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
    const pendSplit = RK.splits.filter((s) => s.status[RK.uid] === 'pending');
    return `
      <div class="page-head"><div><h1>${hello}, ${esc(RK.me.nick)}</h1><p>${esc(walletTitle())} · ${monthLabel(now)}</p></div></div>
      ${pendSplit.length ? `<div class="notice purple" style="margin:0 4px 16px;align-items:center"><i class="ti ti-users"></i><div style="flex:1">มีเพื่อนแชร์ค่าใช้จ่ายมา <b>${pendSplit.length} รายการ</b> รอคุณตอบรับ</div><button class="btn sm" data-act="go" data-view="split">ดูเลย</button></div>` : ''}
      <div class="grid g-main">
        <div class="stack">
          <section class="card">
            <div class="hero">
              <div><div class="muted" style="font-weight:600">คงเหลือเดือนนี้</div>
                <div class="big ${net < 0 ? 'out-c' : ''}">${net < 0 ? '−' : ''}${fmt(Math.abs(net))}<small> ฿</small></div>
                ${(pnet !== 0 || net !== 0) ? `<span class="pill ${diff >= 0 ? 'in' : 'out'}" style="margin-top:8px"><i class="ti ti-trending-${diff >= 0 ? 'up' : 'down'}"></i>${diff >= 0 ? 'ดีกว่า' : 'น้อยกว่า'}เดือนก่อน ${baht(Math.abs(diff))}</span>` : ''}</div>
              <button class="btn yellow" data-act="go" data-view="analysis"><i class="ti ti-chart-dots-3"></i>ดูผลวิเคราะห์เดือนนี้</button>
            </div>
            <div class="grid g2" style="margin-top:18px">
              <div class="kpi in"><div class="lab"><i class="ti ti-arrow-down-left"></i>เงินเข้า</div><div class="val">+${fmt(inc)}</div></div>
              <div class="kpi out"><div class="lab"><i class="ti ti-arrow-up-right"></i>เงินออก</div><div class="val">−${fmt(out)}</div></div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h2><i class="ti ti-receipt-2" style="color:var(--purple)"></i>รายการล่าสุด</h2><button class="btn ghost sm" data-act="go" data-view="list">ดูทั้งหมด<i class="ti ti-arrow-right"></i></button></div>
            ${tx.length ? `<div class="list-box">${tx.slice(0, 6).map(txRow).join('')}</div>` : emptyTx()}
          </section>
        </div>
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2><i class="ti ti-flag-3" style="color:var(--pink)"></i>เป้าหมาย</h2><button class="btn ghost sm" data-act="go" data-view="goals">ทั้งหมด<i class="ti ti-arrow-right"></i></button></div>
            ${RK.goals.length ? RK.goals.slice(0, 2).map((g, i) => { const s = goalStats(g), [ct, cc] = cheer(s.p); return `
              <div class="mini-goal">
                <div style="display:flex;justify-content:space-between;gap:8px;font-weight:600"><span>${esc(g.name)}</span><span class="cheer ${cc}">${ct}</span></div>
                ${s.p >= 1 ? RD.celebrate(g, RK.me.avatar, i) : RD.ride(g, s.p, i)}
                <div class="faint" style="font-size:13px">${baht(s.saved)} / ${baht(s.target)}${s.need ? ` · เดือนละ ${baht(Math.ceil(s.need))}` : ''}</div>
              </div>`; }).join('') : `<div class="empty"><div>ยังไม่มีเป้าหมาย</div>${canAdd() ? '<button class="btn pink sm" style="margin-top:10px" data-act="add-goal"><i class="ti ti-plus"></i>สร้างเป้าหมาย</button>' : ''}</div>`}
          </section>
        </div>
      </div>`;
  }
  function walletTitle(w = RK.wallet) { return w.kind === 'personal' && w.ownerUid !== RK.uid ? 'กระเป๋าของ ' + who(w.ownerUid).nick : w.name; }
  function emptyTx() { return `<div class="empty">${I.html('piggy', 64)}<div>ยังไม่มีรายการ</div>${canAdd() ? '<button class="btn sm" style="margin-top:10px" data-act="add-tx"><i class="ti ti-plus"></i>เพิ่มรายการแรก</button>' : ''}</div>`; }
  function txRow(t) {
    const cat = I.category(t.category), own = canEditTx(t);
    const many = (RK.wallet.memberUids || []).length > 1;
    const sp = t.split ? RK.splits.find((s) => s.id === t.split) : null;
    return `<div class="tx${own ? ' own' : ''}" ${own ? `data-act="edit-tx" data-id="${t.id}" title="แตะเพื่อแก้ไข"` : ''}>
      ${I.html(t.icon || cat.icon, 44)}
      <div class="main"><div class="t1">${esc(t.title)}${t.split ? ` <span class="pill purple sp" ${sp ? `data-act="split-detail" data-id="${sp.id}"` : ''}><i class="ti ti-users"></i>แชร์${sp ? ' ' + sp.participants.length + ' คน' : ''}</span>` : ''}</div>
        <div class="t2"><span class="opt">${esc(t.category)} ·</span>${t.method ? `<span class="opt">${esc(t.method)} ·</span>` : ''}<span>${shortDate(t.date)}</span>${many ? `<span>· ${av(t.uid, 16, 'xs')} ${esc(nick(t.uid))}</span>` : ''}${t.note ? `<span title="${esc(t.note)}"><i class="ti ti-note"></i></span>` : ''}</div></div>
      <span class="amt ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '↙ +' : '↗ −'}${fmt(t.amount)}</span>
      ${own ? `<span class="acts"><button class="icon-btn" data-act="edit-tx" data-id="${t.id}" aria-label="แก้ไข"><i class="ti ti-pencil"></i></button><button class="icon-btn del" data-act="del-tx" data-id="${t.id}" aria-label="ลบ"><i class="ti ti-trash"></i></button></span>` : '<span class="acts" style="width:72px"></span>'}
    </div>`;
  }

  /* ---------------- หน้า: รายการ ---------------- */
  function viewList() {
    const L = ui.list, [a, b] = monthRange(L.month), q = L.q.trim().toLowerCase();
    let tx = visibleTx().filter((t) => t.date >= a && t.date <= b);
    const inc = sumTx(tx, a, b, 'income'), out = sumTx(tx, a, b, 'expense');
    if (L.type !== 'all') tx = tx.filter((t) => t.type === L.type);
    if (L.cat) tx = tx.filter((t) => t.category === L.cat);
    if (q) tx = tx.filter((t) => (t.title + ' ' + (t.note || '') + ' ' + t.category).toLowerCase().includes(q));
    const days = []; for (const t of tx) { let d = days[days.length - 1]; if (!d || d.date !== t.date) days.push(d = { date: t.date, items: [] }); d.items.push(t); }
    const today = todayStr(), yest = ymd(addDays(new Date(), -1));
    const dayLab = (s) => s === today ? 'วันนี้' : s === yest ? 'เมื่อวาน' : `วัน${TH_D[parseD(s).getDay()]}ที่ ${shortDate(s)}`;
    return `
      <div class="page-head"><div><h1>รายการ</h1><p>เพิ่ม แก้ไข หรือลบรายการรายรับรายจ่าย</p></div>
        <div class="period-nav"><button class="icon-btn" data-act="list-month" data-n="-1" aria-label="เดือนก่อน"><i class="ti ti-chevron-left"></i></button><span class="lab">${monthLabel(L.month)}</span><button class="icon-btn" data-act="list-month" data-n="1" aria-label="เดือนถัดไป"><i class="ti ti-chevron-right"></i></button></div></div>
      <div class="grid g3" style="margin-bottom:16px">
        <div class="kpi in"><div class="lab"><i class="ti ti-arrow-down-left"></i>เงินเข้า</div><div class="val">+${fmt(inc)}</div></div>
        <div class="kpi out"><div class="lab"><i class="ti ti-arrow-up-right"></i>เงินออก</div><div class="val">−${fmt(out)}</div></div>
        <div class="kpi net"><div class="lab"><i class="ti ti-wallet"></i>คงเหลือ</div><div class="val">${inc - out < 0 ? '−' : ''}${fmt(Math.abs(inc - out))}</div></div>
      </div>
      <section class="card">
        <div class="toolbar">
          <div class="tabs2">${[['all', 'ทั้งหมด'], ['income', 'เงินเข้า'], ['expense', 'เงินออก']].map(([k, l]) => `<button class="${L.type === k ? 'on' : ''}" data-act="list-type" data-v="${k}">${l}</button>`).join('')}</div>
          <select class="input" style="width:auto;padding:8px 12px" data-change="list-cat"><option value="">ทุกหมวด</option>${I.allCategories().map((c) => `<option ${L.cat === c.id ? 'selected' : ''}>${esc(c.id)}</option>`).join('')}</select>
          <input class="input" style="flex:1;min-width:160px;padding:8px 12px" placeholder="ค้นหา เช่น ลูกชิ้น" value="${esc(L.q)}" data-input="list-q" data-k="list-q">
        </div>
        ${days.length ? days.map((d) => { const di = d.items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
          return `<div class="tx-day"><span>${dayLab(d.date)}</span><span class="${di >= 0 ? 'in-c' : 'out-c'}">${di >= 0 ? '+' : '−'}${fmt(Math.abs(di))}</span></div><div class="list-box">${d.items.map(txRow).join('')}</div>`; }).join('')
          : `<div style="margin-top:14px">${q || L.cat || L.type !== 'all' ? '<div class="empty">ไม่พบรายการที่ตรงกับตัวกรอง</div>' : emptyTx()}</div>`}
      </section>`;
  }

  /* ---------------- หน้า: วิเคราะห์ ---------------- */
  function viewAnalysis() {
    const { mode, anchor } = ui.an, [a, b] = periodRange(mode, anchor), [pa, pb] = periodRange(mode, shiftPeriod(mode, anchor, -1));
    const tx = visibleTx();
    const inc = sumTx(tx, a, b, 'income'), out = sumTx(tx, a, b, 'expense'), net = inc - out;
    const pinc = sumTx(tx, pa, pb, 'income'), pout = sumTx(tx, pa, pb, 'expense'), pnet = pinc - pout;
    const rate = inc > 0 ? net / inc : null, today = todayStr(), isCurrent = today >= a && today <= b, isFuture = a > today;
    const daysTotal = Math.round((parseD(b) - parseD(a)) / 864e5) + 1;
    const daysGone = isCurrent ? Math.round((parseD(today) - parseD(a)) / 864e5) + 1 : isFuture ? 0 : daysTotal;
    const daysLeft = isCurrent ? daysTotal - daysGone + 1 : 0, perDay = daysGone ? out / daysGone : 0;
    const word = mode === 'month' ? 'เดือน' : 'สัปดาห์';
    const catMap = {}, pcatMap = {};
    tx.forEach((t) => { if (t.type !== 'expense') return; if (t.date >= a && t.date <= b) catMap[t.category] = (catMap[t.category] || 0) + t.amount; if (t.date >= pa && t.date <= pb) pcatMap[t.category] = (pcatMap[t.category] || 0) + t.amount; });
    const cats = Object.entries(catMap).sort((x, y) => y[1] - x[1]), maxCat = cats.length ? cats[0][1] : 0;
    const buckets = [];
    if (mode === 'month') { const end = parseD(b).getDate(), y = anchor.getFullYear(), m = anchor.getMonth(); for (let s = 1, k = 1; s <= end; s += 7, k++) { const e = Math.min(end, s + 6); buckets.push({ x: `สัปดาห์ ${k}`, sub: `${s}–${e}`, v: sumTx(tx, ymd(new Date(y, m, s)), ymd(new Date(y, m, e)), 'expense') }); } }
    else { const s = weekStart(anchor); for (let i = 0; i < 7; i++) { const d = addDays(s, i), k = ymd(d); buckets.push({ x: TH_DS[d.getDay()], day: TH_D[d.getDay()], sub: String(d.getDate()), v: sumTx(tx, k, k, 'expense'), today: k === today }); } }
    const maxB = Math.max(0, ...buckets.map((x) => x.v));
    const gs = RK.goals.map((g, i) => ({ g, i, s: goalStats(g), inPeriod: RK.entries.filter((e) => e.goalId === g.id && e.date >= a && e.date <= b).reduce((x, e) => x + e.amount, 0) }));
    const deposited = gs.reduce((x, o) => x + o.inPeriod, 0);
    const needLeft = mode === 'month' && isCurrent ? gs.reduce((x, o) => x + (o.s.need ? Math.max(0, o.s.need - o.inPeriod) : 0), 0) : 0;
    const free = net - deposited - needLeft, allowance = isCurrent && daysLeft > 0 ? free / daysLeft : null;
    const tips = [];
    if (!inc && !out) tips.push(['ti-info-circle', `${word}นี้ยังไม่มีรายการ ลองจดรายรับรายจ่ายดูนะ`]);
    else if (net >= 0) tips.push(['ti-mood-happy', `${word}นี้เก็บได้ <b>${baht(net)}</b>${rate !== null ? ` คิดเป็น <b>${Math.round(rate * 100)}%</b> ของรายรับ` : ''}`]);
    else tips.push(['ti-alert-triangle', `${word}นี้ใช้เกินรายรับไป <b>${baht(-net)}</b>`]);
    if ((pinc || pout) && (inc || out)) { const d = net - pnet; tips.push([d >= 0 ? 'ti-trending-up' : 'ti-trending-down', `${d >= 0 ? 'ดีกว่า' : 'น้อยกว่า'}${word}ก่อน <b>${baht(Math.abs(d))}</b> (ใช้จ่าย${out >= pout ? 'เพิ่มขึ้น' : 'ลดลง'} ${baht(Math.abs(out - pout))})`]); }
    let worst = null; for (const [c, v] of cats) { const pv = pcatMap[c] || 0; if (pv > 0 && v > pv) { const ch = (v - pv) / pv; if (!worst || ch > worst.ch) worst = { c, ch, v, pv }; } }
    if (worst && worst.ch >= 0.1) tips.push(['ti-eye', `หมวด <b>${esc(worst.c)}</b> เพิ่มขึ้น ${Math.round(worst.ch * 100)}% จาก${word}ก่อน (${baht(worst.pv)} → ${baht(worst.v)}) เป็นหมวดที่ควรจับตา`]);
    if (allowance !== null && (inc || out)) tips.push(allowance > 0 ? ['ti-calendar-dollar', `เหลืออีก ${daysLeft} วัน ใช้ได้อีกประมาณ <b>วันละ ${baht(Math.floor(allowance))}</b>${needLeft > 0 ? ` (กันเงินเข้าเป้าหมายไว้แล้ว ${baht(Math.ceil(needLeft))})` : ''}`] : ['ti-alert-circle', needLeft > 0 ? `ถ้าจะเก็บเข้าเป้าหมายให้ครบ${word}นี้ ยังขาดอีก <b>${baht(Math.ceil(-free))}</b>` : `${word}นี้เงินติดลบแล้ว ลองชะลอรายจ่ายที่ไม่จำเป็นนะ`]);
    const flex = cats.filter(([c]) => !['ที่พัก', 'บิลและค่าบริการ'].includes(c)), g0 = gs.find((o) => o.s.status !== 'done' && o.s.pace > 0);
    if (flex.length && g0 && mode === 'month') { const cut = flex[0][1] * 0.1, m1 = Math.ceil(g0.s.remaining / g0.s.pace), m2 = Math.ceil(g0.s.remaining / (g0.s.pace + cut)); if (m1 - m2 >= 1) tips.push(['ti-bulb', `ถ้าลดค่า${esc(flex[0][0])}ลง 10% (≈ ${baht(Math.round(cut))}/เดือน) แล้วเอาไปหยอด "${esc(g0.g.name)}" จะถึงเป้าเร็วขึ้นประมาณ <b>${m1 - m2} เดือน</b>`]); }
    const chg = (v, pv, upGood) => { if (!pv) return '<span class="chg flat">ใหม่</span>'; const c = (v - pv) / pv; if (Math.abs(c) < 0.005) return '<span class="chg flat">เท่าเดิม</span>'; const up = c > 0; return `<span class="chg ${up ? (upGood ? 'up-good' : 'up-bad') : (upGood ? 'down-bad' : 'down-good')}">${up ? '▲' : '▼'} ${Math.abs(Math.round(c * 100))}%</span>`; };
    return `
      <div class="page-head"><div><h1>ผลวิเคราะห์</h1><p>${word}นี้เราเป็นยังไงบ้าง และต้องเก็บเท่าไหร่ถึงจะถึงเป้า</p></div>
        <div class="toolbar"><div class="tabs2"><button class="${mode === 'week' ? 'on' : ''}" data-act="an-mode" data-v="week">สัปดาห์</button><button class="${mode === 'month' ? 'on' : ''}" data-act="an-mode" data-v="month">เดือน</button></div>
          <div class="period-nav"><button class="icon-btn" data-act="an-shift" data-n="-1" aria-label="ก่อนหน้า"><i class="ti ti-chevron-left"></i></button><span class="lab">${periodLabel(mode, anchor)}</span><button class="icon-btn" data-act="an-shift" data-n="1" aria-label="ถัดไป"><i class="ti ti-chevron-right"></i></button></div></div></div>
      <section class="announce"><h2><i class="ti ti-speakerphone"></i>สรุป${word}นี้</h2><ul>${tips.map(([ic, t]) => `<li><i class="ti ${ic}"></i>${t}</li>`).join('')}</ul></section>
      <div class="grid g3" style="margin:16px 0">
        <div class="kpi in"><div class="lab"><i class="ti ti-arrow-down-left"></i>เงินเข้า</div><div class="val">+${fmt(inc)}</div><div class="sub">${chg(inc, pinc, true)} เทียบ${word}ก่อน</div></div>
        <div class="kpi out"><div class="lab"><i class="ti ti-arrow-up-right"></i>เงินออก</div><div class="val">−${fmt(out)}</div><div class="sub">${chg(out, pout, false)} เทียบ${word}ก่อน</div></div>
        <div class="kpi net"><div class="lab"><i class="ti ti-pig-money"></i>เก็บได้</div><div class="val ${net < 0 ? 'out-c' : ''}">${net < 0 ? '−' : ''}${fmt(Math.abs(net))}</div><div class="sub muted">อัตราการออม ${rate === null ? '—' : Math.round(rate * 100) + '%'}</div></div>
      </div>
      <div class="grid g3" style="margin-bottom:16px">
        <div class="kpi plain"><div class="lab muted"><i class="ti ti-calendar-stats"></i>ใช้จ่ายเฉลี่ยต่อวัน</div><div class="val" style="font-size:24px">${baht(Math.round(perDay))}</div></div>
        <div class="kpi plain"><div class="lab muted"><i class="ti ti-hourglass"></i>เหลืออีก</div><div class="val" style="font-size:24px">${isCurrent ? daysLeft + ' วัน' : isFuture ? 'ยังไม่ถึง' : 'จบแล้ว'}</div></div>
        <div class="kpi plain"><div class="lab muted"><i class="ti ti-coin"></i>ใช้ได้อีกวันละ</div><div class="val" style="font-size:24px">${allowance === null ? '—' : allowance > 0 ? baht(Math.floor(allowance)) : '0 ฿'}</div></div>
      </div>
      <div class="grid g2">
        <section class="card"><div class="card-head"><h2><i class="ti ti-category" style="color:var(--out)"></i>จ่ายไปกับอะไร</h2><span class="faint" style="font-size:13px">เทียบ${word}ก่อน</span></div>
          ${cats.length ? cats.map(([c, v]) => { const cat = I.category(c); return `<div class="cat-row">${I.html(cat.icon, 36)}<div><div class="nm"><span>${esc(c)}</span><span>${baht(v)}</span></div><div class="track-bar"><span style="width:${(v / maxCat * 100).toFixed(1)}%;background:${cat.color}"></span></div></div><div style="text-align:right;min-width:64px"><div style="font-size:12.5px" class="faint">${out ? Math.round(v / out * 100) : 0}%</div>${chg(v, pcatMap[c] || 0, false)}</div></div>`; }).join('') : '<div class="empty">ยังไม่มีรายจ่ายในช่วงนี้</div>'}</section>
        <section class="card"><div class="card-head"><h2><i class="ti ti-chart-bar" style="color:var(--blue)"></i>${mode === 'month' ? 'แต่ละสัปดาห์ใช้ไปเท่าไหร่' : 'แต่ละวันใช้ไปเท่าไหร่'}</h2></div>
          <div class="bars">${buckets.map((x) => `<div class="b"><div class="col ${x.v === maxB && maxB > 0 ? 'max' : ''}" style="height:${maxB ? Math.max(2, x.v / maxB * 100) : 2}%">${x.v ? `<span class="v">${fmt0(x.v)}</span>` : ''}</div><div class="x"><b style="color:${x.today ? 'var(--purple-d)' : 'inherit'}">${x.x}</b><br>${x.sub}</div></div>`).join('')}</div>
          ${maxB ? `<p class="faint" style="font-size:13px;margin:12px 0 0">${(() => { const top = buckets.find((x) => x.v === maxB); return mode === 'month' ? `${top.x} (วันที่ ${top.sub}) ใช้เยอะที่สุด ${baht(top.v)}` : `วัน${top.day}ใช้เยอะที่สุด ${baht(top.v)}`; })()}</p>` : ''}</section>
      </div>
      <section class="card" style="margin-top:16px"><div class="card-head"><h2><i class="ti ti-flag-3" style="color:var(--pink)"></i>เป้าหมาย: ต้องเก็บเท่าไหร่ถึงจะถึง</h2>${canAdd() ? '<button class="btn ghost sm" data-act="go" data-view="goals">จัดการเป้าหมาย<i class="ti ti-arrow-right"></i></button>' : ''}</div>
        ${gs.length ? gs.map(({ g, i, s, inPeriod }) => `<div class="plan-row"><div><div style="font-weight:600">${esc(g.name)} ${lvBadge(g.ride)}</div><div class="faint" style="font-size:13px">${baht(s.saved)} / ${baht(s.target)} · ${statusText(s)}</div><div class="track-bar" style="max-width:420px"><span style="width:${(s.p * 100).toFixed(1)}%;background:${RD.COLORS[i % RD.COLORS.length]}"></span></div></div>
          <div style="text-align:right">${s.status === 'done' ? '<span class="pill in"><i class="ti ti-check"></i>สำเร็จ</span>' : `<div class="faint" style="font-size:12.5px">ต้องเก็บเดือนละ</div><div class="display" style="font-size:20px;color:var(--navy)">${baht(Math.ceil(s.need))}</div>`}<div style="font-size:12.5px" class="${s.need && inPeriod >= s.need ? 'in-c' : 'faint'}">${word}นี้หยอดไป ${baht(inPeriod)}</div></div></div>`).join('') : `<div class="empty">ยังไม่มีเป้าหมาย</div>`}
      </section>`;
  }
  function lvBadge(ride) { const i = RD.INFO[RD.norm(ride)]; return `<span class="lv ${i.cls}">Lv.${i.lv} ${i.tag}</span>`; }
  function statusText(s) {
    if (s.status === 'done') return 'ถึงเส้นชัยแล้ว';
    if (s.status === 'overdue') return `เลยกำหนดแล้ว ยังขาด ${baht(s.remaining)}`;
    if (s.status === 'ok') return `ตามแผน ถึงประมาณ ${monthShort(s.eta)}`;
    if (s.status === 'late') return `ช้ากว่าแผน ถ้าเก็บแบบนี้จะถึงประมาณ ${monthShort(s.eta)}`;
    return 'ยังไม่ได้เริ่มหยอด';
  }

  /* ---------------- หน้า: เป้าหมาย ---------------- */
  function viewGoals() {
    return `<div class="page-head"><div><h1>เป้าหมาย</h1><p>เลือกเครื่องเล่นตามความโหด ยิ่งหยอดเงิน ยิ่งใกล้เส้นชัย</p></div>${canAdd() ? '<button class="btn pink" data-act="add-goal"><i class="ti ti-plus"></i>เป้าหมายใหม่</button>' : ''}</div>
      ${RK.goals.length ? `<div class="stack">${RK.goals.map((g, i) => goalCard(g, i)).join('')}</div>` : `<section class="card empty">${I.html('piggy', 80)}<h2 style="justify-content:center;margin:6px 0">ยังไม่มีเป้าหมาย</h2><p class="muted">ตั้งเป้า เช่น เที่ยวญี่ปุ่น หรือเงินฉุกเฉิน แล้วเลือกเครื่องเล่นที่ชอบ</p>${canAdd() ? '<button class="btn pink" data-act="add-goal"><i class="ti ti-plus"></i>สร้างเป้าหมายแรก</button>' : ''}</section>`}`;
  }
  function goalCard(g, i) {
    const s = goalStats(g), own = canAdd() && g.uid === RK.uid, [ct, cc] = cheer(s.p), pl = s.plan;
    const many = (RK.wallet.memberUids || []).length > 1;
    const etaCls = s.status === 'ok' || s.status === 'done' ? 'good' : s.status === 'late' || s.status === 'overdue' ? 'warn' : '';
    return `<section class="card goal ${s.p >= 1 ? 'is-done' : ''}">
      <div class="goal-top">
        <div><h3>${esc(g.name)} ${s.p >= 1 ? '<span class="done-badge"><i class="ti ti-trophy"></i>สำเร็จ</span>' : ''}</h3>
          <div class="faint" style="font-size:13px;margin-top:2px">${lvBadge(g.ride)} ${RD.INFO[RD.norm(g.ride)].name} · กำหนด ${g.deadline ? shortDate(g.deadline) : '—'}${many ? ` · ตั้งโดย ${esc(nick(g.uid))}` : ''}</div></div>
        <div style="display:flex;align-items:center;gap:4px"><div class="goal-num">${Math.round(s.p * 100)}<small>%</small></div>
          ${own ? `<button class="icon-btn" data-act="edit-goal" data-id="${g.id}" aria-label="แก้ไขเป้าหมาย"><i class="ti ti-pencil"></i></button><button class="icon-btn del" data-act="del-goal" data-id="${g.id}" aria-label="ลบเป้าหมาย"><i class="ti ti-trash"></i></button>` : ''}</div>
      </div>
      <div class="cheer-row"><span class="cheer ${cc}">${cc === 'near' ? '<i class="ti ti-flame"></i>' : cc === 'done' ? '<i class="ti ti-confetti"></i>' : '<i class="ti ti-mood-smile"></i>'}${ct}</span></div>
      ${s.p >= 1 ? RD.celebrate(g, who(g.uid).avatar || RK.me.avatar, i) : RD.ride(g, s.p, i)}
      <div class="goal-facts">
        <div class="fact"><div class="k">เก็บแล้ว</div><div class="v">${baht(s.saved)} <span class="faint" style="font-size:13px">/ ${baht(s.target)}</span></div></div>
        <div class="fact"><div class="k">ต้องเก็บ${pl.info.lv === 3 ? 'สัปดาห์ละ' : 'เดือนละ'}</div><div class="v">${s.status === 'done' ? 'ครบแล้ว' : baht(Math.ceil(pl.info.lv === 3 ? pl.weekly : pl.monthly))}</div><div class="faint" style="font-size:11.5px">${s.status === 'done' ? '' : pl.info.lv === 3 ? `≈ เดือนละ ${baht(Math.ceil(pl.monthly))}` : pl.info.lv === 2 ? `≈ สัปดาห์ละ ${baht(Math.ceil(pl.weekly))}` : 'เก็บตามสะดวก'}${pl.capped ? ' · ปรับให้ทำได้จริง' : ''}</div></div>
        <div class="fact"><div class="k">เป้าเส้นชัย Lv.${pl.info.lv}</div><div class="v ${etaCls}">${s.status === 'done' ? 'ถึงแล้ว' : monthShort(pl.end)}</div><div class="faint" style="font-size:11.5px">${s.status === 'ok' ? 'ทันแผน' : s.status === 'late' ? `ตอนนี้คาดว่าถึง ${monthShort(s.eta)}` : s.status === 'overdue' ? 'เลยกำหนดแล้ว' : s.status === 'done' ? '' : 'ยังไม่มีข้อมูลพอ'}</div></div>
      </div>
      <div class="goal-btns">
        ${canAdd() && s.p < 1 ? `<button class="btn in" data-act="deposit" data-id="${g.id}" data-sign="1"><i class="ti ti-coin"></i>หยอดเงิน</button>` : ''}
        ${canAdd() && s.saved > 0 ? `<button class="btn ghost" data-act="deposit" data-id="${g.id}" data-sign="-1"><i class="ti ti-arrow-back-up"></i>ถอนออก</button>` : ''}
        <button class="btn ghost" data-act="history" data-id="${g.id}"><i class="ti ti-history"></i>ประวัติ (${s.entries.length})</button>
      </div>
    </section>`;
  }

  /* ---------------- หน้า: หารเงิน ---------------- */
  const ST_TH = { pending: 'รอตอบรับ', accepted: 'รับแล้ว รอโอน', rejected: 'ปฏิเสธ', paid: 'แจ้งว่าโอนแล้ว', confirmed: 'เคลียร์แล้ว' };
  function viewSplit() {
    const bal = RK.balances();
    const owedToMe = Object.values(bal).filter((v) => v > 0).reduce((a, b) => a + b, 0), iOwe = -Object.values(bal).filter((v) => v < 0).reduce((a, b) => a + b, 0);
    const people = Object.entries(bal).filter(([, v]) => Math.abs(v) > 0.004).sort((a, b) => b[1] - a[1]);
    return `<div class="page-head"><div><h1>หารเงินกับเพื่อน</h1><p>ติ๊ก "แชร์กับเพื่อน" ตอนเพิ่มรายการ ระบบจะหารและแจ้งเตือนเพื่อนให้</p></div></div>
      <div class="grid g2" style="margin-bottom:16px">
        <div class="kpi in"><div class="lab"><i class="ti ti-arrow-down-left"></i>เพื่อนติดเรา</div><div class="val">${fmt(owedToMe)}</div></div>
        <div class="kpi out"><div class="lab"><i class="ti ti-arrow-up-right"></i>เราติดเพื่อน</div><div class="val">${fmt(iOwe)}</div></div>
      </div>
      <div class="grid g-main">
        <section class="card"><div class="card-head"><h2><i class="ti ti-list-details" style="color:var(--purple)"></i>รายการที่แชร์</h2></div>
          ${RK.splits.length ? RK.splits.map(splitCard).join('') : `<div class="empty">${I.html('rice', 64)}<div>ยังไม่มีรายการที่แชร์</div>${canAdd() ? '<button class="btn sm" style="margin-top:10px" data-act="add-tx" data-split="1"><i class="ti ti-users-plus"></i>แชร์ค่าใช้จ่ายแรก</button>' : ''}</div>`}</section>
        <section class="card"><div class="card-head"><h2><i class="ti ti-scale" style="color:var(--yellow-d)"></i>ใครติดใครเท่าไหร่</h2></div>
          ${people.length ? people.map(([u, v]) => `<div class="member">${av(u, 32)}<div class="nm">${esc(who(u).nick)}<div class="faint" style="font-size:12px;font-weight:400">@${esc(who(u).handle)}</div></div><span class="amt ${v > 0 ? 'in' : 'out'}">${v > 0 ? 'ติดเรา ' : 'เราติด '}${fmt(Math.abs(v))}</span></div>`).join('') : '<div class="empty">ไม่มีใครติดใคร เคลียร์หมดแล้ว</div>'}</section>
      </div>`;
  }
  function splitCard(s) {
    const mine = s.payerUid === RK.uid, my = s.status[RK.uid], icon = s.icon || I.category(s.category).icon;
    const rows = s.participants.map((u) => {
      const st = s.status[u], amt = s.shares[u] || 0;
      let act = '';
      if (mine && u !== RK.uid && (st === 'accepted' || st === 'paid' || st === 'pending')) act = `<button class="btn in sm" data-act="split-confirm" data-id="${s.id}" data-uid="${u}"><i class="ti ti-check"></i>ได้รับเงินแล้ว</button>`;
      return `<div class="split-row">${av(u, 26)}<span class="nm">${esc(nick(u))}${u === s.payerUid ? ' <span class="pill yellow">คนจ่าย</span>' : ''}</span><span class="faint">${u === s.payerUid ? (amt ? baht(amt) : '—') : baht(amt)}</span>${u === s.payerUid ? '' : `<span class="st st-${st}">${ST_TH[st]}</span>`}${act}</div>`;
    }).join('');
    let my_act = '';
    if (!mine && my === 'pending') my_act = `<div class="split-acts"><button class="btn in sm" data-act="split-accept" data-id="${s.id}"><i class="ti ti-check"></i>รับ และเพิ่มในรายจ่ายของฉัน</button><button class="btn danger-ghost sm" data-act="split-reject" data-id="${s.id}">ไม่ใช่ของฉัน</button></div>`;
    else if (!mine && my === 'accepted') my_act = `<div class="split-acts"><button class="btn blue sm" data-act="split-paid" data-id="${s.id}"><i class="ti ti-send"></i>ฉันโอนคืนแล้ว ${baht(s.shares[RK.uid])}</button></div>`;
    return `<div class="split-card"><div class="split-head">${I.html(icon, 44)}<div style="flex:1;min-width:0"><div style="font-weight:600">${esc(s.title)}</div><div class="faint" style="font-size:12.5px">${mine ? 'คุณจ่าย' : esc(who(s.payerUid).nick) + ' จ่าย'} ${baht(s.total)} · ${s.mode === 'custom' ? 'กำหนดเอง' : 'หารเท่ากัน'} · ${shortDate(s.date)}</div></div>
      ${mine ? `<button class="icon-btn del" data-act="split-cancel" data-id="${s.id}" aria-label="ยกเลิกการแชร์"><i class="ti ti-trash"></i></button>` : `<span class="amt out">ส่วนของคุณ ${fmt(s.shares[RK.uid] || 0)}</span>`}</div>
      <div class="split-rows">${rows}</div>${my_act}</div>`;
  }

  /* ---------------- หน้า: กระเป๋า / แชร์ลิงก์ ---------------- */
  function viewShare() {
    const w = RK.wallet, link = w.inviteCode ? `${location.origin}${location.pathname}#join=${w.inviteCode}` : '';
    const ms = RK.members().sort((x, y) => (x.uid === w.ownerUid ? -1 : y.uid === w.ownerUid ? 1 : 0));
    const memberRows = ms.map((m) => {
      const isOwner = m.uid === w.ownerUid, isMe = m.uid === RK.uid, editable = isWAdmin() && !isOwner && w.kind === 'group';
      return `<div class="member">${AV.html(m.avatar, 34)}<div class="nm">${esc(m.nick)}${isMe ? ' <span class="faint">(คุณ)</span>' : ''}${isOwner ? ' <span class="pill yellow">เจ้าของ</span>' : ''}<div class="faint" style="font-size:12px;font-weight:400">@${esc(m.handle)}</div></div>
        ${editable ? `<select data-change="role" data-uid="${m.uid}">${['admin', 'editor', 'viewer'].map((r) => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${ROLE_TH[r]}</option>`).join('')}</select>` : `<span class="faint" style="font-size:13px">${ROLE_TH[m.role]}</span>`}
        ${isWAdmin() && !isOwner ? `<button class="icon-btn del" data-act="rm-member" data-uid="${m.uid}" aria-label="เอาออก"><i class="ti ti-user-minus"></i></button>` : ''}</div>`;
    }).join('');
    return `<div class="page-head"><div><h1>กระเป๋าและการแชร์</h1><p>เงินส่วนตัวมีแค่คุณที่เห็น ส่วนกลุ่มเห็นเฉพาะสมาชิก</p></div></div>
      ${RK.mode === 'local' ? `<div class="notice yellow" style="margin-bottom:16px"><i class="ti ti-plug-connected-x"></i><div><b>ตอนนี้เป็นโหมดทดลอง</b> ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ถ้าจะส่งให้เพื่อนใช้จริง ให้เชื่อม Firebase ตามคู่มือ</div></div>` : ''}
      <div class="grid g-main">
        <div class="stack"><section class="card">
          <div class="card-head"><h2><i class="ti ${w.kind === 'personal' ? 'ti-lock' : 'ti-users-group'}" style="color:var(--purple)"></i>${esc(walletTitle())}</h2>${isWAdmin() && w.kind === 'group' ? '<button class="btn ghost sm" data-act="rename-wallet"><i class="ti ti-pencil"></i>เปลี่ยนชื่อ</button>' : ''}</div>
          ${w.kind === 'group' ? `<label class="f">ลิงก์เชิญ (เพื่อนกดแล้วสมัครด้วย ID ใช้งานได้ทันที ไม่ต้องรออนุมัติ)</label>
            <div class="link-box"><code>${esc(link)}</code><button class="btn blue sm" data-act="copy-link"><i class="ti ti-copy"></i>คัดลอก</button></div>
            <div style="display:flex;gap:8px;margin:10px 0 18px;flex-wrap:wrap"><a class="btn in sm" style="text-decoration:none" target="_blank" rel="noopener" href="https://line.me/R/msg/text/?${encodeURIComponent('มาเก็บเงินด้วยกันที่ Ror-Korn "' + w.name + '" ' + link)}"><i class="ti ti-brand-line"></i>ส่งทาง LINE</a>
            ${isWAdmin() ? '<button class="btn ghost sm" data-act="reset-invite"><i class="ti ti-refresh"></i>สร้างลิงก์ใหม่</button>' : ''}</div>`
            : w.ownerUid === RK.uid ? `<div class="notice purple" style="margin-bottom:14px"><i class="ti ti-lock"></i><div>กระเป๋านี้<b>มีแค่คุณที่เห็น</b> ถ้าอยากให้ใครช่วยดู ใส่ ID ของเขาด้านล่าง เขาจะดูได้อย่างเดียว</div></div>` : `<div class="notice blue" style="margin-bottom:14px"><i class="ti ti-eye"></i><div>${esc(who(w.ownerUid).nick)} ให้คุณดูกระเป๋านี้ได้อย่างเดียว</div></div>`}
          <label class="f">${w.kind === 'group' ? 'สมาชิก' : 'คนที่ดูกระเป๋านี้ได้'} (${ms.length})</label>${memberRows}
          ${isWAdmin() ? `<form class="row-form" data-form="add-member" style="margin-top:12px"><input class="input" name="id" data-k="am-id" placeholder="ใส่ ID เพื่อน เช่น beam_99" required autocapitalize="off">
            ${w.kind === 'group' ? `<select class="input" name="role" style="width:auto"><option value="editor">เพิ่มรายการได้</option><option value="viewer">ดูอย่างเดียว</option><option value="admin">แอดมิน</option></select>` : '<input type="hidden" name="role" value="viewer">'}
            <button class="btn sm" type="submit"><i class="ti ti-user-plus"></i>เพิ่ม</button></form>` : ''}
          ${w.kind === 'group' && w.ownerUid !== RK.uid ? '<button class="btn danger-ghost sm" style="margin-top:16px" data-act="leave"><i class="ti ti-door-exit"></i>ออกจากกลุ่ม</button>' : ''}
          ${w.kind === 'personal' && w.ownerUid !== RK.uid ? '<button class="btn danger-ghost sm" style="margin-top:16px" data-act="leave"><i class="ti ti-eye-off"></i>เลิกดูกระเป๋านี้</button>' : ''}
          ${w.kind === 'group' && w.ownerUid === RK.uid ? '<button class="btn danger-ghost sm" style="margin-top:16px" data-act="del-wallet"><i class="ti ti-trash"></i>ลบกลุ่มนี้</button>' : ''}
        </section>
        <section class="card"><h2 style="margin-bottom:10px"><i class="ti ti-shield-check" style="color:var(--in)"></i>ใครทำอะไรได้บ้าง</h2><div class="faint" style="font-size:14px;line-height:1.8">
          <div><b class="muted">แอดมิน</b> เพิ่มรายการ เพิ่ม/เอาสมาชิกออก เปลี่ยนสิทธิ์</div><div><b class="muted">เพิ่มรายการได้</b> จดรายการ ตั้งเป้าหมาย หยอดเงิน</div><div><b class="muted">ดูอย่างเดียว</b> ดูได้ แต่แก้อะไรไม่ได้</div><div>ทุกคน<b class="muted">แก้และลบได้เฉพาะรายการของตัวเอง</b></div></div></section></div>
        <div class="stack">
          <section class="card"><h2 style="margin-bottom:12px"><i class="ti ti-wallet" style="color:var(--yellow-d)"></i>กระเป๋าของฉัน</h2>
            ${RK.wallets.map((x) => `<button class="wallet-item ${x.id === RK.wid ? 'on' : ''}" data-act="pick-wallet" data-id="${x.id}"><span class="wi" style="background:${x.kind === 'personal' ? 'var(--purple-bg)' : 'var(--in-bg)'};color:${x.kind === 'personal' ? 'var(--purple-d)' : 'var(--in-d)'}"><i class="ti ${x.kind === 'personal' ? (x.ownerUid === RK.uid ? 'ti-lock' : 'ti-eye') : 'ti-users-group'}"></i></span>
              <span style="flex:1;min-width:0"><b>${esc(walletTitle(x))}</b><br><span class="faint" style="font-size:12.5px">${x.kind === 'personal' ? (x.ownerUid === RK.uid ? 'ส่วนตัว' : 'ดูอย่างเดียว') : 'กลุ่ม · ' + (x.memberUids || []).length + ' คน'} · ${ROLE_TH[x.members[RK.uid]]}</span></span>${x.id === RK.wid ? '<i class="ti ti-check" style="color:var(--purple-d)"></i>' : ''}</button>`).join('')}</section>
          <section class="card"><h2 style="margin-bottom:10px"><i class="ti ti-users-plus" style="color:var(--in)"></i>สร้างกลุ่มใหม่</h2><p class="faint" style="margin:0 0 10px;font-size:13.5px">เช่น ค่าอาหารร่วม ค่าห้อง หรือทริปเที่ยว</p>
            <form class="row-form" data-form="new-group"><input class="input" name="name" data-k="ng-name" placeholder="ชื่อกลุ่ม" required maxlength="60"><button class="btn in sm" type="submit"><i class="ti ti-plus"></i>สร้าง</button></form></section>
          <section class="card"><h2 style="margin-bottom:10px"><i class="ti ti-link" style="color:var(--blue)"></i>มีลิงก์เชิญ?</h2>
            <form class="row-form" data-form="join"><input class="input" name="code" data-k="join-code" placeholder="วางลิงก์หรือโค้ด" required><button class="btn blue sm" type="submit">เข้าร่วม</button></form></section>
        </div>
      </div>`;
  }

  /* ---------------- หน้า: สมาชิก (เจ้าของเว็บ) ---------------- */
  function viewMembers() {
    const all = RK.allUsers.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const groups = { pending: all.filter((u) => u.status === 'pending'), active: all.filter((u) => u.status === 'active'), blocked: all.filter((u) => u.status === 'rejected' || u.status === 'suspended') };
    const list = groups[ui.members];
    const tabs = [['pending', 'รออนุมัติ'], ['active', 'ใช้งานอยู่'], ['blocked', 'ปฏิเสธ/ระงับ']];
    return `<div class="page-head"><div><h1>สมาชิก</h1><p>คนที่สมัครเองต้องรอคุณอนุมัติก่อน ส่วนคนที่เข้าผ่านลิงก์เชิญใช้ได้ทันที</p></div></div>
      <div class="grid g3" style="margin-bottom:16px">
        <div class="kpi plain" style="background:var(--yellow-bg)"><div class="lab" style="color:#8A5A00"><i class="ti ti-clock"></i>รออนุมัติ</div><div class="val" style="color:#6B4500">${groups.pending.length}</div></div>
        <div class="kpi in"><div class="lab"><i class="ti ti-user-check"></i>ใช้งานอยู่</div><div class="val">${groups.active.length}</div></div>
        <div class="kpi plain"><div class="lab muted"><i class="ti ti-user-x"></i>ปฏิเสธ/ระงับ</div><div class="val">${groups.blocked.length}</div></div>
      </div>
      <section class="card"><div class="tabs2" style="margin-bottom:12px">${tabs.map(([k, l]) => `<button class="${ui.members === k ? 'on' : ''}" data-act="mem-tab" data-v="${k}">${l} (${groups[k].length})</button>`).join('')}</div>
        ${list.length ? list.map((u) => `<div class="member">${AV.html(u.avatar, 40)}<div class="nm">${esc(u.nick)} ${u.handle === RK.ADMIN ? '<span class="pill yellow">เจ้าของเว็บ</span>' : ''}<div class="faint" style="font-size:12.5px;font-weight:400">@${esc(u.handle)} · สมัคร ${u.createdAt ? ago(u.createdAt) : '—'} · ${u.via === 'invite' ? 'เข้าผ่านลิงก์เชิญ' : 'สมัครเอง'}${u.status === 'suspended' ? ' · ระงับ' : u.status === 'rejected' ? ' · ปฏิเสธ' : ''}</div></div>
          ${u.handle === RK.ADMIN ? '' : u.status === 'pending' ? `<button class="btn in sm" data-act="set-status" data-uid="${u.id}" data-s="active"><i class="ti ti-check"></i>อนุมัติ</button><button class="btn danger-ghost sm" data-act="set-status" data-uid="${u.id}" data-s="rejected">ปฏิเสธ</button>`
            : u.status === 'active' ? `<button class="btn danger-ghost sm" data-act="set-status" data-uid="${u.id}" data-s="suspended"><i class="ti ti-ban"></i>ระงับ</button>`
            : `<button class="btn ghost sm" data-act="set-status" data-uid="${u.id}" data-s="active"><i class="ti ti-refresh"></i>เปิดใช้งาน</button>`}</div>`).join('')
          : `<div class="empty">${ui.members === 'pending' ? 'ไม่มีคนรออนุมัติ' : 'ไม่มีรายชื่อ'}</div>`}
      </section>`;
  }

  /* ---------------- หน้า: ตั้งค่า ---------------- */
  function viewSettings() {
    const me = RK.me;
    return `<div class="page-head"><div><h1>ตั้งค่า</h1><p>เปลี่ยนรูป ชื่อเล่น และรหัสผ่าน</p></div><button class="btn ghost" data-act="logout"><i class="ti ti-logout"></i>ออกจากระบบ</button></div>
      <div class="grid g2">
        <section class="card"><h2 style="margin-bottom:14px"><i class="ti ti-user-circle" style="color:var(--purple)"></i>โปรไฟล์</h2>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">${AV.html(me.avatar, 88, 'big')}<div><div class="display" style="font-size:22px">${esc(me.nick)}</div><div class="faint">@${esc(me.handle)}</div><button class="btn yellow sm" style="margin-top:8px" data-act="pick-avatar"><i class="ti ti-camera"></i>เปลี่ยนรูป</button></div></div>
          <div class="field"><label class="f">ID (ใช้เข้าสู่ระบบ)</label><div class="input locked"><i class="ti ti-lock"></i>${esc(me.handle)}<span class="faint" style="margin-left:auto;font-size:12.5px">เปลี่ยนไม่ได้</span></div></div>
          <form data-form="nick"><label class="f" for="s-nick">ชื่อเล่น</label><div class="row-form"><input class="input" id="s-nick" name="nick" data-k="s-nick" value="${esc(me.nick)}" maxlength="40" required><button class="btn sm" type="submit">บันทึก</button></div></form>
        </section>
        <section class="card"><h2 style="margin-bottom:14px"><i class="ti ti-key" style="color:var(--yellow-d)"></i>เปลี่ยนรหัสผ่าน</h2>
          <form data-form="password">
            <div class="field"><label class="f" for="p-old">รหัสผ่านเดิม</label><input class="input" id="p-old" name="old" type="password" autocomplete="current-password" required></div>
            <div class="field"><label class="f" for="p-new">รหัสผ่านใหม่</label><input class="input" id="p-new" name="new1" type="password" autocomplete="new-password" minlength="6" required></div>
            <div class="field"><label class="f" for="p-new2">ยืนยันรหัสผ่านใหม่</label><input class="input" id="p-new2" name="new2" type="password" autocomplete="new-password" minlength="6" required></div>
            <div class="err" data-err></div>
            <button class="btn dark block" type="submit"><i class="ti ti-check"></i>เปลี่ยนรหัสผ่าน</button>
          </form>
        </section>
      </div>`;
  }

  /* ---------------- หน้าเข้าสู่ระบบ / รออนุมัติ ---------------- */
  const GATE = `<svg class="gate" viewBox="0 0 520 210" aria-hidden="true">
    <g opacity=".9"><circle cx="400" cy="92" r="70" fill="none" stroke="#8C7CF0" stroke-width="5"/>
    ${Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return `<line x1="400" y1="92" x2="${(400 + 70 * Math.cos(a)).toFixed(1)}" y2="${(92 + 70 * Math.sin(a)).toFixed(1)}" stroke="#C6BEF7" stroke-width="2"/><circle cx="${(400 + 70 * Math.cos(a)).toFixed(1)}" cy="${(92 + 70 * Math.sin(a)).toFixed(1)}" r="9" fill="${['#F07FA6', '#FFC23D', '#0E9F78', '#4D9BEF', '#E2603B'][i % 5]}"/>`; }).join('')}
    <path d="M400 92 L370 200 M400 92 L430 200" stroke="#5B6283" stroke-width="6"/></g>
    <path d="M10 170 C60 170 70 90 120 90 C170 90 170 150 210 150" stroke="#5B6283" stroke-width="5" fill="none"/>
    <rect x="150" y="70" width="34" height="140" rx="8" fill="#C2507A"/><rect x="146" y="64" width="34" height="146" rx="8" fill="#F07FA6"/>
    <rect x="336" y="70" width="34" height="140" rx="8" fill="#C2507A"/><rect x="332" y="64" width="34" height="146" rx="8" fill="#F07FA6"/>
    <path d="M146 72 Q256 -8 366 72" stroke="#16244F" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M146 72 Q256 -8 366 72" stroke="#FFC23D" stroke-width="6" fill="none" stroke-dasharray="2 12" stroke-linecap="round"/>
    <rect x="196" y="40" width="120" height="34" rx="12" fill="#16244F"/>
    <text x="256" y="63" text-anchor="middle" font-family="Mitr, sans-serif" font-size="18" fill="#fff">Ror-Korn</text>
    <path d="M140 60 l12 -24 l12 24z M326 60 l12 -24 l12 24z" fill="#FFC23D"/></svg>`;
  let signupAvatar = 'a1';
  function renderAuth(snap) {
    const signup = ui.authMode === 'signup', invited = sessionStorage.getItem('rk-join');
    $app.innerHTML = `<div class="auth">${GATE}
      <form class="card" data-form="auth" novalidate>
        <h1>${signup ? 'ซื้อบัตรเข้าสวนสนุก' : 'ยินดีต้อนรับสู่ Ror-Korn'}</h1>
        <p class="lead">${signup ? (invited ? 'สมัครผ่านลิงก์เชิญ ใช้งานได้ทันที' : 'สมัครแล้วรอเจ้าของเว็บอนุมัติก่อนนะ') : 'สวนสนุกแห่งการเก็บเงิน'}</p>
        ${invited ? '<div class="notice purple" style="margin-bottom:14px"><i class="ti ti-mail-heart"></i><div>คุณได้รับเชิญเข้ากลุ่ม สมัครหรือเข้าสู่ระบบแล้วจะเข้ากลุ่มให้อัตโนมัติ</div></div>' : ''}
        <div class="field"><label class="f" for="a-id">ID</label><input class="input" id="a-id" name="id" data-k="a-id" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="20" required>${signup ? '<div class="faint" style="font-size:12.5px;margin-top:4px">ภาษาอังกฤษตัวเล็ก ตัวเลข หรือ _ ยาว 3–20 ตัว เปลี่ยนภายหลังไม่ได้</div>' : ''}</div>
        ${signup ? `<div class="field"><label class="f" for="a-nick">ชื่อเล่น</label><input class="input" id="a-nick" name="nick" data-k="a-nick" maxlength="40" placeholder="ชื่อที่เพื่อนจะเห็น"></div>` : ''}
        <div class="field"><label class="f" for="a-pass">รหัสผ่าน</label><input class="input" id="a-pass" name="pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required></div>
        ${signup ? `<div class="field"><label class="f" for="a-pass2">ยืนยันรหัสผ่าน</label><input class="input" id="a-pass2" name="pass2" type="password" autocomplete="new-password" required></div>
          <div class="field"><label class="f">เลือกรูปโปรไฟล์ (เปลี่ยนทีหลังได้)</label><div class="avatar-pick">${AV.LIST.map((a) => `<button type="button" class="${signupAvatar === a.key ? 'on' : ''}" data-act="signup-avatar" data-k="${a.key}" aria-label="อวตาร ${a.key}">${AV.html(a.key, 44)}</button>`).join('')}</div></div>` : ''}
        <div class="err" data-err></div>
        <button class="btn ${signup ? 'pink' : ''} block" type="submit" style="margin-top:6px"><i class="ti ${signup ? 'ti-ticket' : 'ti-door-enter'}"></i>${signup ? 'สมัครสมาชิก' : 'เข้าสวนสนุก'}</button>
        <div class="swap">${signup ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'} <button type="button" data-act="auth-swap">${signup ? 'เข้าสู่ระบบ' : 'สมัครใหม่'}</button></div>
        ${RK.mode === 'local' ? '<div class="notice yellow" style="margin-top:16px"><i class="ti ti-flask"></i><div>โหมดทดลอง: ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น</div></div>' : ''}
      </form></div>`;
    if (snap) { $app.querySelectorAll('[data-k]').forEach((el) => { if (el.tagName === 'INPUT' && snap.map[el.dataset.k] !== undefined) el.value = snap.map[el.dataset.k]; }); }
    const f = $app.querySelector('#a-id'); if (f && !f.value) f.focus();
  }
  function renderWaiting() {
    const me = RK.me || {}, pending = RK.phase === 'pending';
    $app.innerHTML = `<div class="auth">${GATE}<div class="card" style="text-align:center">
      ${AV.html(me.avatar, 80, 'big')}
      <h1 style="margin-top:10px">${pending ? 'รอเจ้าของตอบรับ' : 'บัญชีนี้ใช้งานไม่ได้'}</h1>
      <p class="lead">${pending ? `สวัสดี ${esc(me.nick)} (@${esc(me.handle)})<br>เจ้าของเว็บจะได้รับแจ้งเตือน พออนุมัติแล้วหน้านี้จะเปิดให้เองอัตโนมัติ` : `บัญชี @${esc(me.handle)} ${me.status === 'suspended' ? 'ถูกระงับการใช้งาน' : 'ไม่ได้รับการอนุมัติ'} ติดต่อเจ้าของเว็บได้เลย`}</p>
      ${pending ? `<form class="row-form" data-form="activate" style="margin:10px 0 16px"><input class="input" name="code" data-k="act-code" placeholder="มีลิงก์เชิญ? วางตรงนี้เพื่อเข้าใช้ทันที"><button class="btn blue sm" type="submit">ใช้ลิงก์</button></form>
        <div class="notice yellow" style="text-align:left"><i class="ti ti-hourglass"></i><div>กำลังรอ… ไม่ต้องรีเฟรช</div></div>` : ''}
      <button class="btn ghost block" style="margin-top:14px" data-act="logout-now"><i class="ti ti-logout"></i>ออกจากระบบ</button></div></div>`;
  }

  /* ---------------- หน้าต่าง: ปิดได้เฉพาะปุ่ม ✕ / ยกเลิก ---------------- */
  function openModal(html, onMount, wide) {
    $modal.innerHTML = `<div class="overlay"><div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    if (onMount) onMount($modal.querySelector('.sheet'));
    const f = $modal.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { $modal.innerHTML = ''; }
  const sheetHead = (t) => `<div class="sheet-head"><h2>${t}</h2><button type="button" class="icon-btn close-x" data-close aria-label="ปิดหน้าต่าง"><i class="ti ti-x"></i></button></div>`;
  function confirmBox(title, text, okLabel, onOk) {
    openModal(`${sheetHead(title)}<p class="muted" style="margin:0">${text}</p><div class="sheet-foot"><button class="btn ghost" data-close>ยกเลิก</button><button class="btn out" data-ok>${okLabel}</button></div>`, (el) => {
      el.querySelector('[data-ok]').onclick = async () => { closeModal(); try { await onOk(); } catch (e) { fail(e); } };
    });
  }
  function subLayer(html, onMount) {   // หน้าต่างซ้อน (เลือกรูป) ปิดด้วย ✕ เท่านั้น
    const prev = $modal.firstElementChild; if (prev) prev.style.display = 'none';
    const layer = document.createElement('div'); layer.className = 'overlay'; layer.innerHTML = `<div class="sheet wide">${html}</div>`;
    const done = () => { layer.remove(); if (prev) prev.style.display = ''; };
    layer.querySelector('[data-close]').addEventListener('click', (e) => { e.stopPropagation(); done(); });
    $modal.appendChild(layer); if (onMount) onMount(layer, done);
  }

  // ---- เพิ่ม / แก้ไขรายการ (+ แชร์กับเพื่อน) ----
  function txModal(t, opts = {}) {
    const edit = !!t;
    const f = t ? { ...t } : { type: 'expense', title: '', amount: '', category: '', date: todayStr(), method: 'เงินสด', note: '', icon: '' };
    let catTouched = edit, iconTouched = edit && !!t.icon;
    const sp = { on: !!opts.split && !edit, mode: 'equal', people: [RK.uid], incl: { [RK.uid]: true }, custom: {} };
    const methods = ['เงินสด', 'โอน', 'บัตร', 'QR'];
    openModal(`<form data-form="tx-modal">${sheetHead(edit ? 'แก้ไขรายการ' : 'เพิ่มรายการ')}
      <div class="seg" style="margin-bottom:16px"><button type="button" class="btn ${f.type === 'expense' ? 'out' : 'ghost'}" data-type="expense"><i class="ti ti-arrow-up-right"></i>เงินออก</button><button type="button" class="btn ${f.type === 'income' ? 'in' : 'ghost'}" data-type="income"><i class="ti ti-arrow-down-left"></i>เงินเข้า</button></div>
      <div class="icon-preview"><div class="icon-slot" data-pick-icon title="เปลี่ยนรูป"></div>
        <div style="flex:1"><label class="f" for="t-title">ชื่อรายการ</label><input class="input" id="t-title" name="title" value="${esc(f.title)}" placeholder="เช่น ซื้อลูกชิ้น" maxlength="120" required autofocus><div class="icon-hint" data-hint></div></div></div>
      <div class="icon-actions hidden" data-icon-actions><button type="button" class="btn blue sm" data-up><i class="ti ti-photo-up"></i>อัปโหลดรูป</button><button type="button" class="btn pink sm" data-cam><i class="ti ti-camera"></i>ถ่ายรูป</button><button type="button" class="btn yellow sm" data-lib><i class="ti ti-layout-grid"></i>เลือกจากคลัง</button></div>
      <input type="file" accept="image/*" class="hidden" data-file><input type="file" accept="image/*" capture="environment" class="hidden" data-file-cam>
      <div class="field"><label class="f" for="t-amt" data-amt-label>จำนวนเงิน (บาท)</label><input class="input big" id="t-amt" name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" value="${esc(f.amount)}" placeholder="0" required></div>
      ${edit ? (t.split ? '<div class="notice blue" style="margin-bottom:14px"><i class="ti ti-users"></i><div>รายการนี้มาจากการแชร์ แก้ตรงนี้จะเปลี่ยนเฉพาะในบัญชีของคุณ ไม่กระทบเพื่อน</div></div>' : '') : `<label class="share-toggle" data-share-wrap><input type="checkbox" data-share ${sp.on ? 'checked' : ''}><span><b>แชร์กับเพื่อน</b><br><span class="faint">ใส่ยอดเต็ม แล้วระบบหารให้ + แจ้งเตือนเพื่อน</span></span></label>
      <div class="split-box hidden" data-split-box></div>`}
      <div class="field"><label class="f">หมวดหมู่</label><div class="chips" data-cats></div></div>
      <div class="grid g2" style="gap:12px"><div class="field" style="margin:0"><label class="f" for="t-date">วันที่</label><input class="input" id="t-date" name="date" type="date" value="${esc(f.date)}" required></div>
        <div class="field" style="margin:0"><label class="f">ช่องทาง</label><div class="chips" data-methods>${methods.map((m) => `<button type="button" class="chip ${f.method === m ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div></div></div>
      <div class="field" style="margin-top:14px"><label class="f" for="t-note">หมายเหตุ (ไม่ใส่ก็ได้)</label><input class="input" id="t-note" name="note" value="${esc(f.note || '')}" maxlength="300"></div>
      <div class="err" data-err></div>
      <div class="sheet-foot">${edit ? '<button type="button" class="btn danger-ghost" data-del style="flex:0 0 auto"><i class="ti ti-trash"></i>ลบ</button>' : '<button type="button" class="btn ghost" data-close>ยกเลิก</button>'}<button type="submit" class="btn dark" style="flex:2" data-save><i class="ti ti-check"></i>${edit ? 'บันทึกการแก้ไข' : 'บันทึก'}</button></div>
    </form>`, (el) => {
      const form = el.querySelector('form'), slot = el.querySelector('[data-pick-icon]'), hint = el.querySelector('[data-hint]'), acts = el.querySelector('[data-icon-actions]');
      const box = el.querySelector('[data-split-box]'), shareWrap = el.querySelector('[data-share-wrap]');
      const drawCats = () => { const list = I.CATEGORIES[f.type]; if (!list.some((c) => c.id === f.category)) f.category = ''; el.querySelector('[data-cats]').innerHTML = list.map((c) => `<button type="button" class="chip ${f.category === c.id ? 'on' : ''}" data-c="${esc(c.id)}">${I.html(c.icon, 20)}${esc(c.id)}</button>`).join(''); };
      const drawIcon = () => {
        let icon = f.icon, auto = null;
        if (!iconTouched) { auto = I.match(form.title.value); icon = auto ? auto.icon : ''; if (auto && auto.category && !catTouched && I.CATEGORIES[f.type].some((c) => c.id === auto.category)) { f.category = auto.category; drawCats(); } }
        f.icon = icon;
        if (icon) { slot.className = 'icon-slot'; slot.innerHTML = I.html(icon, 76); acts.classList.add('hidden'); hint.innerHTML = auto ? (auto.custom ? 'ใช้รูปที่คุณเคยตั้งไว้ · <a href="#" data-chg>เปลี่ยนรูป</a>' : 'ระบบเลือกรูปให้จากชื่อ · <a href="#" data-chg>เปลี่ยนรูป</a>') : '<a href="#" data-chg>เปลี่ยนรูป</a>'; }
        else { slot.className = 'icon-slot none'; slot.innerHTML = '<i class="ti ti-photo-plus"></i>'; const has = form.title.value.trim(); hint.textContent = has ? 'ยังไม่มีรูปสำหรับคำนี้ เพิ่มรูปเองได้เลย' : 'พิมพ์ชื่อแล้วรูปจะขึ้นให้เอง'; acts.classList.toggle('hidden', !has); }
      };
      // ---- ส่วนแชร์ ----
      const total = () => Math.round((Number(form.amount.value) || 0) * 100) / 100;
      const shares = () => {
        const out = {};
        if (sp.mode === 'equal') {
          const ppl = sp.people.filter((u) => sp.incl[u]); const n = ppl.length; if (!n) return out;
          const cents = Math.round(total() * 100), base = Math.floor(cents / n); let rem = cents - base * n;
          ppl.forEach((u) => { out[u] = (base + (rem > 0 ? 1 : 0)) / 100; if (rem > 0) rem--; });
        } else sp.people.forEach((u) => { const v = Number(sp.custom[u]); if (v > 0) out[u] = Math.round(v * 100) / 100; });
        return out;
      };
      const drawSplit = () => {
        if (!box) return;
        const on = sp.on && f.type === 'expense';
        box.classList.toggle('hidden', !on); if (shareWrap) shareWrap.classList.toggle('hidden', f.type !== 'expense');
        el.querySelector('[data-amt-label]').textContent = on ? 'ยอดเต็มทั้งหมด (บาท)' : 'จำนวนเงิน (บาท)';
        if (!on) return;
        const sh = shares(), T = total(), sum = Math.round(Object.values(sh).reduce((a, b) => a + b, 0) * 100) / 100, diff = Math.round((T - sum) * 100) / 100;
        const cands = RK.friendCandidates().filter((u) => !sp.people.includes(u.id));
        box.innerHTML = `<div class="tabs2" style="margin-bottom:10px"><button type="button" class="${sp.mode === 'equal' ? 'on' : ''}" data-sm="equal">หารเท่ากัน</button><button type="button" class="${sp.mode === 'custom' ? 'on' : ''}" data-sm="custom">กำหนดเอง</button></div>
          ${sp.people.map((u) => `<div class="split-row">${av(u, 28)}<span class="nm">${esc(u === RK.uid ? RK.me.nick + ' (ฉัน)' : who(u).nick)}</span>
            ${sp.mode === 'equal' ? `<label class="incl"><input type="checkbox" data-incl="${u}" ${sp.incl[u] ? 'checked' : ''}>${u === RK.uid ? 'รวมฉันด้วย' : 'หาร'}</label><b class="share-amt">${sh[u] ? fmt(sh[u]) : '—'}</b>`
              : `<input class="input sm-in" type="number" min="0" step="0.01" inputmode="decimal" data-cust="${u}" value="${sp.custom[u] ?? ''}" placeholder="0">`}
            ${u !== RK.uid ? `<button type="button" class="icon-btn del" data-rmp="${u}" aria-label="เอาออก"><i class="ti ti-x"></i></button>` : '<span style="width:34px"></span>'}</div>`).join('')}
          <div class="add-friends">${cands.slice(0, 12).map((u) => `<button type="button" class="chip" data-addp="${u.id}">${AV.html(u.avatar, 20)}${esc(u.nick)}</button>`).join('')}</div>
          <div class="row-form" style="margin-top:8px"><input class="input" data-addid placeholder="หรือพิมพ์ ID เพื่อน" autocapitalize="off"><button type="button" class="btn ghost sm" data-addid-btn><i class="ti ti-user-plus"></i>เพิ่ม</button></div>
          <div class="split-sum ${sp.mode === 'custom' && Math.abs(diff) >= 0.01 ? 'warn' : 'ok'}">${sp.people.length < 2 ? '<i class="ti ti-info-circle"></i>เพิ่มเพื่อนอย่างน้อย 1 คน'
            : sp.mode === 'equal' ? `<i class="ti ti-check"></i>หาร ${Object.keys(sh).length} คน ${Object.keys(sh).length ? `คนละ ${fmt(Object.values(sh)[Object.values(sh).length - 1])} ฿` : ''}${Object.values(sh).some((v) => v !== Object.values(sh)[0]) ? ' (เศษสตางค์ไปที่คนแรก)' : ''}`
            : Math.abs(diff) < 0.01 ? '<i class="ti ti-check"></i>ยอดตรงกับยอดเต็มแล้ว' : diff > 0 ? `<i class="ti ti-alert-triangle"></i>ยังเหลือ ${baht(diff)} ที่ยังไม่ได้แบ่ง <button type="button" class="btn sm ghost" data-fill>แบ่งที่เหลือให้คนที่ยังว่าง</button>` : `<i class="ti ti-alert-triangle"></i>ใส่เกินยอดเต็มไป ${baht(-diff)}`}</div>`;
      };
      const addPerson = (uid) => { if (!sp.people.includes(uid)) { sp.people.push(uid); sp.incl[uid] = true; } drawSplit(); };
      if (box) {
        el.querySelector('[data-share]').onchange = (e) => { sp.on = e.target.checked; drawSplit(); };
        box.addEventListener('click', async (e) => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.sm) { sp.mode = b.dataset.sm; if (sp.mode === 'custom') { const sh = shares(); sp.people.forEach((u) => { if (sp.custom[u] === undefined && sh[u]) sp.custom[u] = sh[u]; }); } drawSplit(); }
          else if (b.dataset.addp) addPerson(b.dataset.addp);
          else if (b.dataset.rmp) { sp.people = sp.people.filter((u) => u !== b.dataset.rmp); delete sp.custom[b.dataset.rmp]; drawSplit(); }
          else if ('addidBtn' in b.dataset) {
            const inp = box.querySelector('[data-addid]');
            try { const u = await RK.findUserById(inp.value); if (u.id === RK.uid) throw Object.assign(new Error('นี่คือ ID ของคุณเอง'), { userFacing: true }); addPerson(u.id); } catch (er) { el.querySelector('[data-err]').textContent = er.userFacing ? er.message : 'หาไม่เจอ'; }
          } else if ('fill' in b.dataset) {
            const empty = sp.people.filter((u) => !(Number(sp.custom[u]) > 0)); if (!empty.length) return;
            const used = sp.people.reduce((s, u) => s + (Number(sp.custom[u]) || 0), 0), cents = Math.round((total() - used) * 100); if (cents <= 0) return;
            const base = Math.floor(cents / empty.length); let rem = cents - base * empty.length;
            empty.forEach((u) => { sp.custom[u] = (base + (rem > 0 ? 1 : 0)) / 100; if (rem > 0) rem--; }); drawSplit();
          }
        });
        box.addEventListener('change', (e) => { if (e.target.dataset.incl) { sp.incl[e.target.dataset.incl] = e.target.checked; drawSplit(); } });
        box.addEventListener('input', (e) => { if (e.target.dataset.cust) { sp.custom[e.target.dataset.cust] = e.target.value; const k = e.target.dataset.cust, pos = e.target.selectionStart; drawSplit(); const n = box.querySelector(`[data-cust="${k}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* number */ } } } });
        form.amount.addEventListener('input', drawSplit);
      }
      el.querySelectorAll('[data-type]').forEach((b) => b.onclick = () => { f.type = b.dataset.type; el.querySelector('[data-type="expense"]').className = 'btn ' + (f.type === 'expense' ? 'out' : 'ghost'); el.querySelector('[data-type="income"]').className = 'btn ' + (f.type === 'income' ? 'in' : 'ghost'); drawCats(); drawIcon(); drawSplit(); });
      el.querySelector('[data-cats]').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; f.category = b.dataset.c; catTouched = true; drawCats(); };
      el.querySelector('[data-methods]').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; f.method = f.method === b.dataset.m ? '' : b.dataset.m; el.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x.dataset.m === f.method)); };
      form.title.addEventListener('input', drawIcon);
      const setIcon = (v) => { f.icon = v; iconTouched = true; drawIcon(); };
      const pickLib = () => iconLibrary(setIcon);
      slot.onclick = () => (f.icon ? acts.classList.toggle('hidden') : pickLib());
      hint.onclick = (e) => { if (e.target.closest('[data-chg]')) { e.preventDefault(); acts.classList.toggle('hidden'); } };
      el.querySelector('[data-lib]').onclick = pickLib;
      const fileIn = el.querySelector('[data-file]'), camIn = el.querySelector('[data-file-cam]');
      el.querySelector('[data-up]').onclick = () => fileIn.click(); el.querySelector('[data-cam]').onclick = () => camIn.click();
      const onFile = async (e) => { const file = e.target.files[0]; if (!file) return; try { setIcon(await shrinkImage(file, 128)); } catch (er) { toast('อ่านรูปไม่ได้ ลองรูปอื่นนะ', { error: true }); } e.target.value = ''; };
      fileIn.onchange = onFile; camIn.onchange = onFile;
      if (edit) el.querySelector('[data-del]').onclick = () => { closeModal(); deleteTx(t.id); };
      drawCats(); drawIcon(); drawSplit();
      form.onsubmit = async (e) => {
        e.preventDefault();
        const err = el.querySelector('[data-err]'); err.textContent = '';
        const title = form.title.value.trim(), amount = Number(form.amount.value);
        if (!title) { err.textContent = 'ใส่ชื่อรายการก่อนนะ'; form.title.focus(); return; }
        if (!(amount > 0)) { err.textContent = 'ใส่จำนวนเงินมากกว่า 0'; form.amount.focus(); return; }
        if (!f.category) f.category = f.type === 'income' ? 'รายรับอื่น' : 'อื่นๆ';
        const row = { type: f.type, title, amount, category: f.category, date: form.date.value || todayStr(), method: f.method || null, note: form.note.value.trim() || null, icon: f.icon || null };
        if (iconTouched && f.icon) I.remember(title, f.icon);
        const btn = el.querySelector('[data-save]'); btn.disabled = true;
        try {
          if (edit) await RK.updateTx(t.id, row);
          else if (sp.on && f.type === 'expense') {
            const sh = shares(); await RK.createSplit(row, sh, sp.mode);
            toast(`แชร์ "${title}" กับเพื่อน ${Object.keys(sh).filter((u) => u !== RK.uid).length} คนแล้ว ระบบแจ้งเตือนไปให้แล้ว`, { ms: 4200 });
          } else await RK.addTx(row);
          closeModal(); if (!sp.on || edit) toast(edit ? 'บันทึกการแก้ไขแล้ว' : `บันทึก "${title}" แล้ว`);
        } catch (er) { btn.disabled = false; err.textContent = er.userFacing ? er.message : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; console.error(er); }
      };
    });
  }
  function iconLibrary(onPick) {
    subLayer(`${sheetHead('เลือกรูปจากคลัง')}<div class="icon-grid">${Object.entries(I.ICONS).map(([k, v]) => `<button type="button" data-ik="${k}">${I.html(k, 52)}<span>${esc(v.label)}</span></button>`).join('')}</div>`, (layer, done) => {
      layer.querySelector('.icon-grid').onclick = (e) => { const b = e.target.closest('[data-ik]'); if (b) { onPick(b.dataset.ik); done(); } };
    });
  }
  function shrinkImage(file, size) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const s = Math.min(img.width, img.height); c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        let out = c.toDataURL('image/webp', 0.82); if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.85);
        res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }
  function deleteTx(id) {
    const t = RK.tx.find((x) => x.id === id); if (!t) return; const wid = RK.wid;
    const timer = setTimeout(async () => { try { await RK.deleteTx(id, wid); } catch (e) { fail(e); } ui.pendingDel.delete(id); render(); }, 5000);
    ui.pendingDel.set(id, timer); render();
    toast(`ลบ "${t.title}" แล้ว`, { action: 'ยกเลิก', onAction: () => { clearTimeout(ui.pendingDel.get(id)); ui.pendingDel.delete(id); render(); } });
  }
  function flushDeletes() { for (const [id, tm] of ui.pendingDel) { clearTimeout(tm); RK.deleteTx(id).catch(() => {}); } ui.pendingDel.clear(); }
  window.addEventListener('pagehide', flushDeletes);

  // ---- เป้าหมาย ----
  function goalModal(g) {
    const edit = !!g; let ride = RD.norm(g?.ride || 'track');
    const saved = g ? goalStats(g).saved : 0;
    const defDl = ymd(new Date(new Date().getFullYear() + 1, new Date().getMonth() + 1, 0));
    openModal(`<form data-form="goal-modal">${sheetHead(edit ? 'แก้ไขเป้าหมาย' : 'เป้าหมายใหม่')}
      <div class="field"><label class="f" for="g-name">ชื่อเป้าหมาย</label><input class="input" id="g-name" name="name" value="${esc(g?.name || '')}" placeholder="เช่น เที่ยวญี่ปุ่น" maxlength="60" required autofocus></div>
      <div class="grid g2" style="gap:12px"><div class="field" style="margin:0"><label class="f" for="g-target">ยอดที่ต้องการ (บาท)</label><input class="input" id="g-target" name="target" type="number" inputmode="decimal" min="1" step="0.01" value="${esc(g?.target || '')}" required></div>
        <div class="field" style="margin:0"><label class="f" for="g-dl">กำหนดเสร็จภายใน</label><input class="input" id="g-dl" name="deadline" type="date" value="${esc(g?.deadline || defDl)}" min="${todayStr()}" required></div></div>
      ${edit ? '' : '<div class="field" style="margin-top:14px"><label class="f" for="g-start">มีเงินเก็บไว้แล้ว (ไม่ใส่ก็ได้)</label><input class="input" id="g-start" name="start" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0"></div>'}
      <div class="field" style="margin-top:14px"><label class="f">เลือกเครื่องเล่น = ระดับความโหดในการเก็บ</label><div class="ride-pick" data-rides></div></div>
      <div class="notice blue" data-calc></div><div class="err" data-err></div>
      <div class="sheet-foot"><button type="button" class="btn ghost" data-close>ยกเลิก</button><button type="submit" class="btn pink" style="flex:2" data-save><i class="ti ti-check"></i>${edit ? 'บันทึกการแก้ไข' : 'สร้างเป้าหมาย'}</button></div></form>`, (el) => {
      const form = el.querySelector('form'), calc = el.querySelector('[data-calc]'), rides = el.querySelector('[data-rides]');
      const upd = () => {
        const target = Number(form.target.value) || 0, start = edit ? saved : Number(form.start?.value) || 0, dl = form.deadline.value, rem = Math.max(0, target - start);
        rides.innerHTML = Object.entries(RD.INFO).map(([k, info]) => {
          const pl = rem > 0 && dl ? planFor(k, rem, dl) : null;
          return `<div class="ride-opt ${ride === k ? 'on' : ''} ${info.cls}" data-ride="${k}" role="button" tabindex="0">${RD.ride({ id: 'pv' + k, ride: k }, 0.45, 0)}
            <div class="ro-name">${info.name}</div><span class="lv ${info.cls}">Lv.${info.lv} ${info.tag}</span>
            <div class="ro-calc">${pl ? `<b>${baht(Math.ceil(info.lv === 3 ? pl.weekly : pl.monthly))}</b>/${info.lv === 3 ? 'สัปดาห์' : 'เดือน'}<br><span>ถึงใน ${pl.months} เดือน</span>` : `<span>${info.desc}</span>`}</div></div>`;
        }).join('');
        RD.place(rides);
        if (!target) { calc.innerHTML = '<i class="ti ti-calculator"></i><div>ใส่ยอดกับวันที่ แล้วจะคำนวณให้ว่าแต่ละเครื่องเล่นต้องเก็บเท่าไหร่</div>'; return; }
        if (!dl) { calc.innerHTML = `<i class="ti ti-calculator"></i><div>ยังขาดอีก <b>${baht(rem)}</b> ใส่วันที่ด้วยนะ</div>`; return; }
        const pl = planFor(ride, rem, dl);
        calc.innerHTML = `<i class="ti ti-calculator"></i><div><b>${pl.info.name} Lv.${pl.info.lv}</b>: ยังขาด ${baht(rem)} → เก็บ <b>เดือนละ ${baht(Math.ceil(pl.monthly))}</b> (≈ สัปดาห์ละ ${baht(Math.ceil(pl.weekly))}) ถึงเส้นชัยประมาณ <b>${monthShort(pl.end)}</b>${pl.capped ? '<br>ระบบปรับยอดลงให้ไม่เกิน 60% ของเงินเหลือเฉลี่ย เพื่อให้เก็บได้จริง' : ''}</div>`;
      };
      ['input', 'change'].forEach((ev) => form.addEventListener(ev, (e) => { if (e.target.closest('[data-rides]')) return; upd(); })); upd();
      rides.onclick = (e) => { const o = e.target.closest('[data-ride]'); if (!o) return; ride = o.dataset.ride; upd(); };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const err = el.querySelector('[data-err]'), name = form.name.value.trim(), target = Number(form.target.value), dl = form.deadline.value;
        if (!name) { err.textContent = 'ตั้งชื่อเป้าหมายก่อนนะ'; return; }
        if (!(target > 0)) { err.textContent = 'ยอดที่ต้องการต้องมากกว่า 0'; return; }
        if (!dl) { err.textContent = 'ใส่วันที่กำหนดเสร็จด้วยนะ'; return; }
        const btn = el.querySelector('[data-save]'); btn.disabled = true;
        try {
          if (edit) await RK.updateGoal(g.id, { name, target, deadline: dl, ride });
          else await RK.addGoal({ name, target, deadline: dl, ride }, Number(form.start.value) || 0);
          closeModal(); toast(edit ? 'แก้ไขเป้าหมายแล้ว' : `สร้างเป้าหมาย "${name}" แล้ว`);
        } catch (er) { btn.disabled = false; err.textContent = er.userFacing ? er.message : 'บันทึกไม่สำเร็จ'; console.error(er); }
      };
    }, true);
  }
  function depositModal(g, sign) {
    const s = goalStats(g), need = Math.ceil(s.plan.info.lv === 3 ? s.plan.weekly : s.plan.monthly);
    const quick = [100, 500, 1000, need].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
    openModal(`<form>${sheetHead(sign > 0 ? `หยอดเงินเข้า "${esc(g.name)}"` : `ถอนเงินจาก "${esc(g.name)}"`)}
      <div class="field"><label class="f" for="d-amt">จำนวนเงิน (บาท)</label><input class="input big" id="d-amt" name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required autofocus></div>
      ${sign > 0 ? `<div class="chips" style="margin-bottom:14px">${quick.map((v) => `<button type="button" class="chip" data-q="${v}">${fmt(v)}${v === need ? (s.plan.info.lv === 3 ? ' (ยอดสัปดาห์นี้)' : ' (ยอดเดือนนี้)') : ''}</button>`).join('')}</div>` : `<p class="faint" style="margin-top:0">ตอนนี้มีอยู่ ${baht(s.saved)}</p>`}
      <div class="field"><label class="f" for="d-date">วันที่</label><input class="input" id="d-date" name="date" type="date" value="${todayStr()}" required></div><div class="err" data-err></div>
      <div class="sheet-foot"><button type="button" class="btn ghost" data-close>ยกเลิก</button><button type="submit" class="btn ${sign > 0 ? 'in' : 'out'}" style="flex:2"><i class="ti ti-${sign > 0 ? 'coin' : 'arrow-back-up'}"></i>${sign > 0 ? 'หยอดเลย' : 'ถอนออก'}</button></div></form>`, (el) => {
      const form = el.querySelector('form');
      el.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { form.amount.value = b.dataset.q; });
      form.onsubmit = async (e) => {
        e.preventDefault(); const err = el.querySelector('[data-err]'), amt = Number(form.amount.value);
        if (!(amt > 0)) { err.textContent = 'ใส่จำนวนเงินมากกว่า 0'; return; }
        if (sign < 0 && amt > s.saved + 1e-9) { err.textContent = `ถอนได้ไม่เกิน ${baht(s.saved)}`; return; }
        try {
          await RK.addEntry(g.id, sign * amt, form.date.value); closeModal();
          const after = s.saved + sign * amt;
          toast(sign > 0 ? (after >= s.target ? `สำเร็จแล้ว! "${g.name}" ครบ ${baht(s.target)}` : after / s.target >= 0.8 ? `ใกล้แล้วนะ สู้ๆ! เหลืออีก ${baht(s.target - after)}` : `หยอด ${baht(amt)} แล้ว เหลืออีก ${baht(Math.max(0, s.target - after))}`) : `ถอน ${baht(amt)} แล้ว`, { ms: 3800 });
        } catch (er) { err.textContent = er.userFacing ? er.message : 'บันทึกไม่สำเร็จ'; console.error(er); }
      };
    });
  }
  function historyModal(g) {
    const s = goalStats(g), rows = s.entries.slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)));
    openModal(`${sheetHead(`ประวัติ "${esc(g.name)}"`)}${rows.length ? `<div class="list-box">${rows.map((e) => { const own = e.uid === RK.uid && canAdd(); return `<div class="tx">${I.html(e.amount > 0 ? 'piggy' : 'coins', 40)}<div class="main"><div class="t1">${e.amount > 0 ? 'หยอดเงิน' : 'ถอนออก'}</div><div class="t2">${shortDate(e.date)} · ${av(e.uid, 16, 'xs')} ${esc(nick(e.uid))}</div></div><span class="amt ${e.amount > 0 ? 'in' : 'out'}">${e.amount > 0 ? '+' : '−'}${fmt(Math.abs(e.amount))}</span>${own ? `<button class="icon-btn del" data-del-entry="${e.id}" aria-label="ลบ"><i class="ti ti-trash"></i></button>` : '<span style="width:34px"></span>'}</div>`; }).join('')}</div>` : '<div class="empty">ยังไม่มีการหยอดเงิน</div>'}
      <div class="sheet-foot"><button class="btn ghost" data-close>ปิดหน้าต่าง</button></div>`, (el) => {
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-del-entry]'); if (!b) return; confirmBox('ลบรายการนี้?', 'ยอดในเป้าหมายจะถูกปรับตาม', 'ลบ', async () => { await RK.deleteEntry(b.dataset.delEntry); toast('ลบแล้ว'); }); });
    });
  }

  // ---- แจ้งเตือน ----
  function notifText(n) {
    const d = n.data || {}, f = esc(who(n.from).nick);
    switch (n.type) {
      case 'signup': return [`<b>${esc(d.nick)}</b> (@${esc(d.handle)}) สมัครสมาชิก รอคุณอนุมัติ`, 'ti-user-plus', 'members'];
      case 'approved': return ['เจ้าของเว็บอนุมัติบัญชีของคุณแล้ว ใช้งานได้เลย!', 'ti-circle-check', null];
      case 'split': return [`<b>${f}</b> แชร์ "${esc(d.title)}" ${baht(d.total)} ส่วนของคุณ <b>${baht(d.share)}</b>`, 'ti-users', 'split'];
      case 'split-accepted': return [`<b>${f}</b> รับส่วนแชร์ "${esc(d.title)}" ${baht(d.share)} แล้ว`, 'ti-check', 'split'];
      case 'split-rejected': return [`<b>${f}</b> ปฏิเสธส่วนแชร์ "${esc(d.title)}"`, 'ti-x', 'split'];
      case 'split-paid': return [`<b>${f}</b> แจ้งว่าโอนคืน "${esc(d.title)}" ${baht(d.share)} แล้ว กดยืนยันถ้าได้รับเงิน`, 'ti-cash', 'split'];
      case 'split-confirmed': return [`<b>${f}</b> ยืนยันว่าได้รับเงิน "${esc(d.title)}" แล้ว เคลียร์เรียบร้อย`, 'ti-circle-check', 'split'];
      case 'joined': return [`<b>${esc(d.nick)}</b> เข้าร่วมกลุ่ม "${esc(d.walletName)}" ผ่านลิงก์เชิญ`, 'ti-door-enter', 'share'];
      case 'added': return [`<b>${f}</b> เพิ่มคุณเข้า${d.kind === 'personal' ? 'กระเป๋าของเขา (ดูอย่างเดียว)' : `กลุ่ม "${esc(d.walletName)}"`}`, 'ti-user-plus', 'share'];
    }
    return ['แจ้งเตือน', 'ti-bell', null];
  }
  function notifModal() {
    const draw = (el) => {
      const list = RK.notifs;
      el.querySelector('[data-nlist]').innerHTML = list.length ? list.map((n) => {
        const [txt, ic, go] = notifText(n), s = n.type === 'split' ? RK.splits.find((x) => x.id === n.data.splitId) : null;
        return `<div class="notif ${n.read ? '' : 'new'}"><div class="n-ic">${n.from ? av(n.from, 36) : ''}<i class="ti ${ic}"></i></div>
          <div style="flex:1;min-width:0"><div>${txt}</div><div class="faint" style="font-size:12px">${ago(n.createdAt)}</div>
          ${s && s.status[RK.uid] === 'pending' ? `<div class="split-acts"><button class="btn in sm" data-n-accept="${s.id}"><i class="ti ti-check"></i>รับ</button><button class="btn danger-ghost sm" data-n-reject="${s.id}">ไม่ใช่ของฉัน</button></div>` : go ? `<button class="btn ghost sm" style="margin-top:6px" data-n-go="${go}">ดูรายละเอียด<i class="ti ti-arrow-right"></i></button>` : ''}</div>
          <button class="icon-btn" data-n-del="${n.id}" aria-label="ลบแจ้งเตือน"><i class="ti ti-x"></i></button></div>`;
      }).join('') : `<div class="empty"><i class="ti ti-bell-off" style="font-size:34px"></i><div>ยังไม่มีแจ้งเตือน</div></div>`;
    };
    openModal(`${sheetHead('แจ้งเตือน')}<div data-nlist class="nlist"></div><div class="sheet-foot"><button class="btn ghost" data-close>ปิดหน้าต่าง</button></div>`, (el) => {
      draw(el);
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        try {
          if (b.dataset.nAccept) { await RK.respondSplit(b.dataset.nAccept, true); toast('เพิ่มในรายจ่ายของคุณแล้ว'); draw(el); }
          else if (b.dataset.nReject) { await RK.respondSplit(b.dataset.nReject, false); toast('ปฏิเสธแล้ว'); draw(el); }
          else if (b.dataset.nGo) { closeModal(); ui.view = b.dataset.nGo; render(); }
          else if (b.dataset.nDel) { await RK.deleteNotif(b.dataset.nDel); setTimeout(() => draw(el), 60); }
        } catch (er) { fail(er); }
      });
      RK.markAllRead();
    });
  }
  function avatarModal() {
    openModal(`${sheetHead('เปลี่ยนรูปโปรไฟล์')}
      <div class="avatar-pick big">${AV.LIST.map((a) => `<button type="button" class="${RK.me.avatar === a.key ? 'on' : ''}" data-av="${a.key}">${AV.html(a.key, 64)}</button>`).join('')}</div>
      <div class="row-form" style="margin-top:14px"><button type="button" class="btn blue" data-up style="flex:1"><i class="ti ti-photo-up"></i>อัปโหลดรูปของฉัน</button><input type="file" accept="image/*" class="hidden" data-file></div>
      <div class="sheet-foot"><button class="btn ghost" data-close>ปิดหน้าต่าง</button></div>`, (el) => {
      const save = async (v) => { try { await RK.updateProfile({ avatar: v }); toast('เปลี่ยนรูปแล้ว'); closeModal(); } catch (e) { fail(e); } };
      el.querySelector('.avatar-pick').onclick = (e) => { const b = e.target.closest('[data-av]'); if (b) save(b.dataset.av); };
      const fi = el.querySelector('[data-file]'); el.querySelector('[data-up]').onclick = () => fi.click();
      fi.onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { save(await shrinkImage(f, 160)); } catch (er) { toast('อ่านรูปไม่ได้', { error: true }); } };
    });
  }

  /* ---------------- ปุ่มต่างๆ ---------------- */
  const goView = (v) => { ui.view = v; localStorage.setItem('rk-view', v); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const ACT = {
    go: (el) => goView(el.dataset.view),
    'add-tx': (el) => txModal(null, { split: el.dataset.split === '1' }),
    'edit-tx': (el) => { const t = RK.tx.find((x) => x.id === el.dataset.id); if (t) txModal(t); },
    'del-tx': (el) => deleteTx(el.dataset.id),
    'split-detail': () => goView('split'),
    'list-month': (el) => { const m = ui.list.month; ui.list.month = new Date(m.getFullYear(), m.getMonth() + Number(el.dataset.n), 1); render(); },
    'list-type': (el) => { ui.list.type = el.dataset.v; render(); },
    'an-mode': (el) => { ui.an.mode = el.dataset.v; render(); },
    'an-shift': (el) => { ui.an.anchor = shiftPeriod(ui.an.mode, ui.an.anchor, Number(el.dataset.n)); render(); },
    'mem-tab': (el) => { ui.members = el.dataset.v; render(); },
    'add-goal': () => goalModal(),
    'edit-goal': (el) => { const g = RK.goals.find((x) => x.id === el.dataset.id); if (g) goalModal(g); },
    'del-goal': (el) => { const g = RK.goals.find((x) => x.id === el.dataset.id); if (g) confirmBox('ลบเป้าหมายนี้?', `"${esc(g.name)}" และประวัติการหยอดเงินทั้งหมดจะหายไป`, 'ลบเป้าหมาย', async () => { await RK.deleteGoal(g.id); toast('ลบเป้าหมายแล้ว'); }); },
    deposit: (el) => { const g = RK.goals.find((x) => x.id === el.dataset.id); if (g) depositModal(g, Number(el.dataset.sign)); },
    history: (el) => { const g = RK.goals.find((x) => x.id === el.dataset.id); if (g) historyModal(g); },
    'pick-wallet': (el) => { RK.selectWallet(el.dataset.id); toast('เปลี่ยนไปที่ "' + walletTitle(RK.wallets.find((w) => w.id === el.dataset.id)) + '"'); },
    'copy-link': async () => { const link = `${location.origin}${location.pathname}#join=${RK.wallet.inviteCode}`; try { await navigator.clipboard.writeText(link); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย'); } catch (e) { toast(link, { ms: 8000 }); } },
    'reset-invite': () => confirmBox('สร้างลิงก์ใหม่?', 'ลิงก์เดิมที่เคยส่งไปจะใช้ไม่ได้อีก (คนที่อยู่ในกลุ่มแล้วไม่ได้รับผลกระทบ)', 'สร้างลิงก์ใหม่', async () => { await RK.resetInvite(); toast('สร้างลิงก์ใหม่แล้ว'); }),
    'rename-wallet': () => openModal(`<form>${sheetHead('เปลี่ยนชื่อกลุ่ม')}<input class="input" name="name" value="${esc(RK.wallet.name)}" maxlength="60" required autofocus><div class="sheet-foot"><button type="button" class="btn ghost" data-close>ยกเลิก</button><button class="btn" type="submit">บันทึก</button></div></form>`, (el) => { el.querySelector('form').onsubmit = async (e) => { e.preventDefault(); try { await RK.renameWallet(e.target.name.value); closeModal(); } catch (er) { fail(er); } }; }),
    'rm-member': (el) => { const m = RK.members().find((x) => x.uid === el.dataset.uid); confirmBox('เอาออกจากกระเป๋านี้?', `${esc(m?.nick)} จะมองไม่เห็นข้อมูลในกระเป๋านี้อีก (รายการที่เขาจดไว้ยังอยู่)`, 'เอาออก', async () => { await RK.removeMember(el.dataset.uid); toast('เอาออกแล้ว'); }); },
    leave: () => confirmBox('ออกจากกระเป๋านี้?', 'คุณจะมองไม่เห็นข้อมูลในกระเป๋านี้อีก จนกว่าจะได้รับเชิญใหม่', 'ออก', async () => { await RK.leaveWallet(); toast('ออกแล้ว'); }),
    'del-wallet': () => confirmBox('ลบกลุ่มนี้?', 'รายการ เป้าหมาย และสมาชิกทั้งหมดในกลุ่มจะถูกลบถาวร', 'ลบกลุ่มถาวร', async () => { await RK.deleteWallet(); toast('ลบกลุ่มแล้ว'); }),
    'set-status': async (el) => { const u = RK.allUsers.find((x) => x.id === el.dataset.uid), s = el.dataset.s; const go = async () => { await RK.setStatus(el.dataset.uid, s); toast(s === 'active' ? `อนุมัติ ${u?.nick} แล้ว` : s === 'rejected' ? 'ปฏิเสธแล้ว' : 'ระงับแล้ว'); }; if (s === 'active') await go(); else confirmBox(s === 'rejected' ? 'ปฏิเสธคนนี้?' : 'ระงับการใช้งาน?', `${esc(u?.nick)} (@${esc(u?.handle)}) จะเข้าใช้งานไม่ได้ เปิดใช้งานคืนได้ภายหลัง`, s === 'rejected' ? 'ปฏิเสธ' : 'ระงับ', go); },
    'split-accept': async (el) => { await RK.respondSplit(el.dataset.id, true); toast('เพิ่มในรายจ่ายของคุณแล้ว'); },
    'split-reject': (el) => confirmBox('ไม่ใช่ของคุณ?', 'ระบบจะแจ้งคนจ่ายว่าคุณปฏิเสธรายการนี้', 'ปฏิเสธ', async () => { await RK.respondSplit(el.dataset.id, false); toast('ปฏิเสธแล้ว'); }),
    'split-paid': async (el) => { await RK.markPaid(el.dataset.id); toast('แจ้งคนจ่ายแล้วว่าคุณโอนคืน'); },
    'split-confirm': async (el) => { await RK.confirmReceived(el.dataset.id, el.dataset.uid); toast('ยืนยันได้รับเงินแล้ว'); },
    'split-cancel': (el) => confirmBox('ยกเลิกการแชร์?', 'รายการแชร์นี้จะหายจากทุกคน (รายจ่ายที่แต่ละคนรับไปแล้วยังอยู่ ลบเองได้)', 'ยกเลิกการแชร์', async () => { await RK.cancelSplit(el.dataset.id); toast('ยกเลิกแล้ว'); }),
    notifs: () => notifModal(),
    'pick-avatar': () => avatarModal(),
    logout: () => confirmBox('ออกจากระบบ?', 'ครั้งหน้าใส่ ID กับรหัสผ่านเพื่อกลับเข้ามา', 'ออกจากระบบ', async () => { flushDeletes(); await RK.signOut(); }),
    'logout-now': async () => { await RK.signOut(); },
    'auth-swap': () => { ui.authMode = ui.authMode === 'login' ? 'signup' : 'login'; render(); },
    'signup-avatar': (el) => { signupAvatar = el.dataset.k; el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); }
  };
  document.addEventListener('click', (e) => {
    const x = e.target.closest('[data-close]');
    if (x && $modal.contains(x) && x.closest('.overlay') === $modal.firstElementChild) { closeModal(); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = ACT[el.dataset.act]; if (!fn) return;
    e.preventDefault(); e.stopPropagation();
    Promise.resolve(fn(el)).catch(fail);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]'); if (!el) return;
    const k = el.dataset.change;
    if (k === 'wallet') RK.selectWallet(el.value);
    if (k === 'list-cat') { ui.list.cat = el.value; render(); }
    if (k === 'role') RK.setRole(el.dataset.uid, el.value).then(() => toast('เปลี่ยนสิทธิ์แล้ว')).catch(fail);
  });
  let qTimer;
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-input="list-q"]'); if (!el) return; clearTimeout(qTimer); qTimer = setTimeout(() => { ui.list.q = el.value; render(); }, 200); });
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-form]'); if (!form) return;
    const kind = form.dataset.form; if (kind === 'tx-modal' || kind === 'goal-modal') return;
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form)), btn = form.querySelector('[type="submit"]');
    const errEl = form.querySelector('[data-err]'); if (errEl) errEl.textContent = '';
    if (btn) btn.disabled = true;
    try {
      if (kind === 'auth') {
        if (ui.authMode === 'signup') {
          if (fd.pass !== fd.pass2) throw Object.assign(new Error('รหัสผ่านทั้งสองช่องไม่ตรงกัน'), { userFacing: true });
          await RK.signUp({ id: fd.id, pass: fd.pass, nick: fd.nick, avatar: signupAvatar, invite: sessionStorage.getItem('rk-join') });
        } else await RK.signIn(fd.id, fd.pass);
      } else if (kind === 'new-group') { const id = await RK.createGroup(fd.name); RK._want = id; form.reset(); toast(`สร้างกลุ่ม "${fd.name.trim()}" แล้ว ส่งลิงก์ชวนเพื่อนได้เลย`); }
      else if (kind === 'join') { const raw = fd.code.trim(), m = raw.match(/join=([a-z0-9]+)/i); await RK.joinByCode(m ? m[1] : raw); form.reset(); toast('เข้าร่วมกลุ่มแล้ว'); }
      else if (kind === 'add-member') { const u = await RK.addMemberById(fd.id, fd.role); form.reset(); toast(`เพิ่ม ${u.nick} แล้ว ระบบแจ้งเตือนเขาแล้ว`); }
      else if (kind === 'nick') { await RK.updateProfile({ nick: fd.nick }); toast('เปลี่ยนชื่อเล่นแล้ว'); }
      else if (kind === 'password') {
        if (fd.new1 !== fd.new2) throw Object.assign(new Error('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'), { userFacing: true });
        await RK.changePassword(fd.old, fd.new1); form.reset(); toast('เปลี่ยนรหัสผ่านแล้ว');
      } else if (kind === 'activate') { const raw = fd.code.trim(), m = raw.match(/join=([a-z0-9]+)/i); sessionStorage.setItem('rk-join', m ? m[1] : raw); await RK.activateWithInvite(m ? m[1] : raw); }
    } catch (er) { if (errEl) errEl.textContent = er.userFacing ? er.message : 'ทำรายการไม่สำเร็จ'; else fail(er); console.error(er); }
    finally { if (btn && document.body.contains(btn)) btn.disabled = false; }
  });

  /* ---------------- เริ่มต้น ---------------- */
  function takeJoin() {
    const m = location.hash.match(/join=([a-z0-9]+)/i); if (!m) return false;
    sessionStorage.setItem('rk-join', m[1]); history.replaceState(null, '', location.pathname + location.search); return true;
  }
  window.addEventListener('hashchange', async () => {
    if (!takeJoin()) return;
    if (RK.phase === 'in') { const c = sessionStorage.getItem('rk-join'); sessionStorage.removeItem('rk-join'); try { await RK.joinByCode(c, true); toast('เข้าร่วมกลุ่มแล้ว'); } catch (e) { fail(e); } }
    else if (RK.phase === 'pending') { try { await RK.activateWithInvite(sessionStorage.getItem('rk-join')); } catch (e) { fail(e); } }
    else { ui.authMode = 'signup'; render(); }
  });
  takeJoin();
  if (sessionStorage.getItem('rk-join')) ui.authMode = 'signup';
  let lastPhase = null;
  RK.start(() => {
    if (RK.phase !== lastPhase && lastPhase === 'pending' && RK.phase === 'in') toast(`ยินดีต้อนรับ ${RK.me.nick}! บัญชีของคุณใช้งานได้แล้ว`, { ms: 4500 });
    if (RK.phase === 'out' && lastPhase && lastPhase !== 'out') closeModal();
    lastPhase = RK.phase;
    if (RK.lastError) { fail(RK.lastError); RK.lastError = null; }
    render();
  });
  render();
})();
