import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { apiClient } from "../../lib/api-client";
import { useWorkspaceStore } from "../../store/workspace";
import { useMutation } from "@tanstack/react-query";

type WorkspaceSummary = {
  id: string;
  name: string;
  description: string;
  company_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function CompanyHome() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const {
    activeWorkspaceId,
    setActiveCompany,
    setActiveWorkspace,
  } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Loading Entity...");
  const deleteWorkspace = useMutation({
    mutationFn: (workspaceId: string) => 
      apiClient(`/companies/${companyId}/workspaces/${workspaceId}`, { method: 'DELETE' }),
    onSuccess: (_, deletedId) => {
      setWorkspaces(prev => prev.filter(w => w.id !== deletedId));
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to delete workspace.");
    }
  });

  useEffect(() => {
    if (!companyId || companyId === "setup") return;
    
    apiClient(`/companies/${companyId}`)
      .then((data: any) => {
        setCompanyName(data.name || "Entity Overview");
        setActiveCompany(companyId, data.name);
      })
      .catch(() => setCompanyName("Entity Overview"));

    apiClient<WorkspaceSummary[]>(`/companies/${companyId}/workspaces`)
      .then((data) => setWorkspaces(data || []))
      .catch((err) => setErrorMessage(err.message || "Failed to load workspaces."));
  }, [companyId, setActiveCompany]);

  if (companyId === "setup") {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-warning-bg rounded-full flex items-center justify-center mb-5 border border-warning-border">
          <span className="material-symbols-outlined text-[32px] text-warning">hourglass_empty</span>
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-2">Account Provisioning</h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Your account needs to be assigned to an entity by the system administrator before you can access the platform.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="atlas-page-title text-atlas-600">{companyName}</h1>
          <p className="atlas-page-subtitle">Entity Workspaces & Reporting Periods</p>
        </div>
        <Button onClick={() => navigate(`/c/${companyId}/workspaces/new`)}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Workspace
        </Button>
      </header>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      {/* ── Top KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Workspaces" value={workspaces.length} icon="source_environment" variant="default" />
        <StatCard label="Active Now" value={workspaces.filter(w => w.status === "active").length || 1} icon="bolt" variant="success" />
        <StatCard label="Pending Review" value={0} icon="pending_actions" variant="warning" />
        <StatCard label="Published Reports" value={0} icon="workspace_premium" variant="muted" />
      </div>

      {/* ── Workspace Cards ──────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-text-primary">Reporting Periods</h2>
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <button className="flex items-center gap-1 hover:text-text-primary transition-colors">
            <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter
          </button>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <Card className="py-16 text-center shadow-none border-dashed bg-surface-secondary/50">
          <span className="material-symbols-outlined text-[48px] text-text-muted mb-4 block">folder_open</span>
          <h3 className="text-[16px] font-semibold text-text-primary mb-1">No workspaces found</h3>
          <p className="text-[13px] text-text-secondary mb-6">Initialize a reporting boundary to begin the data pipeline.</p>
          <Button onClick={() => navigate(`/c/${companyId}/workspaces/new`)}>Initialize Workspace</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {workspaces.map((workspace) => {
            const isActiveContext = activeWorkspaceId === workspace.id;

            return (
              <Card key={workspace.id} variant="interactive" className="flex flex-col h-full border-t-4 border-t-atlas-500">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[16px] font-bold text-text-primary mb-1">{workspace.name}</h3>
                    <Badge variant={workspace.status === "active" ? "green" : "gray"}>
                      {workspace.status.toUpperCase()}
                    </Badge>
                  </div>
                  {isActiveContext && (
                    <span className="material-symbols-outlined text-success" title="Current Selection">check_circle</span>
                  )}
                </div>

                <p className="text-[12px] text-text-secondary mb-6 flex-1">
                  {workspace.description || "No description provided."}
                </p>

                <div className="flex gap-2 pt-4 border-t border-border mt-auto">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (companyId) setActiveCompany(companyId, companyName);
                      setActiveWorkspace(workspace.id, workspace.name);
                      navigate(`/w/${workspace.id}/extraction`);
                    }}
                  >
                    Enter Workspace
                  </Button>
                  <Button variant="ghost" onClick={() => { setActiveWorkspace(workspace.id, workspace.name); navigate(`/w/${workspace.id}/members`); }} className="px-3 hover:text-indigo-600 hover:bg-indigo-50" title="Settings">
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    if(confirm("Are you sure you want to delete this workspace completely? All pipeline data will be lost.")) {
                      deleteWorkspace.mutate(workspace.id);
                    }
                  }} className="px-3 !text-red-500 hover:bg-red-50" title="Delete Workspace">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
