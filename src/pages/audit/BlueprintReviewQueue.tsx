import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/auth";

const ADMIN_ROLES = ["system_admin"];

type BlueprintSummary = {
  id: string;
  company_name: string;
  sector: string | null;
  status: string;
  generated_by: string;
  question_count: number;
  ai_added_count: number;
  created_at: string;
};

// Isolated chrome — audit officer sees only questions; admin gets a back-to-admin link.
export function OfficerShell({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-atlas-50/30">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-atlas-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">fact_check</span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900">Atlas — Blueprint Review</p>
              <p className="text-[10px] text-gray-400">ESG questionnaire QA · {user?.full_name || "Reviewer"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="text-[12px] font-semibold text-atlas-600 hover:text-atlas-800 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                Admin panel
              </button>
            )}
            <button onClick={logout} className="text-[12px] font-semibold text-gray-500 hover:text-gray-800">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export function BlueprintReviewQueue() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<BlueprintSummary[]>("/audit/blueprints")
      .then((d) => setItems(d || []))
      .catch((e) => setError(e?.message || "Could not load the review queue."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <OfficerShell>
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Review queue</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Approve, edit, or remove generated interview questions before companies begin.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-[32px] text-atlas-400 animate-spin">progress_activity</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <span className="material-symbols-outlined text-[40px] text-emerald-400 mb-2 block">check_circle</span>
          <p className="text-[15px] font-semibold text-gray-600">Queue is clear</p>
          <p className="text-[12px] text-gray-400 mt-1">No questionnaires are awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <button
              key={b.id}
              onClick={() => navigate(`/audit/blueprints/${b.id}`)}
              className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[15px] font-bold text-gray-900">{b.company_name}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {b.sector && (
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Sector {b.sector}</span>
                  )}
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{b.question_count} questions</span>
                  {b.ai_added_count > 0 && (
                    <span className="text-[10px] font-semibold text-atlas-700 bg-atlas-50 border border-atlas-200 rounded-full px-2 py-0.5">
                      {b.ai_added_count} AI-added
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">
                    {b.generated_by === "ai" ? "AI-tailored" : "standard seed"}
                  </span>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 shrink-0">
                Awaiting review
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </OfficerShell>
  );
}
