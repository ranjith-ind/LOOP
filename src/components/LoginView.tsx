/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Sparkles, Building2, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { Session } from '../types.js';

interface LoginViewProps {
  onLoginSuccess: (session: Session) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    { email: 'admin@loop.com', password: 'admin', role: 'ADMIN', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { email: 'analyst@loop.com', password: 'analyst', role: 'ANALYST', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { email: 'viewer@loop.com', password: 'viewer', role: 'VIEWER', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  ];

  const handleDemoLogin = async (demo: typeof demoAccounts[0]) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demo.email, password: demo.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    const payload = isSignUp 
      ? { name, email, password, workspaceName }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-slate-900 text-white rounded-none mb-4">
          <Sparkles className="h-8 w-8 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-widest uppercase text-slate-900 font-sans">
          PROJECT <span className="text-slate-500">LOOP</span>
        </h2>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          AI CUSTOMER-FEEDBACK INTELLIGENCE PLATFORM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in">
        <div className="bg-white py-8 px-4 border border-slate-900 rounded-none sm:px-10">
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-500 text-red-900 text-xs font-bold rounded-none">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Your Name
                  </label>
                  <div className="mt-1 relative rounded-none">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-900 rounded-none bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-slate-900 text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Workspace / Company Name
                  </label>
                  <div className="mt-1 relative rounded-none">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-900 rounded-none bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-slate-900 text-sm"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Email Address
              </label>
              <div className="mt-1 relative rounded-none">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-900 rounded-none bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-slate-900 text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Password
              </label>
              <div className="mt-1 relative rounded-none">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-slate-900 rounded-none bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-slate-900 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-900"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-none text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 focus:outline-none transition-all disabled:opacity-55 cursor-pointer"
              >
                {loading ? 'PROCESSING...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                <span className="px-2 bg-white text-slate-400">
                  {isSignUp ? 'Already have an account?' : 'New to Project LOOP?'}
                </span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-xs font-bold uppercase tracking-wider text-slate-900 hover:underline focus:outline-none cursor-pointer"
              >
                {isSignUp ? 'Sign in with existing credentials' : 'Register a new workspace (Admin)'}
              </button>
            </div>
          </div>
        </div>

        {/* Demo Fast Logins Section */}
        <div className="mt-6 bg-white p-5 rounded-none border border-slate-900">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> EVALUATOR QUICK-ACCESS CREDENTIALS
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {demoAccounts.map((demo) => (
              <button
                key={demo.role}
                onClick={() => handleDemoLogin(demo)}
                disabled={loading}
                className="py-2 px-2 text-[10px] font-bold tracking-wider uppercase rounded-none border border-slate-900 text-center transition-all cursor-pointer bg-white hover:bg-slate-900 hover:text-white"
              >
                <div>{demo.role}</div>
                <div className="text-[9px] font-mono font-medium opacity-75">{demo.email.split('@')[0]}</div>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-400 text-center mt-3 font-medium uppercase tracking-wider">
            Click any button above to instantly log in as that pre-seeded role.
          </p>
        </div>
      </div>
    </div>
  );
}
