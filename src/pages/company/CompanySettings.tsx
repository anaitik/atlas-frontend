import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Settings, Plus, Trash2, Database, Component, Workflow, Globe2 } from 'lucide-react';
import { apiClient } from "../../lib/api-client";

type MetricDefinition = {
  key: string;
  description: string;
  pillar: string;
  unit: string;
  suggested_tool?: string;
  company_id?: string | null;
};

type EmissionFactor = {
  key: string;
  value: number;
  unit: string;
  source?: string;
  scope: number;
  company_id?: string | null;
};

export function CompanySettings() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'metrics' | 'factors'>('metrics');
  const [isAdding, setIsAdding] = useState(false);
  
  const [newMetric, setNewMetric] = useState({ key: '', description: '', pillar: 'environmental', unit: 'value', suggested_tool: 'direct_read' });
  const [newFactor, setNewFactor] = useState({ key: '', value: 0, unit: 'kgCO2e', source: 'Custom', scope: 3 });

  const { data: metrics = [], isLoading: isMetricsLoading } = useQuery<MetricDefinition[]>({
    queryKey: ['metrics', companyId],
    queryFn: () => apiClient(`/settings/metrics?company_id=${companyId}`),
  });

  const { data: factors = [], isLoading: isFactorsLoading } = useQuery<EmissionFactor[]>({
    queryKey: ['factors', companyId],
    queryFn: () => apiClient(`/settings/factors?company_id=${companyId}`),
  });

  const deleteMetric = useMutation({
    mutationFn: (key: string) => apiClient(`/settings/metrics/${key}?company_id=${companyId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metrics'] }),
  });

  const deleteFactor = useMutation({
    mutationFn: (key: string) => apiClient(`/settings/factors/${key}?company_id=${companyId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['factors'] }),
  });

  const createMetric = useMutation({
    mutationFn: () => apiClient(`/settings/metrics?company_id=${companyId}`, { method: 'POST', body: JSON.stringify(newMetric) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setIsAdding(false);
      setNewMetric({ key: '', description: '', pillar: 'environmental', unit: 'value', suggested_tool: 'direct_read' });
    },
  });

  const createFactor = useMutation({
    mutationFn: () => apiClient(`/settings/factors?company_id=${companyId}`, { method: 'POST', body: JSON.stringify(newFactor) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factors'] });
      setIsAdding(false);
      setNewFactor({ key: '', value: 0, unit: 'kgCO2e', source: 'Custom', scope: 3 });
    },
  });

  return (
    <div className="flex h-full flex-col p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-slate-100 flex items-center gap-3">
          <Settings className="h-8 w-8 text-fuchsia-400" />
          Data Dictionary & Routing
        </h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Manage dynamic metric computations and emission factor libraries. These settings 
          override global defaults and apply to all workspaces in your tenant.
        </p>
      </div>

      <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl w-max mb-8 border border-white/5">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'metrics'
              ? 'bg-fuchsia-500/10 text-fuchsia-400 shadow-sm border border-fuchsia-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Database className="h-4 w-4" />
          Metric Catalog
        </button>
        <button
          onClick={() => setActiveTab('factors')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'factors'
              ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Workflow className="h-4 w-4" />
          Emission Factors
        </button>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            {activeTab === 'metrics' ? 'Custom Metric Definitions' : 'Custom Emission Factors'}
          </h2>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === 'metrics' ? 'Metric' : 'Factor'}
          </button>
        </div>

        {activeTab === 'metrics' && (
          <div className="overflow-x-auto">
            {isMetricsLoading ? (
              <div className="text-slate-400 py-4">Loading metrics...</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 px-2 font-medium">Metric Key</th>
                    <th className="pb-3 px-2 font-medium">Description</th>
                    <th className="pb-3 px-2 font-medium">Pillar</th>
                    <th className="pb-3 px-2 font-medium">Unit</th>
                    <th className="pb-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdding && (
                    <tr className="border-b border-white/10 bg-indigo-900/20">
                      <td className="py-3 px-2">
                        <input className="w-full bg-slate-800 border border-indigo-500/50 rounded px-2 py-1 text-xs text-white" placeholder="e.g. supplier_incident_count" value={newMetric.key} onChange={e => setNewMetric({...newMetric, key: e.target.value})} />
                      </td>
                      <td className="py-3 px-2">
                        <input className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white" placeholder="Description" value={newMetric.description} onChange={e => setNewMetric({...newMetric, description: e.target.value})} />
                      </td>
                      <td className="py-3 px-2">
                         <input className="w-24 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white" placeholder="Pillar" value={newMetric.pillar} onChange={e => setNewMetric({...newMetric, pillar: e.target.value})} />
                      </td>
                      <td className="py-3 px-2">
                         <input className="w-20 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white" placeholder="Unit" value={newMetric.unit} onChange={e => setNewMetric({...newMetric, unit: e.target.value})} />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button onClick={() => createMetric.mutate()} className="text-emerald-400 hover:text-emerald-300 px-3 py-1 bg-emerald-400/10 rounded text-xs font-bold">Save</button>
                      </td>
                    </tr>
                  )}
                  {metrics.map((m) => (
                    <tr key={m.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          {m.company_id ? <Component className="h-4 w-4 text-indigo-400" /> : <Globe2 className="h-4 w-4 text-emerald-400" />}
                          <span className="font-mono text-xs text-indigo-300">{m.key}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-slate-300 truncate max-w-[300px]">{m.description}</td>
                      <td className="py-4 px-2">
                        <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                          {m.pillar}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-slate-300">{m.unit}</td>
                      <td className="py-4 px-2 text-right">
                        {m.company_id ? (
                          <button onClick={() => deleteMetric.mutate(m.key)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Global</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'factors' && (
          <div className="overflow-x-auto">
            {isFactorsLoading ? (
              <div className="text-slate-400 py-4">Loading factors...</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 px-2 font-medium">Routing Key</th>
                    <th className="pb-3 px-2 font-medium">Value</th>
                    <th className="pb-3 px-2 font-medium">Unit</th>
                    <th className="pb-3 px-2 font-medium">Scope</th>
                    <th className="pb-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdding && (
                    <tr className="border-b border-white/10 bg-emerald-900/20">
                      <td className="py-3 px-2">
                        <input className="w-full bg-slate-800 border border-emerald-500/50 rounded px-2 py-1 text-xs text-white" placeholder="e.g. grid_electricity_us" value={newFactor.key} onChange={e => setNewFactor({...newFactor, key: e.target.value})} />
                      </td>
                      <td className="py-3 px-2">
                        <input type="number" step="0.0001" className="w-24 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white" value={newFactor.value} onChange={e => setNewFactor({...newFactor, value: parseFloat(e.target.value) || 0})} />
                      </td>
                      <td className="py-3 px-2">
                         <input className="w-20 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white" placeholder="Unit" value={newFactor.unit} onChange={e => setNewFactor({...newFactor, unit: e.target.value})} />
                      </td>
                      <td className="py-3 px-2">
                         <input type="number" className="w-16 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white" placeholder="Scope" value={newFactor.scope} onChange={e => setNewFactor({...newFactor, scope: parseInt(e.target.value) || 3})} />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button onClick={() => createFactor.mutate()} className="text-emerald-400 hover:text-emerald-300 px-3 py-1 bg-emerald-400/10 rounded text-xs font-bold">Save</button>
                      </td>
                    </tr>
                  )}
                  {factors.map((f) => (
                    <tr key={f.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2">
                         <div className="flex items-center gap-2">
                          {f.company_id ? <Component className="h-4 w-4 text-indigo-400" /> : <Globe2 className="h-4 w-4 text-emerald-400" />}
                          <span className="font-mono text-xs text-emerald-300">{f.key}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-white font-medium">{f.value}</td>
                      <td className="py-4 px-2 text-slate-300">{f.unit}</td>
                      <td className="py-4 px-2">Scope {f.scope}</td>
                      <td className="py-4 px-2 text-right">
                        {f.company_id ? (
                          <button onClick={() => deleteFactor.mutate(f.key)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Global</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
