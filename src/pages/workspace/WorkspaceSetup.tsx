import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../lib/api-client";

export function WorkspaceSetup() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await apiClient(`/companies/${companyId}/workspaces`, {
        method: "POST",
        body: JSON.stringify({
          name, 
          description: desc,
          require_extraction_review: true,
          require_metric_approval: true,
          require_publish_approval: true
        })
      });
      navigate(`/c/${companyId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="mb-8">
        <Button variant="ghost" onClick={() => navigate(`/c/${companyId}`)} className="mb-4 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
        </Button>
        <h1 className="atlas-page-title text-atlas-600">Initialize Workspace</h1>
        <p className="atlas-page-subtitle">Configure a boundary for an audit year or specific subsidiary. Default ESG evidence templates are auto-provisioned on creation.</p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              className="atlas-input"
              placeholder="e.g., FY 2026 Audit Region EMEA"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Scope Description Strategy (Optional)
            </label>
            <textarea
              className="atlas-input h-32 resize-none"
              placeholder="Detail the reporting standard and operational boundary..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>
          
          <div className="pt-5 border-t border-border flex justify-end">
             <Button type="submit" disabled={loading}>
               {loading ? "Initializing..." : "Create Workspace & Load Defaults"}
             </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
