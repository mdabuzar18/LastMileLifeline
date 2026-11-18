import React, { useState } from 'react';
import { Alert, User } from '../types';
import { api } from '../api';
import { CheckCheck, XCircle, ShieldCheck, AlertCircle, Radio } from 'lucide-react';

interface ApproverViewProps {
  alerts: Alert[];
  currentUser: User | null;
  onRefreshAlerts: () => void;
}

export const ApproverView: React.FC<ApproverViewProps> = ({ alerts, currentUser, onRefreshAlerts }) => {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isApprover = currentUser?.role === 'approver';

  const pendingAlerts = alerts.filter((a) => a.status === 'pending_approval');
  const publishedAlerts = alerts.filter((a) => a.status === 'published');

  const handleApproveAndPublish = async (alertId: number) => {
    setProcessingId(alertId);
    setFeedback(null);
    try {
      const res = await api.approveAndPublish(alertId);
      setFeedback(`Alert #${alertId} "${res.title}" approved and published! Simulated notification batch has been enqueued to the background worker.`);
      onRefreshAlerts();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCloseAlert = async (alertId: number) => {
    if (!confirm('Are you sure you want to close this active alert? Check-ins will conclude.')) return;
    setProcessingId(alertId);
    try {
      await api.closeAlert(alertId);
      setFeedback(`Alert #${alertId} has been successfully closed.`);
      onRefreshAlerts();
    } catch (err: any) {
      alert(`Error closing alert: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {!isApprover && (
        <div className="bg-purple-50 border border-purple-300 text-purple-900 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>
            <strong>Verification Role Notice:</strong> You are currently signed in as <em>{currentUser ? currentUser.role : 'Guest'}</em>.
            Switch to the <strong>Approver</strong> role via the top bar to authorize pending alerts and trigger notification dispatch.
          </span>
        </div>
      )}

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Pending Approval Section */}
      <div className="bg-white rounded-xl shadow-xs border border-purple-200 p-5">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-purple-100">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-800">Pending Approver Review Queue</h2>
          <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full ml-auto">
            {pendingAlerts.length} Awaiting Authorization
          </span>
        </div>

        {pendingAlerts.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <CheckCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Approval queue is clear</p>
            <p className="text-xs text-slate-500 mt-1">
              Coordinators will submit drafts here for independent verification before dispatch.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border-2 border-purple-200 bg-purple-50/30 rounded-xl p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
                        Requires Verification
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-900 border border-yellow-300 px-2 py-0.5 rounded">
                        {alert.severity}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{alert.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Targeted Fictional Zone: <strong className="text-purple-900">{alert.zone}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveAndPublish(alert.id)}
                      disabled={!isApprover || processingId === alert.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      {processingId === alert.id ? 'Publishing & Enqueueing...' : 'Authorize & Publish Alert'}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-purple-100 text-sm text-slate-800 mb-3 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                    Alert Message Content:
                  </span>
                  {alert.message}
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-4">
                  <span>Author: <strong>{alert.created_by?.full_name || `User #${alert.created_by_id}`}</strong></span>
                  <span>Submitted: {new Date(alert.updated_at || alert.created_at).toLocaleString()}</span>
                  <span className="text-purple-700 font-medium">
                    ⚠️ Publishing will enqueue simulated notification jobs for resident contacts in this zone.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published Alerts Management */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-600" />
          Active Published Alerts ({publishedAlerts.length})
        </h3>

        {publishedAlerts.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No active published alerts at this time.</p>
        ) : (
          <div className="space-y-3">
            {publishedAlerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <h4 className="font-bold text-slate-900 text-sm">{a.title}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active Broadcast
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Zone: <strong>{a.zone}</strong> | Published: {a.published_at ? new Date(a.published_at).toLocaleTimeString() : 'Recent'}
                  </p>
                </div>

                {isApprover && (
                  <button
                    onClick={() => handleCloseAlert(a.id)}
                    disabled={processingId === a.id}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Close Alert
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
