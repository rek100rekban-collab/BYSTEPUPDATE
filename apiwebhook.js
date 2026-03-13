const firebase = require('firebase-admin');

// Инициализация Firebase
if (!firebase.apps.length) {
  firebase.initializeApp({
    credential: firebase.credential.cert({
      projectId: 'step-by-step-279df',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: 'https://step-by-step-279df-default-rtdb.europe-west1.firebasedatabase.app'
  });
}

const db = firebase.database();
const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('POST only');

  const update = req.body;

  // ОБРАБОТКА pre_checkout_query — ОБЯЗАТЕЛЬНО
  if (update.pre_checkout_query) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      })
    });
    return res.status(200).send('ok');
  }

  // ОБРАБОТКА успешного платежа
  if (update.message?.successful_payment) {
    const payload = update.message.successful_payment.invoice_payload;
    const parts = payload.split('_');
    
    if (parts[0] === 'stars') {
      const userId = parts[1];
      const amount = parseInt(parts[2]);
      
      const snap = await db.ref(`users/${userId}`).once('value');
      const data = snap.val() || {};
      
      await db.ref(`users/${userId}`).update({
        balance: (data.balance || 0) + amount,
        totalDeposits: (data.totalDeposits || 0) + amount
      });
    }
    return res.status(200).send('ok');
  }

  res.status(200).send('ok');
};