'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, KeyRound, UserPlus, Lock } from 'lucide-react';
import { api } from '../lib/api';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('operator@pipeline.local');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Alex Rivera SRE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      let res;
      if (isRegister) {
        res = await api.register(email, password, name);
      } else {
        res = await api.login(email, password);
      }
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isRegister ? 'Register Pipeline Operator' : 'Operator Authentication'}
              </h3>
              <p className="text-xs text-gray-400">
                Sign in to approve side-effecting recovery replays
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Full Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#0B0F17] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-blue-400 hover:underline"
            >
              {isRegister
                ? 'Already an operator? Log in'
                : 'Need operator access? Register'}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Register' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
