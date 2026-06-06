import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { copy } from "../../lib/copy";

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const roleLabel = user?.role ? copy.roles[user.role as keyof typeof copy.roles] || user.role : "your role";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-secondary p-6">
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-xl p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-warning-bg flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-warning text-[40px]">lock</span>
        </div>
        <h1 className="text-[24px] font-bold text-text-primary mb-3">You don't have access here</h1>
        <p className="text-[14px] text-text-secondary leading-relaxed mb-4">
          This page requires permissions your account doesn't have yet.
        </p>
        <p className="text-[13px] text-text-muted mb-8">
          You're signed in as <strong className="text-text-secondary">{roleLabel}</strong>. Ask your organization
          administrator to adjust your role if you need access.
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Go back
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(user?.company_id ? `/c/${user.company_id}` : "/login")}
          >
            Organization home
          </Button>
        </div>
      </div>
    </div>
  );
}
