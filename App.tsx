
import React, { useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [sessionConflict, setSessionConflict] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const getLocalSessionId = useCallback(() => {
    let sid = localStorage.getItem('flexer_sid');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('flexer_sid', sid);
    }
    return sid;
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setPermissionError(null);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const currentSid = getLocalSessionId();

        try {
          // Attempt to get the profile first
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // New user registration flow
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              isAdmin: false, 
              isApproved: false,
              lastSessionId: currentSid
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          } else {
            // Existing user - set initial profile data immediately from getDoc
            const existingProfile = userDoc.data() as UserProfile;
            setProfile({ ...existingProfile, lastSessionId: currentSid });
            
            // Update session ID in Firestore to enforce single device login
            await setDoc(userDocRef, { lastSessionId: currentSid }, { merge: true });
          }

          // Real-time listener for profile updates (admin status, approval, etc.)
          unsubscribeProfile = onSnapshot(userDocRef, 
            (snapshot) => {
              if (snapshot.exists()) {
                const updatedData = snapshot.data() as UserProfile;
                setProfile(updatedData);
                // If lastSessionId doesn't match current, someone else logged in on another device
                setSessionConflict(updatedData.lastSessionId !== currentSid);
              }
            },
            (error) => {
              console.error("Firestore Profile Sync Error:", error);
              if (error.code === 'permission-denied') {
                setPermissionError("Firestore listener permission denied. This happens when rules block real-time updates.");
              }
            }
          );

          setUser(firebaseUser);
        } catch (err: any) {
          console.error("Initial Auth Setup Error:", err);
          if (err.code === 'permission-denied') {
            setPermissionError("Access Denied: Your Firestore Security Rules are blocking the app. Please ensure you have configured your database rules correctly in the Firebase Console.");
          } else {
            setPermissionError(`System Error: ${err.message}`);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setSessionConflict(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [getLocalSessionId]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('flexer_sid');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-[#111] p-8 rounded-2xl border border-red-900/30 shadow-2xl overflow-y-auto max-h-[90vh]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30">
              <i className="fas fa-shield-halved text-2xl text-red-500"></i>
            </div>
            <h2 className="text-2xl font-bold text-white">Firestore Permission Required</h2>
          </div>
          
          <div className="mb-6 p-4 bg-red-900/10 border border-red-900/30 rounded-xl text-red-400 font-mono text-sm">
            {permissionError}
          </div>

          <p className="text-gray-400 mb-6 leading-relaxed">
            Flexer OSINT requires specific database rules to handle user profiles and admin controls safely. 
            Follow these steps to resolve this:
          </p>

          <ol className="list-decimal list-inside text-gray-400 mb-6 space-y-2 text-sm">
            <li>Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Firebase Console</a>.</li>
            <li>Select your project <strong>flexer-osint</strong>.</li>
            <li>Go to <strong>Firestore Database</strong> in the sidebar.</li>
            <li>Click the <strong>Rules</strong> tab at the top.</li>
            <li>Replace the current rules with the code below and click <strong>Publish</strong>.</li>
          </ol>

          <div className="bg-[#0a0a0a] p-4 rounded-xl border border-gray-800 font-mono text-xs text-blue-400 overflow-x-auto mb-8 relative">
            <button 
              onClick={() => {
                const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Allow admins to manage all users
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    // Allow approved users to read tools, admins can manage them
    match /tools/{toolId} {
      allow read: if request.auth != null && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isApproved == true || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}`;
                navigator.clipboard.writeText(rules);
                alert("Rules copied to clipboard!");
              }}
              className="absolute top-2 right-2 p-2 bg-gray-800 rounded hover:bg-gray-700 text-white text-[10px]"
            >
              COPY RULES
            </button>
            <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    match /tools/{toolId} {
      allow read: if request.auth != null && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isApproved == true || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}`}</pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              RELOAD APPLICATION
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-400 font-bold py-3 rounded-lg transition"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionConflict) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-xl border border-red-900/50 shadow-2xl text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h2 className="text-2xl font-bold mb-4">Session Conflict</h2>
          <p className="text-gray-400 mb-6">
            You are logged in on another device. This application only supports one active session at a time.
          </p>
          <div className="space-y-3">
            <button 
              onClick={async () => {
                const currentSid = getLocalSessionId();
                if (user) {
                  await setDoc(doc(db, 'users', user.uid), { lastSessionId: currentSid }, { merge: true });
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              Resume on this device
            </button>
            <button 
              onClick={handleLogout}
              className="w-full bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-bold py-3 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return view === 'login' 
      ? <Login onSwitch={() => setView('register')} /> 
      : <Register onSwitch={() => setView('login')} />;
  }

  // Ensure profile is fully loaded before attempting to render any component that consumes it
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (profile.isAdmin) {
    return <AdminPanel profile={profile} onLogout={handleLogout} />;
  }

  return <UserDashboard profile={profile} onLogout={handleLogout} />;
};

export default App;
