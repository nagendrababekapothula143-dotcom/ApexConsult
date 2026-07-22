const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

let app;

try {
  if (!getApps().length) {
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
      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'consultingauth.firebasestorage.app'
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'consultingauth.firebasestorage.app'
      });
    } else {
      app = initializeApp(); // Fallback to ADC
    }
    console.log('Firebase Admin Initialized successfully.');
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error.message);
}

const db = getFirestore(app);
const auth = getAuth(app);
const bucket = getStorage(app).bucket();

module.exports = {
  admin: { auth: () => auth, firestore: () => db, storage: () => getStorage(app) }, // backwards compatibility mock
  db,
  auth,
  bucket
};
