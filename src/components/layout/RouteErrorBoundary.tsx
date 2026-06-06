import { useRouteError, useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../store/auth";

export function RouteErrorBoundary() {
  const error: any = useRouteError();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-page-bg p-6">
      <Card className="max-w-md w-full text-center border-danger-border shadow-lg">
        <div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-5 border border-danger-border shadow-sm">
          <span className="material-symbols-outlined text-[32px] text-danger">error</span>
        </div>
        <h1 className="text-[20px] font-bold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-[13px] text-text-secondary leading-relaxed mb-6">
          We couldn't load this page. Try going home or refreshing—if the problem continues, contact support.
        </p>

        {isDev && error?.message && (
          <div className="bg-surface-secondary border border-border rounded-lg p-3 text-left mb-6 overflow-auto max-h-32 shadow-inner">
            <p className="text-[11px] font-mono text-danger font-medium break-all">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center pt-2 flex-wrap">
          <Button variant="ghost" onClick={() => window.location.reload()}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Reload
          </Button>
          <Button
            onClick={() => {
              if (user?.role === "system_admin") navigate("/admin");
              else if (user?.company_id) navigate(`/c/${user.company_id}`);
              else navigate("/login");
            }}
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Go home
          </Button>
        </div>
      </Card>
    </div>
  );
}
