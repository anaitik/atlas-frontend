import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Settings, Plus, Trash2, Database, Component, Workflow, Globe2 } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { humanizeKey } from "../../lib/display-labels";

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
  const [activeTab, setActiveTab] = useState<"metrics" | "factors">("metrics");
  const [isAdding, setIsAdding] = useState(false);

  const [newMetric, setNewMetric] = useState({ key: "", description: "", pillar: "environmental", unit: "value", suggested_tool: "direct_read" });
  const [newFactor, setNewFactor] = useState({ key: "", value: 0, unit: "kgCO2e", source: "Custom", scope: 3 });

  const { data: metrics = [], isLoading: isMetricsLoading } = useQuery<MetricDefinition[]>({
    queryKey: ["metrics", companyId],
    queryFn: () => apiClient(`/settings/metrics?company_id=${companyId}`),
  });

  const { data: factors = [], isLoading: isFactorsLoading } = useQuery<EmissionFactor[]>({
    queryKey: ["factors", companyId],
    queryFn: () => apiClient(`/settings/factors?company_id=${companyId}`),
  });

  const deleteMetric = useMutation({
    mutationFn: (key: string) => apiClient(`/settings/metrics/${key}?company_id=${companyId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metrics"] }),
  });

  const deleteFactor = useMutation({
    mutationFn: (key: string) => apiClient(`/settings/factors/${key}?company_id=${companyId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["factors"] }),
  });

  const createMetric = useMutation({
    mutationFn: () => apiClient(`/settings/metrics?company_id=${companyId}`, { method: "POST", body: JSON.stringify(newMetric) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setIsAdding(false);
      setNewMetric({ key: "", description: "", pillar: "environmental", unit: "value", suggested_tool: "direct_read" });
    },
  });

  const createFactor = useMutation({
    mutationFn: () => apiClient(`/settings/factors?company_id=${companyId}`, { method: "POST", body: JSON.stringify(newFactor) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factors"] });
      setIsAdding(false);
      setNewFactor({ key: "", value: 0, unit: "kgCO2e", source: "Custom", scope: 3 });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="atlas-page-title text-atlas-600 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Data Dictionary and Routing
          </h1>
          <p className="atlas-page-subtitle max-w-2xl">
            Manage custom metric definitions and emission factors at the entity level. Changes apply to all workspaces in this company.
          </p>
        </div>
      </header>

      <div className="flex gap-2 bg-surface-secondary border border-border rounded-xl p-1 w-max">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition ${
            activeTab === "metrics" ? "bg-surface text-atlas-700 border border-border" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <span className="inline-flex items-center gap-2"><Database className="h-4 w-4" />Metric Catalog</span>
        </button>
        <button
          onClick={() => setActiveTab("factors")}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition ${
            activeTab === "factors" ? "bg-surface text-atlas-700 border border-border" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <span className="inline-flex items-center gap-2"><Workflow className="h-4 w-4" />Emission Factors</span>
        </button>
      </div>

      <div className="atlas-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[16px] font-bold text-text-primary">{activeTab === "metrics" ? "Custom Metric Definitions" : "Custom Emission Factors"}</h2>
          <button onClick={() => setIsAdding(!isAdding)} className="inline-flex items-center gap-2 px-4 py-2 bg-atlas-600 hover:bg-atlas-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            Add {activeTab === "metrics" ? "Metric" : "Factor"}
          </button>
        </div>

        {activeTab === "metrics" && (
          <div className="overflow-x-auto">
            {isMetricsLoading ? (
              <div className="text-text-secondary py-4">Loading metrics...</div>
            ) : (
              <table className="atlas-table whitespace-nowrap">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Description</th>
                    <th>Pillar</th>
                    <th>Unit</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdding && (
                    <tr className="bg-atlas-50">
                      <td className="py-3 px-2"><input className="atlas-input text-xs" placeholder="e.g. supplier_incident_count" value={newMetric.key} onChange={(e) => setNewMetric({ ...newMetric, key: e.target.value })} /></td>
                      <td className="py-3 px-2"><input className="atlas-input text-xs" placeholder="Description" value={newMetric.description} onChange={(e) => setNewMetric({ ...newMetric, description: e.target.value })} /></td>
                      <td className="py-3 px-2"><input className="atlas-input text-xs" placeholder="Pillar" value={newMetric.pillar} onChange={(e) => setNewMetric({ ...newMetric, pillar: e.target.value })} /></td>
                      <td className="py-3 px-2"><input className="atlas-input text-xs" placeholder="Unit" value={newMetric.unit} onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })} /></td>
                      <td className="py-3 px-2 text-right"><button onClick={() => createMetric.mutate()} className="text-success hover:underline text-xs font-bold">Save</button></td>
                    </tr>
                  )}
                  {metrics.map((m) => (
                    <tr key={m.key}>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          {m.company_id ? <Component className="h-4 w-4 text-atlas-600" /> : <Globe2 className="h-4 w-4 text-success" />}
                          <span className="text-xs text-atlas-700 font-medium">{humanizeKey(m.key)}</span>
                          <span className="text-[10px] text-text-muted block mt-0.5">{m.key}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-text-secondary truncate max-w-[300px]">{m.description}</td>
                      <td className="py-4 px-2"><span className="atlas-badge atlas-badge-gray">{m.pillar}</span></td>
                      <td className="py-4 px-2 text-text-secondary">{m.unit}</td>
                      <td className="py-4 px-2 text-right">
                        {m.company_id ? (
                          <button onClick={() => deleteMetric.mutate(m.key)} className="text-danger hover:underline p-1"><Trash2 className="h-4 w-4" /></button>
                        ) : (
                          <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Global</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "factors" && (
          <div className="overflow-x-auto">
            {isFactorsLoading ? (
              <div className="text-text-secondary py-4">Loading factors...</div>
            ) : (
              <table className="atlas-table whitespace-nowrap">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Scope</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdding && (
                    <tr className="bg-atlas-50">
                      <td className="py-3 px-2"><input className="atlas-input text-xs" placeholder="e.g. grid_electricity_us" value={newFactor.key} onChange={(e) => setNewFactor({ ...newFactor, key: e.target.value })} /></td>
                      <td className="py-3 px-2"><input type="number" step="0.0001" className="atlas-input text-xs" value={newFactor.value} onChange={(e) => setNewFactor({ ...newFactor, value: parseFloat(e.target.value) || 0 })} /></td>
                      <td className="py-3 px-2"><input className="atlas-input text-xs" placeholder="Unit" value={newFactor.unit} onChange={(e) => setNewFactor({ ...newFactor, unit: e.target.value })} /></td>
                      <td className="py-3 px-2"><input type="number" className="atlas-input text-xs" placeholder="Scope" value={newFactor.scope} onChange={(e) => setNewFactor({ ...newFactor, scope: parseInt(e.target.value) || 3 })} /></td>
                      <td className="py-3 px-2 text-right"><button onClick={() => createFactor.mutate()} className="text-success hover:underline text-xs font-bold">Save</button></td>
                    </tr>
                  )}
                  {factors.map((f) => (
                    <tr key={f.key}>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          {f.company_id ? <Component className="h-4 w-4 text-atlas-600" /> : <Globe2 className="h-4 w-4 text-success" />}
                          <span className="text-xs text-atlas-700 font-medium">{humanizeKey(f.key)}</span>
                          <span className="text-[10px] text-text-muted block mt-0.5">{f.key}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-text-primary font-medium">{f.value}</td>
                      <td className="py-4 px-2 text-text-secondary">{f.unit}</td>
                      <td className="py-4 px-2 text-text-secondary">Scope {f.scope}</td>
                      <td className="py-4 px-2 text-right">
                        {f.company_id ? (
                          <button onClick={() => deleteFactor.mutate(f.key)} className="text-danger hover:underline p-1"><Trash2 className="h-4 w-4" /></button>
                        ) : (
                          <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Global</span>
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
