const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      try {
        serviceAccount = require('./serviceAccountKey.json');
      } catch (e) {
        console.warn('No serviceAccountKey.json found, checking alternative ENV variables...');
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'apex-consulting.appspot.com'
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'apex-consulting.appspot.com'
      });
    } else {
      admin.initializeApp(); // Fallback to ADC
    }
    console.log('Firebase Admin Initialized successfully.');
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error.message);
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = {
  admin,
  db,
  auth,
  bucket
};
