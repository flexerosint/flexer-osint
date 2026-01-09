import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginProps {
  onSwitch: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError("Wrong email or password.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid login details.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 mb-5 border border-blue-600/30">
            <i className="fas fa-lock text-xl text-blue-500"></i>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Flexer OSINT</h1>
          <p className="text-gray-500 mt-2 text-sm">Welcome back. Please login.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Email</label>
            <input
              type="email"
              required
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-blue-500 transition-all text-sm"
              placeholder="agent@flexer.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-blue-500 transition-all text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-blue-900/20 active:scale-[0.98] text-xs uppercase tracking-widest"
          >
            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Login Now'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-xs">
            No account?{' '}
            <button onClick={onSwitch} className="text-blue-500 hover:text-blue-400 font-bold ml-1 transition-colors">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;