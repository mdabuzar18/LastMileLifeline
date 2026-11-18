import React, { useState, useEffect } from 'react';
import { Alert, AlertCheckInAggregate } from '../types';
import { api } from '../api';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  MapPin,
  RefreshCw,
  Clock,
  Radio,
  FileText
} from 'lucide-react';

interface ResponderDashboardProps {
  alerts: Alert[];
  onRefreshAlerts?: () => void;
}

export const ResponderDashboard: React.FC<ResponderDashboardProps> = ({ alerts, onRefreshAlerts }) => {
  const publishedAlerts = alerts.filter((a) => a.status === 'published' || a.status === 'closed');
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [aggregateData, setAggregateData] = useState<AlertCheckInAggregate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publishedAlerts.length > 0 && !selectedAlertId) {
      setSelectedAlertId(publishedAlerts[0].id);
    }
  }, [publishedAlerts]);

  useEffect(() => {
    if (selectedAlertId) {
      loadAggregate(selectedAlertId);
    }
  }, [selectedAlertId]);

  const loadAggregate = async (alertId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAlertAggregate(alertId);
      setAggregateData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load check-in statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedAlertId) {
      loadAggregate(selectedAlertId);
    }
    if (onRefreshAlerts) {
      onRefreshAlerts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Responder Triage & Area Status</h2>
            <p className="text-xs text-slate-500">
              Aggregated community check-ins by fictional zone (No resident PII or street addresses exposed).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {publishedAlerts.length > 0 && (
            <select
              value={selectedAlertId || ''}
              onChange={(e) => setSelectedAlertId(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {publishedAlerts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.status.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-300 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !aggregateData && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading aggregate telemetry...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>Error loading dashboard metrics: {error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && publishedAlerts.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Radio className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">No Published Alerts Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Once a Coordinator creates a draft and an Approver verifies it, simulated resident responses will populate this real-time aggregate board.
          </p>
        </div>
      )}

      {/* Main Stats Display */}
      {aggregateData && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Check-Ins</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{aggregateData.total_checkins}</div>
              <div className="text-[11px] text-slate-400 mt-1">Unique households</div>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-emerald-200 bg-emerald-50/20 p-4">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Safe</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{aggregateData.safe_total}</div>
              <div className="text-[11px] text-emerald-600/80 mt-1">
                {aggregateData.total_checkins > 0
                  ? `${Math.round((aggregateData.safe_total / aggregateData.total_checkins) * 100)}% of total`
                  : '0%'}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-amber-200 bg-amber-50/20 p-4">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Need Assistance</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700">{aggregateData.need_assistance_total}</div>
              <div className="text-[11px] text-amber-700/80 mt-1">Requires responder aid</div>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Unable to Respond</span>
                <HelpCircle className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-700">{aggregateData.unable_to_respond_total}</div>
              <div className="text-[11px] text-slate-400 mt-1">Reported by proxy / away</div>
            </div>
          </div>

          {/* Breakdown By Zone */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Check-In Breakdown by Fictional Zone
            </h3>

            {aggregateData.zones.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No zone data recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {aggregateData.zones.map((zone) => {
                  const safePct = zone.total > 0 ? (zone.safe_count / zone.total) * 100 : 0;
                  const assistPct = zone.total > 0 ? (zone.need_assistance_count / zone.total) * 100 : 0;
                  const unablePct = zone.total > 0 ? (zone.unable_to_respond_count / zone.total) * 100 : 0;

                  return (
                    <div key={zone.zone} className="border border-slate-100 bg-slate-50/60 rounded-xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-slate-900 text-sm">{zone.zone}</span>
                        <div className="text-xs text-slate-600 flex gap-3">
                          <span className="text-emerald-700 font-semibold">{zone.safe_count} Safe</span>
                          <span className="text-amber-700 font-semibold">{zone.need_assistance_count} Need Help</span>
                          <span className="text-slate-500">{zone.unable_to_respond_count} Unconfirmed</span>
                          <span className="font-bold text-slate-900">Total: {zone.total}</span>
                        </div>
                      </div>

                      {/* Visual proportional distribution bar */}
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${safePct}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                          title={`Safe: ${zone.safe_count}`}
                        ></div>
                        <div
                          style={{ width: `${assistPct}%` }}
                          className="bg-amber-500 h-full transition-all duration-500"
                          title={`Need Assistance: ${zone.need_assistance_count}`}
                        ></div>
                        <div
                          style={{ width: `${unablePct}%` }}
                          className="bg-slate-400 h-full transition-all duration-500"
                          title={`Unable to Respond: ${zone.unable_to_respond_count}`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assistance Requests List (Non-PII) */}
          <div className="bg-white rounded-xl shadow-xs border border-amber-200 p-5">
            <h3 className="text-base font-bold text-amber-950 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Priority Assistance Requests (Non-PII Neighborhood Aid Triage)
            </h3>

            {aggregateData.recent_assistance_requests.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No assistance notes filed for this alert.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aggregateData.recent_assistance_requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-bold text-amber-900">{req.zone}</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        {new Date(req.updated_at || req.submitted_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-800 text-sm font-medium mt-1">
                      "{req.assistance_notes}"
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Ref Hash: {req.resident_id_hash}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
