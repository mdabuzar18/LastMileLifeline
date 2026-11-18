import React, { useEffect, useState } from 'react';
import { HealthResponse } from '../types';
import { api } from '../api';
import { Activity, CheckCircle2, XCircle, ExternalLink, X, RefreshCw, Cpu } from 'lucide-react';

interface HealthStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthStatusModal: React.FC<HealthStatusModalProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHealth();
    }
  }, [isOpen]);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHealthReadiness();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to health probe');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">System Telemetry & Health Checks</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span>Readiness Probe: <code>/health/ready</code></span>
            <button
              onClick={loadHealth}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-check
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {health && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-700">Overall System Status:</span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                    health.status === 'ready'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {health.status}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Required Dependency Checks:
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {Object.entries(health.dependencies).map(([dep, depStatus]) => {
                    const isOk = depStatus.startsWith('healthy');
                    return (
                      <div
                        key={dep}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg"
                      >
                        <span className="font-semibold text-slate-800 capitalize">{dep} Engine:</span>
                        <span
                          className={`font-mono font-bold ${
                            isOk ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {depStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 space-y-1">
                <div>Version: <span className="font-semibold text-slate-700">{health.version}</span></div>
                <div>Environment: <span className="font-semibold text-slate-700">{health.environment}</span></div>
                <div>Server UTC: <span className="font-mono text-slate-600">{new Date(health.timestamp).toISOString()}</span></div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
            <a
              href="/metrics"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-slate-600" />
              Prometheus /metrics <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              OpenAPI Swagger /docs <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
