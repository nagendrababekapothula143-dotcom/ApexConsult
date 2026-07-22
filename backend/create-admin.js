const { db } = require('./config/firebase');
const { getAuth } = require('firebase-admin/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createAdmin() {
  try {
    const email = 'admin@kryntel.com';
    const password = '123456';
    const name = 'Admin User';
    
    const auth = getAuth();

    // 1. Create user in Firebase Auth
    console.log('Creating user in Firebase Auth...');
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });
      console.log('Firebase user created with UID:', userRecord.uid);
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        console.log('User already exists in Firebase Auth. Fetching user...');
        userRecord = await auth.getUserByEmail(email);
      } else {
        throw authErr;
      }
    }
    
    // 2. Hash password for legacy backend compatibility
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 3. Store user in Firestore
    console.log('Creating user in Firestore...');
    await db.collection('consulting_users').doc(userRecord.uid).set({
      id: userRecord.uid,
      apexId: 'KRY' + Math.floor(1000000 + Math.random() * 9000000),
      name: name,
      email: email,
      role: 'admin',
      password: hashedPassword, // Used only if hitting the backend login route manually
      avatarUrl: `https://ui-avatars.com/api/?name=Admin+User&background=random`,
      createdAt: new Date().toISOString()
    });
    
    console.log('✅ Admin user created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err);
    process.exit(1);
  }
}

createAdmin();
