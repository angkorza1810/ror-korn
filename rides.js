/* Ror-Korn : เครื่องเล่น (ลู่วิ่ง / รถไฟเหาะ / ทอร์นาโด) + ฉากฉลองเมื่อสำเร็จ */
(function () {
  'use strict';
  const COLORS = ['#8C7CF0', '#0E9F78', '#F07FA6', '#4D9BEF', '#E2603B', '#E0A100'];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COASTER = 'M24 132 C80 132 96 44 156 44 C214 44 226 116 286 110 C346 104 352 18 424 22 C494 26 506 98 572 66';

  function shade(hex) {
    const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.round(v * 0.72));
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function checker(x, y, w, h, n) {
    let s = ''; const cw = w / 2, ch = h / n;
    for (let r = 0; r < n; r++) for (let k = 0; k < 2; k++) if ((r + k) % 2 === 0) s += `<rect x="${x + k * cw}" y="${y + r * ch}" width="${cw}" height="${ch}" fill="#1D2242"/>`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>` + s;
  }
  function confetti(x, y, w, h, n = 18) {
    const cs = ['#F07FA6', '#FFC23D', '#8C7CF0', '#3DDBA8', '#4D9BEF'];
    let s = ''; for (let i = 0; i < n; i++) {
      const px = x + ((i * 37) % w), py = y + ((i * 23) % h);
      s += `<rect x="${px}" y="${py}" width="6" height="10" rx="2" fill="${cs[i % 5]}" transform="rotate(${(i * 47) % 180} ${px} ${py})"/>`;
    }
    return s;
  }
  function runner(c, bob) {
    return `<g class="${bob ? 'runner-bob' : ''}">
      <ellipse cx="0" cy="24" rx="12" ry="3" fill="#000" opacity=".12"/>
      <line x1="0" y1="2" x2="-10" y2="20" stroke="#2C2C2A" stroke-width="5.5" stroke-linecap="round"/>
      <line x1="0" y1="2" x2="11" y2="18" stroke="#2C2C2A" stroke-width="5.5" stroke-linecap="round"/>
      <line x1="3" y1="-16" x2="0" y2="3" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
      <line x1="2" y1="-11" x2="-10" y2="-4" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/>
      <line x1="2" y1="-11" x2="13" y2="-15" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/>
      <circle cx="7" cy="-26" r="8" fill="#C98A0B"/><circle cx="6" cy="-27" r="8" fill="#FFC23D"/>
      <circle cx="3.5" cy="-30" r="2.2" fill="#fff" opacity=".7"/><circle cx="9" cy="-27" r="1.4" fill="#4A3000"/>
    </g>`;
  }

  /* ---------- ลู่วิ่ง Lv.1 ---------- */
  function track(c, p) {
    const x0 = 56, x1 = 540, rx = x0 + (x1 - x0) * p;
    const ms = [0.25, 0.5, 0.75].map((m) => {
      const x = x0 + (x1 - x0) * m, on = p >= m;
      return `<line x1="${x}" y1="30" x2="${x}" y2="12" stroke="#5B6283" stroke-width="2"/><path d="M${x} 12 l14 4 l-14 4z" fill="${on ? c : '#D2D8E6'}"/><text x="${x}" y="128" text-anchor="middle" font-size="12" fill="#8D93AE" font-family="Anuphan, sans-serif">${m * 100}%</text>`;
    }).join('');
    return `<svg class="ride" viewBox="0 0 600 136" role="img" aria-label="ลู่วิ่ง ${Math.round(p * 100)}%">
      <rect x="6" y="34" width="588" height="76" rx="38" fill="#C4603F"/>
      <rect x="6" y="30" width="588" height="76" rx="38" fill="#E8805F"/>
      <line x1="50" y1="55" x2="552" y2="55" stroke="#fff" stroke-width="2" opacity=".55" stroke-dasharray="14 10"/>
      <line x1="50" y1="81" x2="552" y2="81" stroke="#fff" stroke-width="2" opacity=".55" stroke-dasharray="14 10"/>
      <line x1="${x0}" y1="34" x2="${x0}" y2="102" stroke="#fff" stroke-width="4"/>
      <line x1="${x0}" y1="68" x2="${Math.max(x0, rx - 8)}" y2="68" stroke="#FFF1C2" stroke-width="7" stroke-linecap="round"/>
      ${checker(x1 + 2, 34, 12, 68, 8)}
      <line x1="${x1 + 26}" y1="104" x2="${x1 + 26}" y2="4" stroke="#5B6283" stroke-width="3" stroke-linecap="round"/>
      <g class="flag-wave">${checker(x1 + 27, 4, 22, 16, 4)}</g>
      ${ms}
      <g transform="translate(${rx} 60)">${runner(c, true)}</g>
    </svg>`;
  }

  /* ---------- รถไฟเหาะ Lv.2 ---------- */
  function coaster(c, p) {
    return `<svg class="ride coaster" data-p="${p}" data-c="${c}" viewBox="0 0 600 160" role="img" aria-label="รถไฟเหาะ ${Math.round(p * 100)}%">
      <rect x="0" y="146" width="600" height="14" rx="7" fill="#BFE3A4"/>
      <g class="supports"></g>
      <path class="cpath" d="${COASTER}" fill="none" stroke="#5B6283" stroke-width="9" stroke-linecap="round"/>
      <path d="${COASTER}" fill="none" stroke="#D2D8E6" stroke-width="3" stroke-dasharray="3 7"/>
      <path class="cpath-on" d="${COASTER}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 9999"/>
      <g class="coins"></g>
      <line x1="572" y1="66" x2="572" y2="20" stroke="#5B6283" stroke-width="3"/>
      <g class="flag-wave">${checker(573, 20, 22, 16, 4)}</g>
      <g class="cart">
        <rect x="-20" y="-20" width="40" height="18" rx="7" fill="${shade(c)}"/>
        <rect x="-20" y="-23" width="40" height="17" rx="7" fill="${c}"/>
        <circle cx="-6" cy="-29" r="6" fill="#FFC23D"/><circle cx="8" cy="-29" r="6" fill="#F07FA6"/>
        <line x1="-6" y1="-35" x2="-12" y2="-44" stroke="#FFC23D" stroke-width="3" stroke-linecap="round"/>
        <line x1="8" y1="-35" x2="14" y2="-44" stroke="#F07FA6" stroke-width="3" stroke-linecap="round"/>
        <circle cx="-11" cy="-1" r="4.5" fill="#1D2242"/><circle cx="11" cy="-1" r="4.5" fill="#1D2242"/>
        <ellipse cx="-10" cy="-19" rx="6" ry="1.6" fill="#fff" opacity=".45"/>
      </g>
    </svg>`;
  }

  /* ---------- ทอร์นาโด Lv.3 : ลูกตุ้มยักษ์ แกว่งสูงขึ้นตามเงินที่เก็บ + วงที่นั่งหมุน ---------- */
  function tornadoArm(c, p, N, filled, extra) {
    const R = 30, cy = 126;
    let seats = '';
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, x = 300 + R * Math.cos(a), y = cy + R * Math.sin(a), on = i < filled;
      seats += `<circle cx="${x.toFixed(1)}" cy="${(y + 1.5).toFixed(1)}" r="6.5" fill="${on ? shade(c) : '#C3CADB'}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="${on ? c : '#fff'}" stroke="${on ? 'none' : '#C3CADB'}" stroke-width="1.5"/>`;
    }
    return `<line x1="300" y1="34" x2="300" y2="${cy - 10}" stroke="#5B6283" stroke-width="8" stroke-linecap="round"/>
      <line x1="300" y1="34" x2="300" y2="${cy - 10}" stroke="#8D93AE" stroke-width="2.5" stroke-dasharray="4 6"/>
      <g class="tornado-ring" style="transform-origin:300px ${cy}px">
        <circle cx="300" cy="${cy}" r="${R}" fill="none" stroke="#5B6283" stroke-width="5"/>
        <circle cx="300" cy="${cy}" r="${R - 12}" fill="${c}" opacity=".18"/>
        ${seats}
        ${extra || ''}
      </g>
      <circle cx="300" cy="${cy}" r="8" fill="#FFC23D" stroke="#C98A0B" stroke-width="2.5"/>`;
  }
  function tornado(c, p) {
    const N = 12, filled = Math.round(p * N), amp = Math.round(12 + p * 68);
    return `<svg class="ride" viewBox="0 0 600 172" role="img" aria-label="ทอร์นาโด ${filled}/${N} ที่นั่ง">
      <rect x="0" y="158" width="600" height="14" rx="7" fill="#BFE3A4"/>
      <path d="M300 30 L236 162 M300 30 L364 162" stroke="#16244F" stroke-width="9" stroke-linecap="round"/>
      <path d="M262 108 L338 108" stroke="#16244F" stroke-width="5" stroke-linecap="round"/>
      <g class="tornado-swing" style="--amp:${amp}deg;transform-origin:300px 34px">${tornadoArm(c, p, N, filled)}</g>
      <circle cx="300" cy="32" r="11" fill="#F07FA6" stroke="#C2507A" stroke-width="3"/>
      <text x="100" y="76" text-anchor="middle" font-family="Mitr, sans-serif" font-size="40" fill="${c}" font-weight="500">${Math.round(p * 100)}%</text>
      <text x="100" y="100" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="13" fill="#8D93AE">แกว่งสูง ${amp}°</text>
      <text x="500" y="76" text-anchor="middle" font-family="Mitr, sans-serif" font-size="30" fill="#1D2242" font-weight="500">${filled}/${N}</text>
      <text x="500" y="100" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="13" fill="#8D93AE">ที่นั่งที่มีคนแล้ว</text>
    </svg>`;
  }

  /* ---------- ฉากฉลองเมื่อสำเร็จ ---------- */
  function firework(x, y, r, color, delay) {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, x1 = x + Math.cos(a) * r * 0.35, y1 = y + Math.sin(a) * r * 0.35, x2 = x + Math.cos(a) * r, y2 = y + Math.sin(a) * r;
      rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.6" fill="${color}"/>`;
    }
    return `<g class="fw" style="animation-delay:${delay}s;transform-origin:${x}px ${y}px">${rays}<circle cx="${x}" cy="${y}" r="3" fill="#fff"/></g>`;
  }
  function celebrate(g, avatar, idx) {
    const c = COLORS[idx % COLORS.length];
    const A = window.RKAvatars;
    const name = String(g.name || '');
    const fs = Math.max(22, Math.min(44, Math.floor(820 / Math.max(8, name.length * 1.15))));
    let stars = ''; for (let i = 0; i < 26; i++) stars += `<circle cx="${(i * 97) % 600}" cy="${(i * 53) % 150}" r="${i % 3 === 0 ? 1.8 : 1.1}" fill="#fff" opacity="${0.35 + (i % 4) * 0.15}"/>`;
    let ride = '';
    if (g.ride === 'coaster') {
      ride = `<path d="M150 232 C230 232 250 200 300 200 C350 200 370 232 450 232" fill="none" stroke="#C6BEF7" stroke-width="7" stroke-linecap="round"/>
        <g transform="translate(300 196)"><rect x="-44" y="-12" width="88" height="26" rx="10" fill="${shade(c)}"/><rect x="-44" y="-16" width="88" height="24" rx="10" fill="${c}"/>
        <circle cx="-26" cy="14" r="6" fill="#1D2242"/><circle cx="26" cy="14" r="6" fill="#1D2242"/></g>
        ${A.svgAt(avatar, 272, 140, 56)}`;
    } else if (g.ride === 'tornado') {
      ride = `<line x1="300" y1="150" x2="300" y2="178" stroke="#C6BEF7" stroke-width="6"/>
        <circle cx="300" cy="206" r="40" fill="none" stroke="#C6BEF7" stroke-width="6"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = i / 8 * Math.PI * 2; return `<circle cx="${(300 + 40 * Math.cos(a)).toFixed(1)}" cy="${(206 + 40 * Math.sin(a)).toFixed(1)}" r="7" fill="${['#F07FA6', '#FFC23D', '#3DDBA8', '#4D9BEF'][i % 4]}"/>`; }).join('')}
        ${A.svgAt(avatar, 274, 180, 52)}`;
    } else {
      ride = `<rect x="246" y="206" width="108" height="34" rx="8" fill="${shade(c)}"/><rect x="246" y="202" width="108" height="32" rx="8" fill="${c}"/>
        <text x="300" y="226" text-anchor="middle" font-family="Mitr, sans-serif" font-size="20" fill="#fff" font-weight="600">1</text>
        <path d="M352 168 h20 v8 a10 10 0 0 1 -20 0z" fill="#FFC23D"/><rect x="359" y="184" width="6" height="10" fill="#C98A0B"/><rect x="353" y="193" width="18" height="5" rx="2" fill="#C98A0B"/>
        ${A.svgAt(avatar, 272, 146, 56)}`;
    }
    return `<svg class="ride celebrate" viewBox="0 0 600 250" role="img" aria-label="สำเร็จ ${esc(name)}">
      <rect x="0" y="0" width="600" height="250" rx="26" fill="#16244F"/>
      ${stars}
      ${firework(90, 70, 46, '#F07FA6', 0)}${firework(510, 64, 50, '#FFC23D', 0.5)}${firework(170, 150, 34, '#3DDBA8', 1)}
      ${firework(440, 160, 38, '#8C7CF0', 1.4)}${firework(560, 170, 26, '#4D9BEF', 0.8)}${firework(40, 170, 28, '#FFC23D', 1.7)}
      ${confetti(200, 8, 200, 26, 14)}
      <rect x="248" y="18" width="104" height="30" rx="15" fill="#FFC23D"/>
      <text x="300" y="39" text-anchor="middle" font-family="Mitr, sans-serif" font-size="17" fill="#4A3000" font-weight="600">สำเร็จ!</text>
      <text x="300" y="${90 + fs * 0.35}" text-anchor="middle" font-family="Mitr, sans-serif" font-size="${fs}" fill="#fff" font-weight="600">${esc(name)}</text>
      ${ride}
    </svg>`;
  }

  // วางรถไฟเหาะตามเส้นทางจริง (เรียกหลังแสดงผล)
  function place(root) {
    (root || document).querySelectorAll('svg.coaster').forEach((svg) => {
      const path = svg.querySelector('.cpath'); if (!path || !path.getTotalLength) return;
      const L = path.getTotalLength(), p = Number(svg.dataset.p) || 0;
      const at = (t) => path.getPointAtLength(Math.max(0, Math.min(1, t)) * L);
      svg.querySelector('.cpath-on').setAttribute('stroke-dasharray', `${(L * p).toFixed(1)} ${L.toFixed(1)}`);
      let sup = '';
      for (let i = 1; i < 24; i++) { const q = at(i / 24); sup += `<line x1="${q.x.toFixed(1)}" y1="${(q.y + 4).toFixed(1)}" x2="${q.x.toFixed(1)}" y2="148" stroke="#C3CADB" stroke-width="3"/>`; }
      svg.querySelector('.supports').innerHTML = sup;
      svg.querySelector('.coins').innerHTML = [0.25, 0.5, 0.75].map((m) => { const q = at(m), on = p >= m; return `<circle cx="${q.x.toFixed(1)}" cy="${(q.y - 14).toFixed(1)}" r="7" fill="${on ? '#FFC23D' : '#fff'}" stroke="${on ? '#C98A0B' : '#C3CADB'}" stroke-width="2"/>`; }).join('');
      const a = at(p), b = at(Math.min(1, p + 0.01)), a0 = at(Math.max(0, p - 0.01));
      const ang = Math.atan2(b.y - a0.y, b.x - a0.x) * 180 / Math.PI;
      svg.querySelector('.cart').setAttribute('transform', `translate(${a.x.toFixed(1)} ${(a.y - 3).toFixed(1)}) rotate(${ang.toFixed(1)})`);
    });
  }

  window.RKRides = {
    COLORS,
    INFO: {
      track: { name: 'ลู่วิ่ง', lv: 1, tag: 'เพลย์เซฟ', desc: 'เก็บสบายๆ หยอดเท่าไหร่ก็นับ', factor: 1, cls: 'lv1' },
      coaster: { name: 'รถไฟเหาะ', lv: 2, tag: 'โหดขึ้น', desc: 'เร็วกว่าแผนประมาณ 30%', factor: 0.7, cls: 'lv2' },
      tornado: { name: 'ทอร์นาโด', lv: 3, tag: 'โหดสุด', desc: 'ถึงเป้าในครึ่งเวลา', factor: 0.5, cls: 'lv3' }
    },
    norm(r) { return r === 'wheel' ? 'tornado' : (r === 'coaster' || r === 'tornado' ? r : 'track'); },
    ride(g, p, idx) {
      const c = COLORS[idx % COLORS.length], r = this.norm(g.ride);
      return r === 'coaster' ? coaster(c, p) : r === 'tornado' ? tornado(c, p) : track(c, p);
    },
    celebrate, place
  };
})();
