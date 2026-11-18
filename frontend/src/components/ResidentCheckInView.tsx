import React, { useState, useEffect } from 'react';
import { Alert, CheckInStatus } from '../types';
import { api } from '../api';
import { Shield, CheckCircle, AlertTriangle, HelpCircle, Send, CheckCheck, Info, RefreshCw } from 'lucide-react';

interface ResidentCheckInViewProps {
  onCheckInSubmitted?: () => void;
}

const FICTIONAL_ZONES = [
  "Zone Alpha - Riverfront",
  "Zone Beta - Highland Ridge",
  "Zone Gamma - Valley Creek",
  "Zone Delta - Industrial Basin"
];

export const ResidentCheckInView: React.FC<ResidentCheckInViewProps> = ({ onCheckInSubmitted }) => {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [statusChoice, setStatusChoice] = useState<CheckInStatus>('safe');
  const [residentIdentifier, setResidentIdentifier] = useState('Household-402 (Pinecrest Ave)');
  const [zone, setZone] = useState(FICTIONAL_ZONES[0]);
  const [assistanceNotes, setAssistanceNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingAlerts, setFetchingAlerts] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    loadActiveAlerts();
  }, []);

  const loadActiveAlerts = async () => {
    setFetchingAlerts(true);
    try {
      const alerts = await api.getActiveAlerts();
      setActiveAlerts(alerts);
      if (alerts.length > 0 && !selectedAlertId) {
        setSelectedAlertId(alerts[0].id);
        setZone(alerts[0].zone);
      }
    } catch (e) {
      console.error('Failed to load active alerts', e);
    } finally {
      setFetchingAlerts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId) {
      alert('Please select an active alert to check in against.');
      return;
    }
    if (!residentIdentifier.trim()) {
      alert('Please enter a resident identifier or household code.');
      return;
    }

    setLoading(true);
    setSubmissionResult(null);
    try {
      const res = await api.submitCheckIn({
        alert_id: selectedAlertId,
        resident_identifier: residentIdentifier,
        zone,
        status: statusChoice,
        assistance_notes: assistanceNotes.trim() ? assistanceNotes : undefined,
      });
      setSubmissionResult(res);
      if (onCheckInSubmitted) {
        onCheckInSubmitted();
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedAlert = activeAlerts.find((a) => a.id === selectedAlertId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mobile-friendly check-in card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-blue-200" />
              <h2 className="text-xl font-extrabold tracking-tight">Community Resident Check-In</h2>
            </div>
            <button
              onClick={loadActiveAlerts}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
              title="Refresh active alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingAlerts ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-xs text-blue-100 mt-1.5 leading-relaxed">
            Quickly notify local community coordinators and responders of your status.
            Duplicate submissions from the same resident code are automatically deduplicated to prevent false headcounts.
          </p>
        </div>

        {/* Confirmation banner */}
        {submissionResult && (
          <div className="m-5 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-start gap-3">
            <CheckCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Status Successfully Recorded!</h4>
              <p className="text-xs text-emerald-800 mt-0.5">{submissionResult.message}</p>
              <p className="text-[11px] text-emerald-700 mt-1 italic">
                * Idempotent check-in: If your situation changes, you can submit again anytime to update your status.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Active alert selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Active Simulated Alert:
            </label>
            {activeAlerts.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                No active published alerts found. An Approver must publish an alert first, or view seeded alerts.
              </div>
            ) : (
              <select
                value={selectedAlertId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedAlertId(id);
                  const found = activeAlerts.find((a) => a.id === id);
                  if (found) setZone(found.zone);
                }}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50"
              >
                {activeAlerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.severity.toUpperCase()}] {a.title} ({a.zone})
                  </option>
                ))}
              </select>
            )}
            {selectedAlert && (
              <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600">
                <strong>Advisory:</strong> {selectedAlert.message}
              </div>
            )}
          </div>

          {/* Three primary choices: Safe, Need Assistance, Unable to respond */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Your Current Safety Status:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Safe */}
              <button
                type="button"
                onClick={() => setStatusChoice('safe')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                  statusChoice === 'safe'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:border-emerald-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className={`w-6 h-6 ${statusChoice === 'safe' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {statusChoice === 'safe' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">I'm Safe</div>
                  <div className="text-xs text-slate-500 mt-0.5">Secure, no current hazards or emergency assistance needed.</div>
                </div>
              </button>

              {/* Option 2: Need Assistance */}
              <button
                type="button"
                onClick={() => setStatusChoice('need_assistance')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                  statusChoice === 'need_assistance'
                    ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/30'
                    : 'border-slate-200 hover:border-amber-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-6 h-6 ${statusChoice === 'need_assistance' ? 'text-amber-600' : 'text-slate-400'}`} />
                  {statusChoice === 'need_assistance' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">Need Assistance</div>
                  <div className="text-xs text-slate-500 mt-0.5">Non-life-critical community aid, mobility help, or shelter.</div>
                </div>
              </button>

              {/* Option 3: Unable to respond */}
              <button
                type="button"
                onClick={() => setStatusChoice('unable_to_respond')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                  statusChoice === 'unable_to_respond'
                    ? 'border-slate-700 bg-slate-100 ring-2 ring-slate-500/30'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <HelpCircle className={`w-6 h-6 ${statusChoice === 'unable_to_respond' ? 'text-slate-700' : 'text-slate-400'}`} />
                  {statusChoice === 'unable_to_respond' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">Unable to Respond</div>
                  <div className="text-xs text-slate-500 mt-0.5">Reported by neighbor/proxy or resident incapacitated/away.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Resident identifier & Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Household / Pseudonym Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Household-402 or Unit 8B"
                value={residentIdentifier}
                onChange={(e) => setResidentIdentifier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Never enter real government IDs, passwords, or personal phone numbers.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Neighborhood Zone
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {FICTIONAL_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional assistance notes */}
          {statusChoice === 'need_assistance' && (
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                Assistance Notes / Non-PII Requirements:
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Need sandbags for perimeter; elderly resident requires wheelchair assistance to community center."
                value={assistanceNotes}
                onChange={(e) => setAssistanceNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-slate-800"
              ></textarea>
              <span className="text-[11px] text-amber-700 block">
                Notice: For actual life-threatening emergencies, contact local official first responders directly. This is a training simulator.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || activeAlerts.length === 0}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Transmitting Check-In...' : 'Submit Simulated Check-In'}
          </button>
        </form>
      </div>

      {/* Safety & Deduplication Notice */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Info className="w-4 h-4 text-blue-600" />
          <span>How Deduplication Works in this Prototype</span>
        </div>
        <p>
          To prevent accidental double-clicks or multiple check-ins from skewing community response numbers,
          the system derives an anonymous cryptographic token from your simulated household code and alert ID.
          Subsequent check-ins will update your latest status without creating multiple duplicate records.
        </p>
      </div>
    </div>
  );
};
