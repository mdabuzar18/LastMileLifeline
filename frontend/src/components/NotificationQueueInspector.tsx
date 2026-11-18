import React, { useState, useEffect } from 'react';
import { NotificationStats, SimulatedNotification } from '../types';
import { api } from '../api';
import {
  Inbox,
  Pause,
  Play,
  RotateCw,
  Send,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Layers,
  FastForward,
  HelpCircle
} from 'lucide-react';

export const NotificationQueueInspector: React.FC = () => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [processingManual, setProcessingManual] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getNotificationStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load notification stats', e);
    }
  };

  const handleTogglePause = async () => {
    if (!stats) return;
    setToggling(true);
    setStatusMessage(null);
    try {
      const targetState = stats.worker_running; // if currently running, we want to pause (true)
      const res = await api.toggleWorkerPause(targetState);
      setStatusMessage(res.message);
      await loadStats();
    } catch (err: any) {
      alert(`Worker control error: ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleStepNextJob = async () => {
    setProcessingManual(true);
    setStatusMessage(null);
    try {
      const res = await api.processNextJob();
      if (res.status === 'processed') {
        setStatusMessage(`Manual step processed job #${res.job?.notification_id} (Success: ${res.delivery_success})`);
      } else {
        setStatusMessage('Queue is empty. No pending jobs to process.');
      }
      await loadStats();
    } catch (err: any) {
      alert(`Error running job step: ${err.message}`);
    } finally {
      setProcessingManual(false);
    }
  };

  const statusPill = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case 'sent':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Sent (Simulated)
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 w-fit">
            <AlertOctagon className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Simulated Notification Queue & Worker</h2>
                <span className="bg-blue-400/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-blue-400/30">
                  Mock Dispatch Provider
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Redis-backed resilient worker queue with automatic retry backoff and failure recovery.
              </p>
            </div>
          </div>

          {/* Demo Controls */}
          {stats && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePause}
                disabled={toggling}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  stats.worker_running
                    ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 ring-2 ring-amber-400/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/30 animate-bounce'
                }`}
              >
                {stats.worker_running ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause Worker (Demo Mode)
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Resume Worker (Drain Queue)
                  </>
                )}
              </button>

              <button
                onClick={handleStepNextJob}
                disabled={processingManual}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Process next queued job manually"
              >
                <FastForward className="w-3.5 h-3.5" /> Step 1 Job
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 font-medium">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Queue Counters */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between text-yellow-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Queued in Buffer</span>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.total_queued}</div>
            <div className="text-[11px] text-slate-400 mt-1">Pending delivery attempt</div>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">In Processing</span>
              <RotateCw className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.total_processing}</div>
            <div className="text-[11px] text-slate-400 mt-1">Worker active thread</div>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Delivered (Simulated)</span>
              <Send className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-700">{stats.total_sent}</div>
            <div className="text-[11px] text-emerald-600/80 mt-1">Stored mock records</div>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between text-red-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Failed After Retries</span>
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-3xl font-black text-red-600">{stats.total_failed}</div>
            <div className="text-[11px] text-red-600/80 mt-1">Max retries exceeded</div>
          </div>
        </div>
      )}

      {/* Queue Demonstration Walkthrough Card */}
      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 space-y-1">
        <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-600" />
          How to Demonstrate Queueing & Retry Recovery:
        </h4>
        <ol className="list-decimal list-inside space-y-0.5 ml-1 text-amber-800">
          <li>Click <strong>"Pause Worker (Demo Mode)"</strong> above. The queue worker enters pause mode.</li>
          <li>Go to the <strong>Approver Review</strong> tab and publish an alert (or create a new alert).</li>
          <li>Return here: Notice messages stacking up in the <strong>Queued in Buffer</strong> counter.</li>
          <li>Click <strong>"Resume Worker"</strong> (or "Step 1 Job"): Watch messages drain, simulate transient network drops, retry, and transition to "Sent (Simulated)".</li>
        </ol>
      </div>

      {/* Recent Dispatched Simulated Notifications Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
          <span>Recent Simulated Notification Jobs ({stats?.recent_jobs.length || 0})</span>
          <button
            onClick={loadStats}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        </h3>

        {(!stats || stats.recent_jobs.length === 0) ? (
          <p className="text-xs text-slate-500 py-6 text-center">No notification jobs dispatched yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Simulated Recipient</th>
                  <th className="py-2.5 px-3">Target Zone</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Queued Time</th>
                  <th className="py-2.5 px-3">Simulated Errors / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{job.id}</td>
                    <td className="py-2.5 px-3">{statusPill(job.status)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{job.recipient_pseudonym}</td>
                    <td className="py-2.5 px-3 text-slate-600">{job.recipient_zone}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-mono font-bold ${job.attempt_count > 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {job.attempt_count} / {job.max_retries}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(job.queued_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={job.last_error || 'No error'}>
                      {job.last_error ? (
                        <span className="text-amber-700 font-medium">⚠️ {job.last_error}</span>
                      ) : job.status === 'sent' ? (
                        <span className="text-emerald-700">Delivered successfully</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
