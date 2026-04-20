import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

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

  const fetchCompanies = async () => {
    try {
      const res: any = await apiClient("/companies?page_size=50");
      setCompanies(res.data || []); 
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = async () => {
    if (!newCompanyName) return;
    try {
      await apiClient("/companies", {
        method: "POST",
        body: JSON.stringify({ name: newCompanyName })
      });
      setNewCompanyName("");
      fetchCompanies();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="atlas-page-title text-atlas-600">Entity Management</h1>
          <p className="atlas-page-subtitle">Provision isolated corporate environments for reporting.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="New Entity Name..." 
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            className="atlas-input w-64"
          />
          <Button onClick={handleCreate}>Provision Entity</Button>
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
