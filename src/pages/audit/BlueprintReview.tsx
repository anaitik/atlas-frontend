import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { OfficerShell } from "./BlueprintReviewQueue";

type Question = {
  local_id: string;
  metric_code: string | null;
  metric_name: string;
  pillar: string;
  category: string;
  question_text: string;
  help_text: string;
  requirement: string;
  grounding_citation: string | null;
  bank_relevance: string;
  source: string;
  status: string;
};
type Blueprint = {
  id: string;
  company_name: string;
  sector: string | null;
  status: string;
  generated_by: string;
  question_count: number;
  questions: Question[];
};

const PILLAR_COLOR: Record<string, string> = {
  environmental: "bg-emerald-50 border-emerald-200 text-emerald-700",
  social: "bg-blue-50 border-blue-200 text-blue-700",
  governance: "bg-purple-50 border-purple-200 text-purple-700",
};

function ReasonModal({ title, onCancel, onConfirm }: {
  title: string; onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
        <p className="text-[12px] text-gray-500">A reason is required and recorded in the audit trail.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why are you making this change?"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-atlas-400 focus:ring-1 focus:ring-atlas-300 outline-none"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={reason.trim().length < 3}
            className="px-4 py-2 text-[13px] font-bold text-white bg-atlas-600 rounded-lg disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function BlueprintReview() {
  const { blueprintId } = useParams();
  const navigate = useNavigate();
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [editText, setEditText] = useState("");
  const [reasonFor, setReasonFor] = useState<{ kind: "edit" | "delete"; q: Question } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    apiClient<Blueprint>(`/audit/blueprints/${blueprintId}`)
      .then(setBp)
      .catch((e) => setError(e?.message || "Could not load blueprint."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [blueprintId]);

  const applyEdit = async (reason: string) => {
    if (!editing) return;
    setBusy(true);
    try {
      const updated = await apiClient<Blueprint>(`/audit/blueprints/${blueprintId}/questions/${editing.local_id}`, {
        method: "PATCH",
        body: JSON.stringify({ reason, patch: { question_text: editText } }),
      });
      setBp(updated);
      setEditing(null);
      setReasonFor(null);
    } catch (e: any) { setError(e?.message || "Edit failed."); }
    finally { setBusy(false); }
  };

  const applyDelete = async (reason: string) => {
    if (!reasonFor) return;
    setBusy(true);
    try {
      const updated = await apiClient<Blueprint>(`/audit/blueprints/${blueprintId}/questions/${reasonFor.q.local_id}/delete`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setBp(updated);
      setReasonFor(null);
    } catch (e: any) { setError(e?.message || "Delete failed."); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await apiClient(`/audit/blueprints/${blueprintId}/approve`, { method: "POST" });
      navigate("/audit");
    } catch (e: any) { setError(e?.message || "Approve failed."); setBusy(false); }
  };

  if (loading) {
    return <OfficerShell><div className="flex justify-center py-16"><span className="material-symbols-outlined text-[32px] text-atlas-400 animate-spin">progress_activity</span></div></OfficerShell>;
  }
  if (!bp) {
    return <OfficerShell><p className="text-[13px] text-red-600">{error || "Not found."}</p></OfficerShell>;
  }

  const active = bp.questions.filter((q) => q.status !== "rejected");

  return (
    <OfficerShell>
      <button onClick={() => navigate("/audit")} className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to queue
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">{bp.company_name}</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {active.length} questions · {bp.generated_by === "ai" ? "AI-tailored" : "standard seed"}
            {bp.sector && ` · sector ${bp.sector}`}
          </p>
        </div>
        <button
          onClick={approve}
          disabled={busy}
          className="shrink-0 flex items-center gap-1.5 text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-2.5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[17px]">check_circle</span>
          Approve &amp; release to company
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 mb-4">{error}</div>}

      <div className="space-y-3">
        {active.map((q, idx) => (
          <div key={q.local_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <span className="text-[11px] font-bold text-gray-400 mt-1 w-5 shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${PILLAR_COLOR[q.pillar] || "bg-gray-50 border-gray-200 text-gray-600"}`}>
                    {q.pillar}
                  </span>
                  {q.source === "ai_added" ? (
                    <span className="text-[10px] font-bold text-atlas-700 bg-atlas-50 border border-atlas-200 rounded-full px-2 py-0.5">AI-added</span>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">standard</span>
                  )}
                  {!q.metric_code && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">not scored</span>
                  )}
                  {q.grounding_citation && (
                    <span className="text-[10px] font-medium text-gray-400">grounded: {q.grounding_citation}</span>
                  )}
                </div>

                {editing?.local_id === q.local_id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-atlas-300 px-3 py-2 text-[13px] focus:ring-1 focus:ring-atlas-300 outline-none"
                  />
                ) : (
                  <p className="text-[13px] font-semibold text-gray-900 leading-snug">{q.question_text}</p>
                )}
                {q.bank_relevance && <p className="text-[11px] text-gray-400 mt-1">{q.bank_relevance}</p>}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {editing?.local_id === q.local_id ? (
                  <>
                    <button onClick={() => setReasonFor({ kind: "edit", q })} disabled={editText.trim().length < 3}
                      className="text-[12px] font-bold text-atlas-600 px-2 py-1 disabled:opacity-40">Save</button>
                    <button onClick={() => setEditing(null)} className="text-[12px] text-gray-400 px-2 py-1">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditing(q); setEditText(q.question_text); }}
                      title="Edit" className="text-gray-400 hover:text-atlas-600 p-1.5">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setReasonFor({ kind: "delete", q })}
                      title="Remove" className="text-gray-400 hover:text-red-500 p-1.5">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reasonFor && (
        <ReasonModal
          title={reasonFor.kind === "delete" ? "Remove this question?" : "Save question edit"}
          onCancel={() => setReasonFor(null)}
          onConfirm={(reason) => (reasonFor.kind === "delete" ? applyDelete(reason) : applyEdit(reason))}
        />
      )}
    </OfficerShell>
  );
}
