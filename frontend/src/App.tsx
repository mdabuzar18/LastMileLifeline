import React, { useEffect, useState } from 'react';
import { Alert, User } from './types';
import { api, getToken } from './api';
import { HeaderBanner } from './components/HeaderBanner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { CoordinatorView } from './components/CoordinatorView';
import { ApproverView } from './components/ApproverView';
import { ResidentCheckInView } from './components/ResidentCheckInView';
import { ResponderDashboard } from './components/ResponderDashboard';
import { NotificationQueueInspector } from './components/NotificationQueueInspector';
import { HealthStatusModal } from './components/HealthStatusModal';
import {
  ShieldAlert,
  Send,
  BarChart3,
  FileEdit,
  CheckCircle,
  Layers,
  Activity
} from 'lucide-react';

type ActiveTab = 'resident' | 'responder' | 'coordinator' | 'approver' | 'queue';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('responder');
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      // 1. Check existing token
      if (getToken()) {
        try {
          const user = await api.getCurrentUser();
          setCurrentUser(user);
        } catch {
          // Token expired or invalid
        }
      } else {
        // Log in by default as responder for immediate dashboard viewing
        try {
          const accounts = await api.getDemoAccounts();
          const responderAcc = accounts.find((a) => a.role === 'responder') || accounts[0];
          if (responderAcc) {
            const res = await api.login(responderAcc.email, `${responderAcc.role}123`);
            setCurrentUser(res.user);
          }
        } catch (e) {
          console.warn('Auto-login to demo account skipped', e);
        }
      }

      // 2. Load alerts
      await loadAlerts();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load alerts', e);
    }
  };

  const handleUserChanged = (user: User | null) => {
    setCurrentUser(user);
    if (user?.role === 'coordinator') {
      setActiveTab('coordinator');
    } else if (user?.role === 'approver') {
      setActiveTab('approver');
    } else if (user?.role === 'resident') {
      setActiveTab('resident');
    } else if (user?.role === 'responder') {
      setActiveTab('responder');
    }
    loadAlerts();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Mandatory Safety Banner */}
      <HeaderBanner />

      {/* 2. Demo Role Switcher Bar */}
      <RoleSwitcher currentUser={currentUser} onUserChanged={handleUserChanged} />

      {/* 3. Top Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl shadow-xs">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white">LastMile Lifeline</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    Prototype
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Resilient Simulated Emergency Alert & Check-In Coordination
                </p>
              </div>
            </div>

            {/* Health & Metrics modal trigger */}
            <button
              onClick={() => setIsHealthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="System Telemetry & Health"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Health & Metrics</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('responder')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'responder'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Responder Dashboard
            </button>

            <button
              onClick={() => setActiveTab('resident')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'resident'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Send className="w-4 h-4" />
              Resident Check-In (Mobile)
            </button>

            <button
              onClick={() => setActiveTab('coordinator')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'coordinator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileEdit className="w-4 h-4" />
              Coordinator (Drafts)
            </button>

            <button
              onClick={() => setActiveTab('approver')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'approver'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Approver Review
              {alerts.filter((a) => a.status === 'pending_approval').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'queue'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Queue & Worker Inspector
            </button>
          </nav>
        </div>
      </header>

      {/* 4. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'responder' && (
          <ResponderDashboard alerts={alerts} onRefreshAlerts={loadAlerts} />
        )}

        {activeTab === 'resident' && (
          <ResidentCheckInView onCheckInSubmitted={loadAlerts} />
        )}

        {activeTab === 'coordinator' && (
          <CoordinatorView alerts={alerts} currentUser={currentUser} onRefreshAlerts={loadAlerts} />
        )}

        {activeTab === 'approver' && (
          <ApproverView alerts={alerts} currentUser={currentUser} onRefreshAlerts={loadAlerts} />
        )}

        {activeTab === 'queue' && (
          <NotificationQueueInspector />
        )}
      </main>

      {/* 5. Footer with safety boundary */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <div className="font-semibold text-slate-300">
            LastMile Lifeline Prototype — Learning & Engineering Coordination Demo
          </div>
          <p className="max-w-2xl mx-auto text-slate-500 text-[11px] leading-relaxed">
            Safety Boundary Notice: This application does not connect to 911, public alerting broadcasters (WEA/EAS), or live SMS/telecommunication networks.
            All contact records, zones, delivery states, and check-ins are strictly fictional and stored locally for architectural resilience demonstrations.
          </p>
        </div>
      </footer>

      {/* Health Modal */}
      <HealthStatusModal isOpen={isHealthOpen} onClose={() => setIsHealthOpen(false)} />
    </div>
  );
}
