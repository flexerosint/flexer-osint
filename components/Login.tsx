
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
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] p-8 rounded-2xl shadow-2xl border border-gray-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/10 mb-4 border border-blue-600/30">
            <i className="fas fa-shield-halved text-2xl text-blue-500"></i>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Flexer OSINT</h1>
          <p className="text-gray-400 mt-2">Login to your operative dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="email"
                required
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="operative@flexer.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type="password"
                required
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'ACCESS SYSTEM'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          New operative?{' '}
          <button onClick={onSwitch} className="text-blue-500 hover:underline font-medium">
            Register for access
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
