import { useRouteError, useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function RouteErrorBoundary() {
  const error: any = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-page-bg p-6">
      <Card className="max-w-md w-full text-center border-danger-border shadow-lg">
        <div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-5 border border-danger-border shadow-sm">
          <span className="material-symbols-outlined text-[32px] text-danger">gpp_maybe</span>
        </div>
        <h1 className="text-[20px] font-bold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-[13px] text-text-secondary leading-relaxed mb-6">
          Atlas has encountered an unexpected application error. You can return to the last safe state or reload the interface.
        </p>

        {error?.message && (
          <div className="bg-surface-secondary border border-border rounded-lg p-3 text-left mb-6 overflow-auto max-h-32 shadow-inner">
            <p className="text-[11px] font-mono text-danger font-medium break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center pt-2">
          <Button variant="ghost" onClick={() => window.location.reload()}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Reload Page
          </Button>
          <Button onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
