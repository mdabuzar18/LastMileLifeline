import React, { useState } from 'react';
import { Alert, AlertSeverity, User } from '../types';
import { api } from '../api';
import { PlusCircle, Send, Clock, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface CoordinatorViewProps {
  alerts: Alert[];
  currentUser: User | null;
  onRefreshAlerts: () => void;
}

const FICTIONAL_ZONES = [
  "Zone Alpha - Riverfront",
  "Zone Beta - Highland Ridge",
  "Zone Gamma - Valley Creek",
  "Zone Delta - Industrial Basin"
];

export const CoordinatorView: React.FC<CoordinatorViewProps> = ({ alerts, currentUser, onRefreshAlerts }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [zone, setZone] = useState(FICTIONAL_ZONES[0]);
  const [severity, setSeverity] = useState<AlertSeverity>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isCoordinator = currentUser?.role === 'coordinator';

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      await api.createAlert({
        title,
        message,
        zone,
        severity
      });
      setTitle('');
      setMessage('');
      setActionMessage('New draft alert created successfully. Ready for review or submission to Approver.');
      onRefreshAlerts();
    } catch (err: any) {
      alert(`Error creating draft: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async (alertId: number) => {
    try {
      await api.submitForApproval(alertId);
      setActionMessage(`Alert #${alertId} submitted to Approver for verification.`);
      onRefreshAlerts();
    } catch (err: any) {
      alert(`Error submitting for approval: ${err.message}`);
    }
  };

  const severityBadge = (s: AlertSeverity) => {
    const map = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
    };
    return (
      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${map[s]}`}>
        {s}
      </span>
    );
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'draft':
        return <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium border border-slate-300">Draft</span>;
      case 'pending_approval':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-medium border border-purple-300">Pending Approval</span>;
      case 'published':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-medium border border-emerald-300">Published</span>;
      case 'closed':
        return <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-0.5 rounded font-medium border border-zinc-300">Closed</span>;
      default:
        return <span>{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Role permission banner */}
      {!isCoordinator && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>
            <strong>Read-Only Mode:</strong> You are currently signed in as <em>{currentUser ? currentUser.role : 'Guest'}</em>.
            Switch to the <strong>Coordinator</strong> role via the top bar to create and edit draft alerts.
          </span>
        </div>
      )}

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Creation form */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Draft New Community Alert</h2>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded ml-auto">
            Step 1 of 2: Authoring
          </span>
        </div>

        <form onSubmit={handleCreateDraft} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Alert Title (Simulated)
              </label>
              <input
                type="text"
                required
                disabled={!isCoordinator || submitting}
                placeholder="e.g., Precautionary High-Water Advisory"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Severity Level
              </label>
              <select
                disabled={!isCoordinator || submitting}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
              >
                <option value="low">Low (Advisory)</option>
                <option value="medium">Medium (Precautionary)</option>
                <option value="high">High (Immediate Action)</option>
                <option value="critical">Critical (Evacuation/Shelter)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Fictional Affected Zone
            </label>
            <select
              disabled={!isCoordinator || submitting}
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
            >
              {FICTIONAL_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Alert Advisory Message
            </label>
            <textarea
              required
              rows={3}
              disabled={!isCoordinator || submitting}
              placeholder="Provide clear, concise instructions for residents in the specified zone..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isCoordinator || submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              {submitting ? 'Saving Draft...' : 'Create Draft Alert'}
            </button>
          </div>
        </form>
      </div>

      {/* Alert List and State Management */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
          <span>All Simulated Alerts & Audit Trail</span>
          <button
            onClick={onRefreshAlerts}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh List
          </button>
        </h3>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No alerts found.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 text-base">{alert.title}</h4>
                      {severityBadge(alert.severity)}
                      {statusBadge(alert.status)}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Affected Area: <span className="text-slate-700 font-semibold">{alert.zone}</span>
                    </p>
                  </div>

                  {/* Actions depending on state */}
                  {alert.status === 'draft' && isCoordinator && (
                    <button
                      onClick={() => handleSubmitForApproval(alert.id)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit for Approval
                    </button>
                  )}
                </div>

                <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 my-2">
                  {alert.message}
                </p>

                {/* Audit trail */}
                <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <span className="font-medium text-slate-600">Created by: </span>
                    {alert.created_by?.full_name || `User #${alert.created_by_id}`}
                    <div className="text-[10px] text-slate-400">
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-slate-600">Approved by: </span>
                    {alert.approved_by?.full_name || (alert.approved_by_id ? `User #${alert.approved_by_id}` : '—')}
                    {alert.approved_at && (
                      <div className="text-[10px] text-slate-400">
                        {new Date(alert.approved_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="font-medium text-slate-600">Published by: </span>
                    {alert.published_by?.full_name || (alert.published_by_id ? `User #${alert.published_by_id}` : '—')}
                    {alert.published_at && (
                      <div className="text-[10px] text-slate-400">
                        {new Date(alert.published_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="font-medium text-slate-600">Closed by: </span>
                    {alert.closed_by?.full_name || (alert.closed_by_id ? `User #${alert.closed_by_id}` : '—')}
                    {alert.closed_at && (
                      <div className="text-[10px] text-slate-400">
                        {new Date(alert.closed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
