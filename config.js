// ===== ตั้งค่า Ror-Korn =====
// 1) วาง firebaseConfig จาก Firebase Console > Project settings > Your apps > SDK setup and configuration (Config)
// 2) ถ้า firebaseConfig ยังว่าง เว็บจะทำงาน "โหมดทดลอง" เก็บข้อมูลในเบราว์เซอร์เครื่องนี้เท่านั้น
// ค่าพวกนี้เปิดเผยได้ ความเป็นส่วนตัวคุมด้วยกฎใน firestore.rules
window.RORKORN_CONFIG = {
  firebaseConfig: {
    apiKey: 'AIzaSyAvQA-ndAXYoQiI4evhLEM_6RDY58xUlxM',
    authDomain: 'ror-korn.firebaseapp.com',
    projectId: 'ror-korn',
    storageBucket: 'ror-korn.firebasestorage.app',
    messagingSenderId: '272834706639',
    appId: '1:272834706639:web:7039b4b431ae465c85cbba'
  },

  // ID ของเจ้าของเว็บ (คนเดียวที่กดอนุมัติสมาชิกได้) ต้องตรงกับใน firestore.rules
  adminId: 'angkor',
  adminNick: 'อังกอร์',

  // โดเมนภายในสำหรับแปลง ID เป็นอีเมลของ Firebase (ไม่มีการส่งอีเมลจริง) ต้องตรงกับใน firestore.rules
  emailDomain: 'rorkorn.app'
};
