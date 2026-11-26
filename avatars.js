/* Ror-Korn : อวตารสำเร็จรูป 16 แบบ (วาดด้วย SVG สไตล์ดินปั้น) */
(function () {
  'use strict';
  const SK = { light: ['#FFE0C7', '#E9B994'], tan: ['#F3C59B', '#D49B6A'], brown: ['#C98B5E', '#A06A40'], deep: ['#8D5A3B', '#6B4128'] };
  const P = [
    { bg: '#EEEBFF', shirt: '#8C7CF0', skin: 'light', hair: 'short', hc: '#2C2C2A' },
    { bg: '#FDE9F0', shirt: '#F07FA6', skin: 'light', hair: 'long', hc: '#6B3A1E', earring: true },
    { bg: '#E3F0FF', shirt: '#4D9BEF', skin: 'tan', hair: 'spiky', hc: '#1D2242', glasses: true },
    { bg: '#FFF3D6', shirt: '#E2603B', skin: 'light', hair: 'bob', hc: '#2C2C2A', bow: '#F07FA6' },
    { bg: '#DCF5EC', shirt: '#0E9F78', skin: 'light', hair: 'side', hc: '#E0A100' },
    { bg: '#FDE6DC', shirt: '#C2507A', skin: 'tan', hair: 'bun', hc: '#4A2A14' },
    { bg: '#E3F0FF', shirt: '#16244F', skin: 'brown', hair: 'cap', hc: '#2C2C2A', cap: '#E2603B' },
    { bg: '#EEEBFF', shirt: '#FFC23D', skin: 'light', hair: 'pony', hc: '#8A4B22' },
    { bg: '#FFF3D6', shirt: '#4D9BEF', skin: 'deep', hair: 'curly', hc: '#1D1D1D' },
    { bg: '#DCF5EC', shirt: '#8C7CF0', skin: 'brown', hair: 'short', hc: '#1D1D1D', glasses: true },
    { bg: '#FDE9F0', shirt: '#16244F', skin: 'tan', hair: 'long', hc: '#1D1D1D', earring: true },
    { bg: '#FDE6DC', shirt: '#0E9F78', skin: 'light', hair: 'side', hc: '#6B3A1E', glasses: true },
    { bg: '#FDE9F0', shirt: '#8C7CF0', skin: 'light', hair: 'bob', hc: '#F07FA6' },
    { bg: '#E3F0FF', shirt: '#FFC23D', skin: 'light', hair: 'spiky', hc: '#4D9BEF' },
    { bg: '#EEEBFF', shirt: '#E2603B', skin: 'brown', hair: 'curly', hc: '#6B3A1E', bow: '#FFC23D' },
    { bg: '#FFF3D6', bear: true }
  ];

  function hairBack(h, c) {
    if (h === 'long') return `<path d="M15 30 Q14 12 32 11 Q50 12 49 30 L51 50 Q42 46 32 46 Q22 46 13 50Z" fill="${c}"/>`;
    if (h === 'bob') return `<path d="M16 30 Q15 12 32 11 Q49 12 48 30 L48 40 Q40 43 32 43 Q24 43 16 40Z" fill="${c}"/>`;
    if (h === 'pony') return `<ellipse cx="47" cy="30" rx="6" ry="10" fill="${c}" transform="rotate(-20 47 30)"/>`;
    if (h === 'bun') return `<circle cx="32" cy="10" r="7" fill="${c}"/>`;
    return '';
  }
  function hairFront(h, c, o) {
    switch (h) {
      case 'short': return `<path d="M18 29 Q17 12 32 12 Q47 12 46 29 Q44 20 38 18 Q32 22 24 19 Q20 22 18 29Z" fill="${c}"/>`;
      case 'spiky': return `<path d="M18 28 L17 16 L22 19 L24 10 L29 16 L32 8 L35 16 L40 10 L42 19 L47 16 L46 28 Q40 19 32 20 Q24 19 18 28Z" fill="${c}"/>`;
      case 'side': return `<path d="M18 29 Q16 12 33 11 Q48 12 46 27 Q41 17 27 21 Q21 23 18 29Z" fill="${c}"/>`;
      case 'long': case 'bob': return `<path d="M18 27 Q19 13 32 13 Q45 13 46 27 Q38 20 30 22 Q24 21 18 27Z" fill="${c}"/>`;
      case 'bun': case 'pony': return `<path d="M18 27 Q19 13 32 13 Q45 13 46 27 Q40 18 32 19 Q24 18 18 27Z" fill="${c}"/>`;
      case 'curly': return [[20, 21], [25, 15], [32, 13], [39, 15], [44, 21], [22, 27], [42, 27]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/>`).join('');
      case 'cap': return `<path d="M17 25 Q17 11 32 11 Q47 11 47 25Z" fill="${o.cap}"/><path d="M30 25 L52 25 Q52 29 46 29 L30 29Z" fill="${o.cap}"/><path d="M17 25 L47 25" stroke="#000" stroke-opacity=".15" stroke-width="2"/><circle cx="32" cy="12" r="2" fill="#fff" opacity=".7"/>`;
    }
    return '';
  }
  function person(o) {
    const [skin, skinD] = SK[o.skin];
    return `<circle cx="32" cy="32" r="32" fill="${o.bg}"/>
      ${hairBack(o.hair, o.hc)}
      <path d="M10 64 Q11 46 32 45 Q53 46 54 64Z" fill="${o.shirt}"/>
      <path d="M10 64 Q11 46 32 45 Q53 46 54 64Z" fill="#000" opacity=".08" transform="translate(0 2)"/>
      <rect x="27" y="38" width="10" height="9" rx="4" fill="${skinD}"/>
      <circle cx="18" cy="31" r="3.5" fill="${skinD}"/><circle cx="46" cy="31" r="3.5" fill="${skinD}"/>
      <circle cx="32" cy="29" r="14" fill="${skin}"/>
      <ellipse cx="27" cy="23" rx="4" ry="2.2" fill="#fff" opacity=".35"/>
      ${hairFront(o.hair, o.hc, o)}
      <circle cx="27" cy="30" r="1.9" fill="#2C2C2A"/><circle cx="37" cy="30" r="1.9" fill="#2C2C2A"/>
      <circle cx="27.6" cy="29.4" r=".6" fill="#fff"/><circle cx="37.6" cy="29.4" r=".6" fill="#fff"/>
      <circle cx="23.5" cy="34" r="2.4" fill="#F07FA6" opacity=".35"/><circle cx="40.5" cy="34" r="2.4" fill="#F07FA6" opacity=".35"/>
      <path d="M28.5 35 Q32 38.5 35.5 35" stroke="#8E2F14" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${o.glasses ? '<circle cx="27" cy="30" r="4.2" fill="none" stroke="#1D2242" stroke-width="1.5"/><circle cx="37" cy="30" r="4.2" fill="none" stroke="#1D2242" stroke-width="1.5"/><line x1="31.2" y1="30" x2="32.8" y2="30" stroke="#1D2242" stroke-width="1.5"/>' : ''}
      ${o.earring ? '<circle cx="18" cy="35.5" r="1.6" fill="#FFC23D"/><circle cx="46" cy="35.5" r="1.6" fill="#FFC23D"/>' : ''}
      ${o.bow ? `<path d="M40 14 l-5 -3 v6z M40 14 l5 -3 v6z" fill="${o.bow}"/><circle cx="40" cy="14" r="1.6" fill="${o.bow}"/>` : ''}`;
  }
  function bear(o) {
    return `<circle cx="32" cy="32" r="32" fill="${o.bg}"/>
      <circle cx="18" cy="17" r="7" fill="#A06A40"/><circle cx="46" cy="17" r="7" fill="#A06A40"/>
      <circle cx="18" cy="17" r="3.5" fill="#E9B994"/><circle cx="46" cy="17" r="3.5" fill="#E9B994"/>
      <path d="M10 64 Q11 46 32 45 Q53 46 54 64Z" fill="#F07FA6"/>
      <circle cx="32" cy="31" r="17" fill="#C98B5E"/>
      <ellipse cx="32" cy="37" rx="8" ry="6" fill="#F3D9BF"/>
      <ellipse cx="32" cy="34" rx="3" ry="2.2" fill="#2C2C2A"/>
      <path d="M29 39 Q32 41.5 35 39" stroke="#2C2C2A" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <circle cx="25" cy="28" r="2" fill="#2C2C2A"/><circle cx="39" cy="28" r="2" fill="#2C2C2A"/>
      <circle cx="21" cy="34" r="2.4" fill="#F07FA6" opacity=".4"/><circle cx="43" cy="34" r="2.4" fill="#F07FA6" opacity=".4"/>
      <ellipse cx="26" cy="21" rx="4" ry="2" fill="#fff" opacity=".3"/>`;
  }

  const LIST = P.map((o, i) => ({ key: 'a' + (i + 1), bg: o.bg, color: o.shirt || '#C98B5E', svg: o.bear ? bear(o) : person(o) }));
  let n = 0;
  window.RKAvatars = {
    LIST,
    color(v) { const a = LIST.find((x) => x.key === v); return a ? a.color : '#8C7CF0'; },
    inner(v) { const a = LIST.find((x) => x.key === v) || LIST[0]; return a.svg; },
    html(v, size = 32, cls = '') {
      if (v && String(v).startsWith('data:image')) return `<img class="avt ${cls}" src="${v}" width="${size}" height="${size}" alt="">`;
      const a = LIST.find((x) => x.key === v) || LIST[0];
      const id = 'av' + (++n);
      return `<svg class="avt ${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><clipPath id="${id}"><circle cx="32" cy="32" r="32"/></clipPath><g clip-path="url(#${id})">${a.svg}</g></svg>`;
    },
    // ใช้วางใน SVG อื่น (ฉากฉลอง)
    svgAt(v, x, y, size) {
      const id = 'avs' + (++n);
      if (v && String(v).startsWith('data:image')) return `<clipPath id="${id}"><circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}"/></clipPath><image href="${v}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/><circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="none" stroke="#fff" stroke-width="3"/>`;
      const a = LIST.find((k) => k.key === v) || LIST[0];
      return `<g transform="translate(${x} ${y}) scale(${size / 64})"><clipPath id="${id}"><circle cx="32" cy="32" r="32"/></clipPath><g clip-path="url(#${id})">${a.svg}</g><circle cx="32" cy="32" r="31" fill="none" stroke="#fff" stroke-width="3"/></g>`;
    }
  };
})();
