/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Building, Trash2, Shield, ShieldCheck, Sparkles, RefreshCw, KeyRound, CheckCircle } from 'lucide-react';
import { UserRole } from '../types.js';

interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface SettingsViewProps {
  currentUserRole: UserRole;
  workspaceName: string;
  workspaceId: string;
  authToken: string;
  onDbReset: () => void;
}

export default function SettingsView({ currentUserRole, workspaceName, workspaceId, authToken, onDbReset }: SettingsViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('ANALYST');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Reset DB State
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (currentUserRole === 'ADMIN') {
      fetchMembers();
    }
  }, [currentUserRole]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch team');
      setMembers(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword || inviting) return;
    setInviting(true);
    setInviteSuccess(false);

    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite member');

      setInviteSuccess(true);
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId: memberId, role: newRole })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Are you absolutely sure you want to reset the database? This will revert everything back to the 120 seeded items and delete any custom-added feedbacks, reports, or users.')) {
      return;
    }
    setResetting(true);

    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset');
      alert('Database successfully reset to seeded initial state.');
      onDbReset();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-900">
      
      {/* Title Header */}
      <div className="border-b border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Workspace Preferences</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
          Manage corporate workspace preferences, configure role-based access controls, and invoke sandbox triggers
        </p>
      </div>

      {/* Grid: Left column Workspace Info & Invite, Right column team list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info & Admin Triggers (1 Column) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Workspace info card */}
          <div className="bg-white p-5 rounded-none border border-slate-900 space-y-4">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <Building className="h-4 w-4 text-slate-900" /> Workspace Information
            </h3>

            <div className="space-y-3.5 pt-2">
              <div>
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">Tenant Name</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5 uppercase tracking-wider">{workspaceName}</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">Workspace Tenant ID</span>
                <span className="text-xs font-mono text-slate-900 block mt-0.5 select-all">{workspaceId}</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">Your Active Role</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-900 text-slate-900">
                    <Shield className="h-3 w-3" /> {currentUserRole}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seed/Reset Database sandbox card */}
          <div className="bg-white p-5 rounded-none border border-slate-900 space-y-4">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-slate-900 animate-pulse" /> Evaluation & Grading Utilities
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-relaxed">
              Are you finished grading or did you corrupt the data schemas? Click below to instantly purge the local database and reset everything back to the baseline pre-seeded state containing 120 items.
            </p>

            <button
              onClick={handleResetDatabase}
              disabled={resetting}
              className="w-full py-2 bg-white hover:bg-slate-900 text-red-700 hover:text-white border border-slate-900 rounded-none text-xs font-bold transition-all uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" /> {resetting ? 'Resetting Database...' : 'Reset Database to Seed'}
            </button>
            <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">
              Note: This will also log you out and return you to the login screen with fresh seed users.
            </p>
          </div>
        </div>

        {/* Team roster and invite panel (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {currentUserRole !== 'ADMIN' ? (
            <div className="bg-white p-6 rounded-none border border-slate-900 text-center text-slate-400 font-bold py-12 flex flex-col items-center justify-center gap-2 uppercase tracking-wider">
              <ShieldCheck className="h-8 w-8 text-slate-900" />
              <p className="text-sm font-black text-slate-900">Access Restricted</p>
              <p className="text-xs text-slate-400">Team member rosters and invitations can only be accessed by ADMIN accounts.</p>
            </div>
          ) : (
            <>
              {/* Member List */}
              <div className="bg-white rounded-none border border-slate-900 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-900" /> Workspace Team Roster
                  </h3>
                  <span className="text-[9px] bg-slate-900 text-white px-2.5 py-0.5 border border-slate-900 rounded-none font-bold uppercase tracking-widest">
                    {members.length} Members
                  </span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-900" /> Loading team roster...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 uppercase tracking-widest text-[9px] font-black border-b border-slate-900">
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4">Email Address</th>
                          <th className="py-3 px-4">Role Settings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {members.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900 uppercase tracking-wider">{m.name}</td>
                            <td className="py-3 px-4 text-slate-500 font-bold font-mono">{m.email}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m.id, e.target.value as UserRole)}
                                className="bg-white border border-slate-900 rounded-none px-2 py-1 text-[10px] font-bold text-slate-900 uppercase tracking-widest cursor-pointer focus:outline-none"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="ANALYST">ANALYST</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Invite Member form card */}
              <div className="bg-white p-5 rounded-none border border-slate-900 space-y-4">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-slate-900" /> Invite New Colleague
                </h3>

                {inviteSuccess && (
                  <div className="p-3 bg-slate-50 border border-slate-900 text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-slate-950" /> Teammate added and configured successfully!
                  </div>
                )}

                <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Analyst"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-900 rounded-none text-xs focus:outline-none font-bold uppercase tracking-wider text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. david@loop.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-900 rounded-none text-xs focus:outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Choose unique key"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-900 rounded-none text-xs focus:outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Access Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-white border border-slate-900 rounded-none text-xs focus:outline-none font-bold uppercase tracking-wider text-slate-900 cursor-pointer"
                    >
                      <option value="ADMIN">ADMIN (Full Control)</option>
                      <option value="ANALYST">ANALYST (Triage & Ingest)</option>
                      <option value="VIEWER">VIEWER (Read-Only)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={inviting}
                      className="px-4 py-2 bg-slate-900 hover:bg-white hover:text-slate-900 border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      {inviting ? 'Inviting...' : 'Create & Invite Teammate'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
