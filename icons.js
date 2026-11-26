/* ออมดีแลนด์ : ชุดไอคอนดินปั้น + พจนานุกรมคำ -> ไอคอน + หมวดหมู่ */
(function () {
  'use strict';
  const T = (bg) => `<rect width="64" height="64" rx="18" fill="${bg}"/>`;
  const S = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".08"/>`;
  const H = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".5"/>`;

  const ICONS = {
    meatball: { label: 'ลูกชิ้น / ปิ้งย่าง', svg: T('#FAECE7') + S(32, 55, 16, 3) + '<line x1="16" y1="51" x2="48" y2="11" stroke="#BA7517" stroke-width="3" stroke-linecap="round"/>' +
      [[22, 42, '#993C1D'], [30, 32.5, '#D85A30'], [38, 23, '#993C1D']].map(([x, y, c]) => `<circle cx="${x + 1.5}" cy="${y + 2}" r="7" fill="#712B13"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/>` + H(x - 2.5, y - 2.5, 2.5, 1.6)).join('') },
    rice: { label: 'ข้าว / อาหาร', svg: T('#FAEEDA') + S(32, 55, 16, 3) + '<circle cx="33" cy="33" r="13" fill="#D3D1C7"/><circle cx="32" cy="32" r="13" fill="#fff"/><path d="M16 35 h36 a18 16 0 0 1 -36 0z" fill="#185FA5"/><path d="M14 33 h36 a18 16 0 0 1 -36 0z" fill="#378ADD"/><rect x="14" y="33" width="36" height="3" rx="1.5" fill="#85B7EB"/>' + H(22, 41, 3, 2) + '<ellipse cx="27" cy="25" rx="2" ry="1.2" fill="#F1EFE8"/><ellipse cx="35" cy="22" rx="2" ry="1.2" fill="#F1EFE8"/>' },
    noodle: { label: 'ก๋วยเตี๋ยว / ราเมง', svg: T('#FBEAF0') + S(32, 55, 16, 3) + '<line x1="38" y1="8" x2="30" y2="30" stroke="#BA7517" stroke-width="2.5" stroke-linecap="round"/><line x1="44" y1="10" x2="33" y2="30" stroke="#BA7517" stroke-width="2.5" stroke-linecap="round"/><path d="M18 30 q4 -6 8 0 t8 0 t8 0 t6 0" stroke="#FAC775" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M16 35 h36 a18 16 0 0 1 -36 0z" fill="#993556"/><path d="M14 33 h36 a18 16 0 0 1 -36 0z" fill="#D4537E"/><rect x="14" y="33" width="36" height="3" rx="1.5" fill="#ED93B1"/>' + H(22, 41, 3, 2) },
    coffee: { label: 'กาแฟ / ชานม', svg: T('#F1EFE8') + S(32, 57, 13, 3) + '<line x1="36" y1="6" x2="34" y2="20" stroke="#D4537E" stroke-width="3" stroke-linecap="round"/><path d="M24 24 L44 24 L41.5 54 L26.5 54 Z" fill="#633806"/><path d="M22 23 L42 23 L39.5 53 L24.5 53 Z" fill="#854F0B"/><rect x="26" y="28" width="6" height="6" rx="1.5" fill="#fff" opacity=".45"/><rect x="33" y="33" width="5" height="5" rx="1.5" fill="#fff" opacity=".35"/><rect x="20" y="18" width="26" height="7" rx="3.5" fill="#B4B2A9"/><rect x="19" y="17" width="26" height="6" rx="3" fill="#fff"/>' },
    phone: { label: 'โทรศัพท์', svg: T('#EEEDFE') + S(32, 56, 13, 3) + '<rect x="23" y="13" width="24" height="42" rx="7" fill="#3C3489"/><rect x="21" y="11" width="24" height="42" rx="7" fill="#7F77DD"/><rect x="24" y="16" width="18" height="31" rx="3.5" fill="#CECBF6"/><rect x="29" y="13" width="8" height="2" rx="1" fill="#3C3489"/><rect x="27" y="22" width="10" height="5" rx="2.5" fill="#fff"/><rect x="29" y="30" width="10" height="5" rx="2.5" fill="#AFA9EC"/>' + H(24.5, 22, 1.6, 5) + '<circle cx="46" cy="15" r="6" fill="#993556"/><circle cx="45" cy="14" r="6" fill="#ED93B1"/>' },
    electric: { label: 'ค่าไฟ', svg: T('#FAEEDA') + S(32, 56, 11, 3) + '<circle cx="33.5" cy="29.5" r="13" fill="#BA7517"/><circle cx="32" cy="28" r="13" fill="#EF9F27"/>' + H(27, 23, 3.5, 2.5) + '<rect x="27" y="41" width="12" height="11" rx="3" fill="#5F5E5A"/><rect x="26" y="40" width="12" height="10" rx="3" fill="#888780"/><rect x="26" y="44" width="12" height="1.5" fill="#5F5E5A"/><path d="M12 14 l4 3 M52 14 l-4 3 M32 6 v4" stroke="#EF9F27" stroke-width="2.5" stroke-linecap="round"/>' },
    water: { label: 'ค่าน้ำ', svg: T('#E6F1FB') + S(32, 56, 12, 3) + '<path d="M34 12 C34 12 20 30 20 40 a14 14 0 0 0 28 0 C48 30 34 12 34 12Z" fill="#185FA5"/><path d="M32 10 C32 10 18 28 18 38 a14 14 0 0 0 28 0 C46 28 32 10 32 10Z" fill="#378ADD"/>' + H(25.5, 38, 2.5, 5) },
    wifi: { label: 'อินเทอร์เน็ต', svg: T('#E1F5EE') + S(32, 56, 17, 3) + '<path d="M19 25 Q32 13 45 25" stroke="#1D9E75" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M24 30 Q32 23 40 30" stroke="#1D9E75" stroke-width="3.5" fill="none" stroke-linecap="round"/><rect x="16" y="38" width="36" height="14" rx="6" fill="#085041"/><rect x="14" y="36" width="36" height="14" rx="6" fill="#1D9E75"/><circle cx="22" cy="43" r="2" fill="#9FE1CB"/><circle cx="28" cy="43" r="2" fill="#9FE1CB"/>' },
    stream: { label: 'สตรีมมิ่ง / หนัง', svg: T('#FCEBEB') + S(32, 55, 18, 3) + '<rect x="12" y="16" width="42" height="30" rx="6" fill="#791F1F"/><rect x="10" y="14" width="42" height="30" rx="6" fill="#E24B4A"/><rect x="14" y="18" width="34" height="22" rx="3" fill="#F7C1C1"/><path d="M28 23 L37 29 L28 35 Z" fill="#A32D2D"/><rect x="24" y="47" width="14" height="4" rx="2" fill="#5F5E5A"/>' },
    bus: { label: 'รถเมล์ / รถไฟฟ้า', svg: T('#EAF3DE') + S(32, 55, 20, 3) + '<rect x="14" y="17" width="40" height="29" rx="8" fill="#27500A"/><rect x="12" y="15" width="40" height="29" rx="8" fill="#639922"/><rect x="16" y="19" width="14" height="10" rx="3" fill="#EAF3DE"/><rect x="34" y="19" width="14" height="10" rx="3" fill="#EAF3DE"/><rect x="12" y="33" width="40" height="3" fill="#97C459"/><circle cx="17" cy="39" r="2" fill="#FAC775"/><circle cx="47" cy="39" r="2" fill="#FAC775"/><circle cx="21" cy="46" r="5" fill="#2C2C2A"/><circle cx="43" cy="46" r="5" fill="#2C2C2A"/><circle cx="21" cy="46" r="2" fill="#888780"/><circle cx="43" cy="46" r="2" fill="#888780"/>' },
    car: { label: 'แท็กซี่ / Grab', svg: T('#FAEEDA') + S(32, 54, 21, 3) + '<path d="M14 36 l5 -12 a5 5 0 0 1 5 -3 h18 a5 5 0 0 1 5 3 l5 12 z" fill="#BA7517"/><rect x="10" y="34" width="44" height="13" rx="5" fill="#854F0B"/><rect x="9" y="32" width="44" height="13" rx="5" fill="#EF9F27"/><path d="M20 32 l3 -8 h18 l3 8z" fill="#FAEEDA"/><circle cx="19" cy="46" r="5" fill="#2C2C2A"/><circle cx="43" cy="46" r="5" fill="#2C2C2A"/><circle cx="14" cy="38" r="2" fill="#fff"/>' },
    fuel: { label: 'น้ำมัน', svg: T('#FCEBEB') + S(30, 55, 14, 3) + '<path d="M40 22 h4 a3 3 0 0 1 3 3 v14 a3 3 0 0 0 6 0 v-17" stroke="#444441" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="20" y="15" width="22" height="36" rx="6" fill="#791F1F"/><rect x="18" y="13" width="22" height="36" rx="6" fill="#E24B4A"/><rect x="22" y="18" width="14" height="9" rx="2.5" fill="#FCEBEB"/>' + H(21, 34, 1.4, 5) + '<rect x="15" y="48" width="28" height="5" rx="2.5" fill="#5F5E5A"/>' },
    house: { label: 'บ้าน / ค่าเช่า', svg: T('#FBEAF0') + S(32, 55, 16, 3) + '<rect x="20" y="31" width="28" height="21" rx="3" fill="#D3D1C7"/><rect x="18" y="29" width="28" height="21" rx="3" fill="#fff"/><path d="M16 33 L34 18 L52 33 Z" fill="#993556" stroke="#993556" stroke-width="4" stroke-linejoin="round"/><path d="M14 31 L32 16 L50 31 Z" fill="#D4537E" stroke="#D4537E" stroke-width="4" stroke-linejoin="round"/><rect x="28" y="38" width="8" height="12" rx="2" fill="#ED93B1"/><rect x="38" y="35" width="5" height="5" rx="1" fill="#B5D4F4"/>' },
    bag: { label: 'ช้อปปิ้ง', svg: T('#FAEEDA') + S(32, 56, 15, 3) + '<path d="M25 25 v-5 a7 7 0 0 1 14 0 v5" stroke="#72243E" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="19" y="24" width="30" height="30" rx="6" fill="#993556"/><rect x="17" y="22" width="30" height="30" rx="6" fill="#ED93B1"/><circle cx="25" cy="27" r="1.8" fill="#72243E"/><circle cx="39" cy="27" r="1.8" fill="#72243E"/>' + H(22, 38, 1.6, 6) },
    shirt: { label: 'เสื้อผ้า', svg: T('#E6F1FB') + S(32, 56, 16, 3) + '<path d="M24 14 L14 20 L18 30 L22 28 V52 H44 V28 L48 30 L52 20 L42 14 Q33 20 24 14Z" fill="#0C447C" transform="translate(1.5 1.5)"/><path d="M24 14 L14 20 L18 30 L22 28 V52 H44 V28 L48 30 L52 20 L42 14 Q33 20 24 14Z" fill="#378ADD"/>' + H(28, 34, 2, 7) },
    game: { label: 'เกม / บันเทิง', svg: T('#E6F1FB') + S(32, 52, 19, 3) + '<rect x="14" y="26" width="40" height="20" rx="10" fill="#0C447C"/><rect x="12" y="24" width="40" height="20" rx="10" fill="#378ADD"/><rect x="18" y="32.5" width="9" height="3" rx="1" fill="#fff"/><rect x="21" y="29.5" width="3" height="9" rx="1" fill="#fff"/><circle cx="41" cy="31" r="2.3" fill="#F09595"/><circle cx="45" cy="35.5" r="2.3" fill="#FAC775"/>' },
    pill: { label: 'ยา / สุขภาพ', svg: T('#EAF3DE') + S(32, 52, 16, 3) + '<g transform="rotate(-35 32 32)"><rect x="15.5" y="27" width="36" height="14" rx="7" fill="#A32D2D"/><rect x="14" y="25" width="36" height="14" rx="7" fill="#E24B4A"/><path d="M32 25 h11 a7 7 0 0 1 0 14 h-11z" fill="#fff"/>' + H(22, 28.5, 5, 1.3) + '</g>' },
    scissors: { label: 'ตัดผม / ความงาม', svg: T('#EEEDFE') + S(32, 55, 14, 3) + '<line x1="24" y1="12" x2="38" y2="40" stroke="#888780" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="12" x2="26" y2="40" stroke="#B4B2A9" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="45" r="7" fill="none" stroke="#534AB7" stroke-width="4.5"/><circle cx="40" cy="45" r="7" fill="none" stroke="#7F77DD" stroke-width="4.5"/><circle cx="32" cy="27" r="2" fill="#3C3489"/>' },
    book: { label: 'การศึกษา', svg: T('#E1F5EE') + S(32, 55, 17, 3) + '<rect x="16" y="15" width="34" height="38" rx="4" fill="#085041"/><rect x="14" y="13" width="34" height="38" rx="4" fill="#1D9E75"/><rect x="14" y="13" width="6" height="38" rx="3" fill="#0F6E56"/><rect x="24" y="20" width="18" height="5" rx="2.5" fill="#E1F5EE"/>' + H(30, 36, 8, 1.4) },
    pet: { label: 'สัตว์เลี้ยง', svg: T('#FAEEDA') + S(32, 55, 15, 3) + '<ellipse cx="33.5" cy="41" rx="12" ry="10" fill="#854F0B"/><ellipse cx="32" cy="39" rx="12" ry="10" fill="#EF9F27"/>' + [[18, 26], [26, 18], [38, 18], [46, 26]].map(([x, y]) => `<circle cx="${x + 1}" cy="${y + 1}" r="5" fill="#854F0B"/><circle cx="${x}" cy="${y}" r="5" fill="#EF9F27"/>`).join('') + H(28, 36, 3, 2) },
    money: { label: 'เงินเดือน', svg: T('#EAF3DE') + S(32, 55, 19, 3) + '<rect x="13" y="31" width="40" height="20" rx="4" fill="#3B6D11"/><rect x="11" y="27" width="40" height="20" rx="4" fill="#97C459"/><circle cx="31" cy="37" r="5" fill="#EAF3DE"/><circle cx="47.5" cy="22.5" r="7" fill="#854F0B"/><circle cx="46" cy="21" r="7" fill="#EF9F27"/>' + H(44, 18.5, 2.2, 1.4) },
    coins: { label: 'ขายของ / ฟรีแลนซ์', svg: T('#FAEEDA') + S(32, 55, 16, 3) + [46, 39, 32].map((y) => `<ellipse cx="33.5" cy="${y + 2}" rx="15" ry="5" fill="#854F0B"/><ellipse cx="32" cy="${y}" rx="15" ry="5" fill="#EF9F27"/>`).join('') + '<circle cx="40" cy="20" r="9" fill="#854F0B"/><circle cx="38.5" cy="18.5" r="9" fill="#FAC775"/>' + H(35, 15, 2.5, 1.5) },
    gift: { label: 'โบนัส / ของขวัญ', svg: T('#EEEDFE') + S(32, 55, 16, 3) + '<rect x="18" y="32" width="32" height="20" rx="3" fill="#3C3489"/><rect x="16" y="30" width="32" height="20" rx="3" fill="#7F77DD"/><rect x="14" y="23" width="36" height="9" rx="3" fill="#AFA9EC"/><rect x="29" y="23" width="6" height="27" fill="#FAC775"/><ellipse cx="26" cy="19" rx="6" ry="3.5" fill="#EF9F27" transform="rotate(20 26 19)"/><ellipse cx="38" cy="19" rx="6" ry="3.5" fill="#EF9F27" transform="rotate(-20 38 19)"/><circle cx="32" cy="21" r="2.5" fill="#BA7517"/>' },
    piggy: { label: 'เงินออม', svg: T('#FBEAF0') + S(32, 55, 17, 3) + '<circle cx="32" cy="14" r="5" fill="#EF9F27"/><rect x="24" y="47" width="5" height="7" rx="2" fill="#993556"/><rect x="36" y="47" width="5" height="7" rx="2" fill="#993556"/><ellipse cx="33.5" cy="37.5" rx="17" ry="13" fill="#993556"/><ellipse cx="32" cy="36" rx="17" ry="13" fill="#ED93B1"/><path d="M36 24 l5 -5 l2 7z" fill="#D4537E"/><ellipse cx="48" cy="37" rx="4" ry="3.5" fill="#D4537E"/><circle cx="41" cy="31" r="1.6" fill="#4B1528"/><rect x="26" y="24" width="10" height="2.5" rx="1.2" fill="#993556"/>' + H(23, 31, 4, 2.2) },
    box: { label: 'อื่นๆ', svg: T('#F1EFE8') + S(32, 55, 16, 3) + '<path d="M16 24 L32 16 L48 24 L48 44 L32 52 L16 44 Z" fill="#888780" transform="translate(1.5 1.5)"/><path d="M16 24 L32 16 L48 24 L32 32 Z" fill="#D3D1C7"/><path d="M16 24 L32 32 L32 52 L16 44 Z" fill="#B4B2A9"/><path d="M48 24 L32 32 L32 52 L48 44 Z" fill="#888780"/><path d="M24 20 L40 28 L40 34" stroke="#F1EFE8" stroke-width="3" fill="none"/>' }
  };

  const CATEGORIES = {
    expense: [
      { id: 'อาหาร', icon: 'rice', color: '#EF9F27' },
      { id: 'เครื่องดื่ม', icon: 'coffee', color: '#854F0B' },
      { id: 'เดินทาง', icon: 'bus', color: '#639922' },
      { id: 'บิลและค่าบริการ', icon: 'electric', color: '#7F77DD' },
      { id: 'ที่พัก', icon: 'house', color: '#D4537E' },
      { id: 'ช้อปปิ้ง', icon: 'bag', color: '#ED93B1' },
      { id: 'บันเทิง', icon: 'game', color: '#378ADD' },
      { id: 'สุขภาพ', icon: 'pill', color: '#E24B4A' },
      { id: 'การศึกษา', icon: 'book', color: '#1D9E75' },
      { id: 'อื่นๆ', icon: 'box', color: '#888780' }
    ],
    income: [
      { id: 'เงินเดือน', icon: 'money', color: '#1D9E75' },
      { id: 'ขายของ/ฟรีแลนซ์', icon: 'coins', color: '#BA7517' },
      { id: 'โบนัส/ของขวัญ', icon: 'gift', color: '#7F77DD' },
      { id: 'รายรับอื่น', icon: 'piggy', color: '#D4537E' }
    ]
  };

  // คำที่พิมพ์ -> [ไอคอน, หมวด]
  const KEYWORDS = [
    ['meatball', 'อาหาร', 'ลูกชิ้น หมูปิ้ง ไก่ปิ้ง ไก่ทอด ไส้กรอก ปิ้งย่าง หมูกระทะ บาร์บีคิว'],
    ['noodle', 'อาหาร', 'ก๋วยเตี๋ยว เส้น ราเมง บะหมี่ เย็นตาโฟ ผัดไทย'],
    ['rice', 'อาหาร', 'ข้าว อาหาร กับข้าว มื้อ ส้มตำ กะเพรา ผัด แกง ต้ม สุกี้ ชาบู บุฟเฟต์ ร้านอาหาร ขนม food lineman foodpanda'],
    ['coffee', 'เครื่องดื่ม', 'กาแฟ ชา ชานม ชาไข่มุก โกโก้ นม ชาเขียว เครื่องดื่ม คาเฟ่ อเมซอน starbucks coffee'],
    ['phone', 'บิลและค่าบริการ', 'โทรศัพท์ ค่าโทร มือถือ เติมเงิน ซิม ais true dtac'],
    ['electric', 'บิลและค่าบริการ', 'ค่าไฟ ไฟฟ้า กฟน กฟภ'],
    ['water', 'บิลและค่าบริการ', 'ค่าน้ำ ประปา'],
    ['wifi', 'บิลและค่าบริการ', 'เน็ต อินเทอร์เน็ต อินเตอร์เน็ต ไวไฟ wifi 3bb'],
    ['stream', 'บันเทิง', 'netflix youtube spotify disney หนัง ดูหนัง โรงหนัง สตรีม'],
    ['game', 'บันเทิง', 'เกม เติมเกม คอนเสิร์ต สวนสนุก บันเทิง steam'],
    ['bus', 'เดินทาง', 'รถเมล์ bts mrt รถไฟ รถไฟฟ้า ค่ารถ ตั๋ว เดินทาง วิน มอไซ เรือ'],
    ['car', 'เดินทาง', 'แท็กซี่ taxi grab bolt ทางด่วน ที่จอดรถ ล้างรถ'],
    ['fuel', 'เดินทาง', 'น้ำมัน เติมน้ำมัน ปตท pt shell บางจาก'],
    ['house', 'ที่พัก', 'ค่าเช่า บ้าน หอ คอนโด ห้อง ส่วนกลาง'],
    ['shirt', 'ช้อปปิ้ง', 'เสื้อ กางเกง กระโปรง ชุด รองเท้า เสื้อผ้า'],
    ['bag', 'ช้อปปิ้ง', 'ช้อป ซื้อของ shopee lazada ห้าง กระเป๋า เครื่องสำอาง ของใช้ 7-11 เซเว่น'],
    ['pill', 'สุขภาพ', 'ยา หมอ โรงพยาบาล คลินิก ทำฟัน หาหมอ วิตามิน ฟิตเนส'],
    ['scissors', 'อื่นๆ', 'ตัดผม ทำผม ทำเล็บ สปา นวด'],
    ['book', 'การศึกษา', 'หนังสือ เรียน คอร์ส ค่าเทอม ติว'],
    ['pet', 'อื่นๆ', 'แมว หมา สัตว์เลี้ยง อาหารแมว อาหารหมา'],
    ['money', 'เงินเดือน', 'เงินเดือน ค่าจ้าง ค่าแรง salary'],
    ['coins', 'ขายของ/ฟรีแลนซ์', 'ขายของ ขาย ฟรีแลนซ์ งานเสริม รับจ้าง ค่าคอม'],
    ['gift', 'โบนัส/ของขวัญ', 'โบนัส ของขวัญ อั่งเปา รางวัล'],
    ['piggy', 'รายรับอื่น', 'ออม เก็บเงิน ดอกเบี้ย เงินปันผล คืนเงิน']
  ];
  const KW = [];
  KEYWORDS.forEach(([icon, cat, words]) => words.split(' ').forEach((w) => KW.push([w.toLowerCase(), icon, cat])));
  KW.sort((a, b) => b[0].length - a[0].length);   // คำยาวก่อน เช่น "น้ำมัน" ชนะ "น้ำ"

  const CUSTOM_KEY = 'omdee-custom-icons';
  const norm = (s) => String(s || '').trim().toLowerCase();
  function readCustom() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {}; } catch (e) { return {}; } }

  window.OmdeeIcons = {
    ICONS, CATEGORIES,
    allCategories: () => [...CATEGORIES.expense, ...CATEGORIES.income],
    category(id) { return this.allCategories().find((c) => c.id === id) || CATEGORIES.expense[CATEGORIES.expense.length - 1]; },
    // หาไอคอนจากชื่อรายการ: รูปที่เคยตั้งเอง > พจนานุกรม > null
    match(title) {
      const t = norm(title);
      if (!t) return null;
      const custom = readCustom();
      if (custom[t]) return { icon: custom[t], category: null, custom: true };
      for (const [w, icon, cat] of KW) if (t.includes(w)) return { icon, category: cat };
      return null;
    },
    remember(title, icon) {
      const t = norm(title); if (!t) return;
      const c = readCustom(); c[t] = icon;
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); } catch (e) { /* เต็มก็ข้าม */ }
    },
    html(icon, size = 44) {
      if (icon && icon.startsWith('data:image')) return `<img class="ic-img" src="${icon}" width="${size}" height="${size}" alt="">`;
      const i = ICONS[icon] || ICONS.box;
      return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${i.svg}</svg>`;
    }
  };
})();
