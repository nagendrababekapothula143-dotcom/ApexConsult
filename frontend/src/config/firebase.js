import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAw2p4qMAQQOikDMw6NMe5CxA--F4U4N8I",
  authDomain: "consultingauth.firebaseapp.com",
  projectId: "consultingauth",
  storageBucket: "consultingauth.firebasestorage.app",
  messagingSenderId: "707718338059",
  appId: "1:707718338059:web:93c04bb1b2e9003b53190e",
  measurementId: "G-QH44NNGZYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
