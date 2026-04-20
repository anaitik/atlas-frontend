import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-secondary p-6">
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-xl p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-danger text-[40px]">lock_person</span>
        </div>
        <h1 className="text-[24px] font-bold text-text-primary mb-3">Access Restricted</h1>
        <p className="text-[14px] text-text-secondary leading-relaxed mb-8">
          Your current role does not have the authorization required to access this secure boundary. 
          Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={() => navigate(-1)}>
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Go Back
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
                Return to Dashboard
            </Button>
        </div>
      </div>
    </div>
  );
}
