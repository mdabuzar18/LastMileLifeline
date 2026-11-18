import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { api, setToken } from '../api';
import { UserCheck, LogOut, KeyRound } from 'lucide-react';

interface RoleSwitcherProps {
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentUser, onUserChanged }) => {
  const [demoAccounts, setDemoAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accounts = await api.getDemoAccounts();
      setDemoAccounts(accounts);
    } catch (e) {
      console.error('Failed to load demo accounts', e);
    }
  };

  const handleSelectRole = async (email: string, role: UserRole) => {
    setLoading(true);
    try {
      // Default demo passwords match role + "123"
      const password = `${role}123`;
      const res = await api.login(email, password);
      setToken(res.access_token);
      onUserChanged(res.user);
    } catch (err: any) {
      alert(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    onUserChanged(null);
  };

  const roleColors: Record<UserRole, string> = {
    coordinator: 'bg-blue-100 text-blue-800 border-blue-300',
    approver: 'bg-purple-100 text-purple-800 border-purple-300',
    responder: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    resident: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-slate-500" />
        <span className="font-medium text-slate-700">Demo Role Switcher:</span>
        <div className="flex flex-wrap gap-1.5">
          {demoAccounts.map((account) => {
            const isSelected = currentUser?.id === account.id;
            return (
              <button
                key={account.id}
                disabled={loading}
                onClick={() => handleSelectRole(account.email, account.role)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'ring-2 ring-blue-600 font-bold shadow-xs ' + roleColors[account.role]
                    : 'hover:bg-slate-50 border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <span className="capitalize">{account.role}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Signed in as:</span>
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">{currentUser.full_name}</span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                roleColors[currentUser.role]
              }`}
            >
              {currentUser.role}
            </span>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-amber-700 font-medium">Viewing as Unauthenticated Guest</span>
        )}
      </div>
    </div>
  );
};
