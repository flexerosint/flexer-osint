
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAmUGt7RA23K8QUBBQeEvJP_gewMuMkKj4",
  authDomain: "flexer-osint.firebaseapp.com",
  projectId: "flexer-osint",
  storageBucket: "flexer-osint.firebasestorage.app",
  messagingSenderId: "466566616862",
  appId: "1:466566616862:web:7d75002e2da3cc5b02db0f",
  measurementId: "G-TX4XY94GPH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
