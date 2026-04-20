import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function WorkspaceMembers() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <Button variant="ghost" className="mb-4 px-2 -ml-2 text-text-secondary" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
          </Button>
          <h1 className="atlas-page-title text-atlas-600">Workspace Members</h1>
          <p className="atlas-page-subtitle">Manage analysts and reviewers assigned to this reporting boundary.</p>
        </div>
        <Button>
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add Member
        </Button>
      </header>

      <Card className="text-center py-16 bg-surface-secondary/50 border-dashed">
        <span className="material-symbols-outlined text-[48px] text-text-muted mb-4 block">group</span>
        <h3 className="text-[16px] font-semibold text-text-primary mb-2">Member Management Coming Soon</h3>
        <p className="text-[13px] text-text-secondary max-w-sm mx-auto leading-relaxed">
          This feature is part of upcoming administrative refinements for the Atlas platform.
        </p>
      </Card>
    </div>
  );
}
