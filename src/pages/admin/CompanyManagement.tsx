import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { env } from "../../lib/env";

interface Company {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export function CompanyManagement() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPreparingDemo, setIsPreparingDemo] = useState(false);

  const fetchCompanies = async () => {
    try {
      const res: any = await apiClient("/companies?page_size=50");
      setCompanies(res.data || []); 
    } catch (e) {
      console.error("Failed to fetch companies:", e);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = async () => {
    if (!newCompanyName || isCreating) return;
    
    setIsCreating(true);
    try {
      await apiClient("/companies", {
        method: "POST",
        body: JSON.stringify({ name: newCompanyName })
      });
      setNewCompanyName("");
      await fetchCompanies();
    } catch (e: any) {
      console.error("Provisioning failed:", e);
      alert(`Failed to provision entity: ${e.message || "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrepareDemo = async () => {
    if (isPreparingDemo) return;
    setIsPreparingDemo(true);
    try {
      const targetName = "NovaTerra Manufacturing Ltd";
      let existing = companies.find((company) => company.name.toLowerCase() === targetName.toLowerCase());

      if (!existing) {
        await apiClient("/companies", {
          method: "POST",
          body: JSON.stringify({ name: targetName }),
        });
        const refreshed: any = await apiClient("/companies?page_size=100");
        const list = refreshed.data || [];
        setCompanies(list);
        existing = list.find((company: Company) => company.name.toLowerCase() === targetName.toLowerCase());
      }

      if (existing) {
        navigate(`/c/${existing.id}`);
      } else {
        alert("Unable to prepare NovaTerra automatically. Please create it manually.");
      }
    } catch (e: any) {
      alert(`Demo preparation failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsPreparingDemo(false);
    }
  };


  return (
    <div className="space-y-6">
      {env.DEMO_MODE && (
        <div className="rounded-lg border border-atlas-200 bg-atlas-50 px-3 py-2 text-[12px] text-atlas-800">
          <strong>Act 2 cue:</strong> Provision NovaTerra, then highlight role-based segregation of duties.
        </div>
      )}
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="atlas-page-title text-atlas-600">Entity Management</h1>
          <p className="atlas-page-subtitle">Provision isolated corporate environments for reporting.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrepareDemo} disabled={isPreparingDemo}>
            {isPreparingDemo ? "Preparing Demo..." : "Prepare NovaTerra Demo"}
          </Button>
          <input 
            type="text" 
            placeholder="New Entity Name..." 
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            className="atlas-input w-64"
          />
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Provisioning..." : "Provision Entity"}
          </Button>

        </div>
      </header>

      <Card variant="flush">
        <table className="atlas-table">
          <thead>
            <tr>
              <th>Entity Name</th>
              <th>Tenant ID</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td className="font-semibold text-text-primary">{c.name}</td>
                <td className="font-mono text-[11px] text-text-muted">{c.id}</td>
                <td>
                  <Badge variant={c.status === 'active' ? 'green' : 'red'}>
                    {c.status.toUpperCase()}
                  </Badge>
                </td>
                <td className="text-right">
                  <Button 
                    variant="ghost" 
                    className="text-[12px] px-3 py-1"
                    onClick={() => navigate(`/c/${c.id}`)}
                  >
                    Manage Workspaces
                  </Button>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-text-muted italic">
                  No entities provisioned yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
