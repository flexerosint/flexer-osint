
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface RegisterProps {
  onSwitch: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] p-8 rounded-2xl shadow-2xl border border-gray-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Join Flexer</h1>
          <p className="text-gray-400 mt-2">Create an account to request system access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          Already have an account?{' '}
          <button onClick={onSwitch} className="text-blue-500 hover:underline font-medium">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
