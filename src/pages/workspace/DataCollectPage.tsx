import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";

// ── Types ────────────────────────────────────────────────────────

interface Question {
  id: string;
  question_number: number;
  pillar: string;
  category: string;
  question_text: string;
  help_text: string;
  answer_modes: string[];
  value_schema: { unit: string; label: string } | null;
  metric_code: string;
  metric_name: string;
}

interface InterviewResponse {
  id: string;
  question_id: string;
  answer_mode: string;
  raw_value: number | null;
  raw_unit: string | null;
  raw_text: string | null;
  interpreted_value: number | null;
  interpreted_unit: string | null;
  interpretation_confidence: number;
  interpretation_reasoning: string | null;
  status: string;
  approved_metric_id: string | null;
  autofill_source?: { type: string; label: string; confidence?: number } | null;
  override_reason?: string | null;
}

interface InterpretResult {
  value: number | null;
  unit: string | null;
  confidence: number;
  reasoning: string;
}

interface BankAccessOut {
  id: string;
  institution_name: string;
  access_token: string;
  access_url: string;
  expires_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  environmental: "bg-emerald-100 text-emerald-700 border-emerald-200",
  social: "bg-blue-100 text-blue-700 border-blue-200",
  governance: "bg-purple-100 text-purple-700 border-purple-200",
};

const PILLAR_ICONS: Record<string, string> = {
  environmental: "eco",
  social: "group",
  governance: "balance",
};

function ConfidenceBar({ pct }: { pct: number }) {
  const color =
    pct >= 0.8 ? "bg-emerald-500" : pct >= 0.5 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-[11px] text-text-muted font-medium w-8 text-right">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function DataCollectPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCompanyId } = useWorkspaceStore();
  const authUser = useAuthStore((s) => s.user);
  const companyId = activeCompanyId || authUser?.company_id || "";

  const [phase, setPhase] = useState<"intro" | "question" | "complete">("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, InterviewResponse>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-question answer state
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [rawValue, setRawValue] = useState("");
  const [rawUnit, setRawUnit] = useState("");
  const [rawText, setRawText] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<InterpretResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Bank access modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankExpiry, setBankExpiry] = useState("90");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [bankLink, setBankLink] = useState<BankAccessOut | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-fill banner
  const [prefillCount, setPrefillCount] = useState<number | null>(null);

  // Inline document upload state
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [uploadTemplateId, setUploadTemplateId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [, setUploadDone] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<{ value: number; unit?: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const autoPrefillRanRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const statusRes = await apiClient(`/interview/workspace/${workspaceId}/status`) as any;
      if (statusRes?.locked) {
        setLocked(true);
        setLoading(false);
        return;
      }
      setLocked(false);
      const [qRes, pRes] = await Promise.all([
        apiClient(`/interview/workspace/${workspaceId}/questions`) as Promise<any>,
        apiClient(`/interview/workspace/${workspaceId}/progress`) as Promise<any>,
      ]);
      const qs: Question[] = Array.isArray(qRes) ? qRes : [];
      const progress: any = pRes;
      setQuestions(qs);
      if (progress?.responses) {
        const map: Record<string, InterviewResponse> = {};
        for (const r of progress.responses) map[r.question_id] = r;
        setResponses(map);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load interview questions");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (!workspaceId) return;
    apiClient(`/templates?workspace_id=${workspaceId}`)
      .then((res: any) => { setTemplates((res?.items ?? res ?? []) as { id: string; name: string }[]); })
      .catch(() => {});
  }, [workspaceId]);

  // Auto-prefill once on first load — picks up any metrics already extracted from documents
  useEffect(() => {
    if (!workspaceId || !questions.length || autoPrefillRanRef.current) return;
    autoPrefillRanRef.current = true;
    apiClient(`/interview/workspace/${workspaceId}/prefill`, { method: "POST" })
      .then((res: any) => {
        const count = (res as any)?.prefilled_count ?? 0;
        if (count > 0) { setPrefillCount(count); void loadData(); }
      })
      .catch(() => {});
  }, [workspaceId, questions.length, loadData]);

  // Deep-link: ?q=vsme-e4 jumps directly to that question
  useEffect(() => {
    const targetId = searchParams.get("q");
    if (!targetId || questions.length === 0) return;
    const idx = questions.findIndex((q) => q.id === targetId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setPhase("question");
      setSearchParams({}, { replace: true });
    }
  }, [questions, searchParams, setSearchParams]);

  // Reset answer state when navigating to a new question
  useEffect(() => {
    if (phase !== "question") return;
    const q = questions[currentIndex];
    if (!q) return;
    const existing = responses[q.id];
    if (existing && existing.status !== "skipped") {
      setSelectedMode(existing.answer_mode);
      setRawValue(existing.raw_value !== null ? String(existing.raw_value) : "");
      setRawUnit(existing.raw_unit || (q.value_schema?.unit || ""));
      setRawText(existing.raw_text || "");
      if (existing.interpreted_value !== null) {
        setInterpretation({
          value: existing.interpreted_value,
          unit: existing.interpreted_unit,
          confidence: existing.interpretation_confidence,
          reasoning: existing.interpretation_reasoning || "",
        });
      } else {
        setInterpretation(null);
      }
    } else {
      setSelectedMode(null);
      setRawValue("");
      setRawUnit(q.value_schema?.unit || "");
      setRawText("");
      setInterpretation(null);
    }
    setUploadFile(null);
    setUploadDone(false);
  }, [currentIndex, phase, questions, responses]);

  const currentQuestion = questions[currentIndex];

  const approvedCount = Object.values(responses).filter((r) => r.status === "approved").length;

  const pillarCounts = questions.reduce<Record<string, number>>(
    (acc, q) => ({ ...acc, [q.pillar]: (acc[q.pillar] || 0) + 1 }),
    {}
  );

  const pillarApproved = (pillar: string) =>
    Object.values(responses).filter(
      (r) =>
        r.status === "approved" &&
        questions.find((q) => q.id === r.question_id)?.pillar === pillar
    ).length;

  // ── Handlers ────────────────────────────────────────────────────

  const handlePrefill = async () => {
    if (!workspaceId) return;
    try {
      const res = await apiClient(`/interview/workspace/${workspaceId}/prefill`, { method: "POST" }) as any;
      const count = (res as any)?.prefilled_count ?? 0;
      setPrefillCount(count);
      await loadData();
    } catch {
      // Non-fatal
    }
  };

  const handleInterpret = async () => {
    if (!currentQuestion || !rawText.trim()) return;
    setInterpreting(true);
    setInterpretation(null);
    try {
      // First submit the text answer
      await apiClient(`/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer_mode: "text", raw_text: rawText }),
      });
      // Then interpret
      const res = await apiClient(
        `/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/interpret`,
        { method: "POST", body: JSON.stringify({ raw_text: rawText }) }
      ) as any;
      setInterpretation((res as any) || null);
    } catch (e: any) {
      setError(e?.message || "Interpretation failed");
    } finally {
      setInterpreting(false);
    }
  };

  const handleApprove = async (overrideValue?: number, overrideUnit?: string, overrideReason?: string) => {
    if (!currentQuestion || !workspaceId) return;
    setSaving(true);
    try {
      const res = await apiClient(
        `/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            override_value: overrideValue ?? null,
            override_unit: overrideUnit ?? null,
            override_reason: overrideReason ?? null,
          }),
        }
      ) as any;
      const updated = res as any;
      if (updated) {
        setResponses((prev) => ({ ...prev, [currentQuestion.id]: updated }));
      }
      setPendingOverride(null);
      setOverrideReason("");
      handleNext();
    } catch (e: any) {
      const msg = e?.message || "Could not approve answer";
      // Backend requires a reason when changing an auto-filled/AI value → prompt for it.
      if (/reason is required/i.test(msg) && overrideValue !== undefined) {
        setPendingOverride({ value: overrideValue, unit: overrideUnit });
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveValue = async () => {
    if (!currentQuestion || !workspaceId || !rawValue) return;
    setSaving(true);
    try {
      await apiClient(
        `/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/answer`,
        {
          method: "POST",
          body: JSON.stringify({
            answer_mode: "value",
            raw_value: parseFloat(rawValue),
            raw_unit: rawUnit || currentQuestion.value_schema?.unit || "",
          }),
        }
      ) as any;
      // Auto-approve direct value entries
      await handleApprove();
    } catch (e: any) {
      setError(e?.message || "Could not save");
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!currentQuestion || !workspaceId) return;
    setSaving(true);
    try {
      const res = await apiClient(
        `/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/answer`,
        {
          method: "POST",
          body: JSON.stringify({ answer_mode: "skipped", skipped_reason: "User skipped" }),
        }
      ) as any;
      const updated = res as any;
      if (updated) setResponses((prev) => ({ ...prev, [currentQuestion.id]: updated }));
      handleNext();
    } catch {
      handleNext(); // still advance
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    setInterpretation(null);
    setSelectedMode(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase("complete");
    }
  };

  const handleGenerateBankLink = async () => {
    if (!workspaceId || !bankName.trim()) return;
    setGeneratingToken(true);
    try {
      const res = await apiClient(`/bank/workspace/${workspaceId}/access`, {
        method: "POST",
        body: JSON.stringify({
          institution_name: bankName.trim(),
          allowed_pillars: ["environmental", "social", "governance"],
          allow_document_access: false,
          expires_days: bankExpiry ? parseInt(bankExpiry) : null,
        }),
      }) as any;
      setBankLink((res as any) || null);
    } catch (e: any) {
      setError(e?.message || "Could not generate link");
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopy = () => {
    if (!bankLink?.access_url) return;
    void navigator.clipboard.writeText(bankLink.access_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInlineUpload = async () => {
    if (!workspaceId || !uploadFile || !uploadTemplateId || !companyId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("company_id", companyId);
      formData.append("workspace_id", workspaceId);
      const doc: any = await apiClient("/documents", { method: "POST", body: formData });
      await apiClient("/extraction/run", {
        method: "POST",
        body: JSON.stringify({ document_id: doc.id, template_id: uploadTemplateId }),
      });
      const prefillRes: any = await apiClient(`/interview/workspace/${workspaceId}/prefill`, { method: "POST" });
      const count = prefillRes?.prefilled_count ?? 0;
      if (count > 0) setPrefillCount(count);
      await loadData();
      setUploadDone(true);
      setSelectedMode(null);
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Render: Loading ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-[13px]">
        <span className="material-symbols-outlined animate-spin text-[20px] mr-2">progress_activity</span>
        Loading interview…
      </div>
    );
  }

  // ── Render: Locked (blueprint awaiting Atlas review) ──────────
  if (locked) {
    return (
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}`)} className="mb-4 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
        </Button>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-atlas-50 border border-atlas-200 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px] text-atlas-600">fact_check</span>
          </div>
          <h1 className="text-[18px] font-bold text-gray-900">Your questionnaire is being finalized</h1>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            We've tailored an ESG questionnaire to your company and sector. Our standards team is giving it a
            quick review to make sure every question is right for you. You'll be able to start as soon as it's approved.
          </p>
          <p className="text-[12px] text-gray-400">This usually takes a short while — no action needed from you.</p>
        </div>
      </div>
    );
  }

  // ── Render: Intro ─────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}`)} className="mb-4 px-2 -ml-2 text-text-secondary">
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
          </Button>
          <h1 className="atlas-page-title text-atlas-600">ESG Data Interview</h1>
          <p className="atlas-page-subtitle">Guided · {questions.length} questions · ~15 minutes</p>
        </header>

        {error && <InlineAlert variant="danger" onDismiss={() => setError(null)}>{error}</InlineAlert>}
        {prefillCount !== null && (
          <InlineAlert variant="success" onDismiss={() => setPrefillCount(null)}>
            {prefillCount > 0
              ? `Pre-filled ${prefillCount} answer${prefillCount !== 1 ? "s" : ""} from your existing metrics.`
              : "No existing metrics matched — start the interview to enter data."}
          </InlineAlert>
        )}

        <Card className="p-6 space-y-5">
          <p className="text-[14px] text-text-secondary leading-relaxed">
            Banks use this data to assess your sustainability performance when reviewing loan applications.
            Answer each question in the way that's easiest for you — upload a document, enter a number,
            or describe it in your own words.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {["environmental", "social", "governance"].map((pillar) => (
              <div
                key={pillar}
                className={`rounded-xl border p-3.5 ${PILLAR_COLORS[pillar].replace("text-", "border-").split(" ")[1]} bg-white`}
              >
                <span className={`material-symbols-outlined text-[20px] ${PILLAR_COLORS[pillar].split(" ")[1]} mb-1.5 block`}>
                  {PILLAR_ICONS[pillar]}
                </span>
                <p className={`text-[12px] font-bold capitalize ${PILLAR_COLORS[pillar].split(" ")[1]}`}>{pillar}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{pillarCounts[pillar] || 0} questions</p>
                {pillarApproved(pillar) > 0 && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {pillarApproved(pillar)} answered
                  </p>
                )}
              </div>
            ))}
          </div>

          {approvedCount > 0 && (
            <div className="bg-atlas-50 border border-atlas-200 rounded-lg px-4 py-3 text-[13px] text-atlas-700">
              <span className="material-symbols-outlined text-[15px] mr-1.5 align-middle">check_circle</span>
              You have already answered {approvedCount} of {questions.length} questions.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => void handlePrefill()} className="text-[12px]">
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              Pre-fill from existing data
            </Button>
            <Button
              onClick={() => { setCurrentIndex(0); setPhase("question"); }}
              className="flex-1"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              {approvedCount > 0 ? "Continue interview" : "Start interview"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Render: Complete ──────────────────────────────────────────

  if (phase === "complete") {
    const pct = Math.round((approvedCount / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <h1 className="atlas-page-title text-atlas-600">Interview Complete</h1>
          <p className="atlas-page-subtitle">
            {approvedCount}/{questions.length} questions answered · {pct}% complete
          </p>
        </header>

        {error && <InlineAlert variant="danger" onDismiss={() => setError(null)}>{error}</InlineAlert>}

        {/* Pillar progress */}
        <Card className="p-5 space-y-4">
          {["environmental", "social", "governance"].map((pillar) => {
            const total = pillarCounts[pillar] || 0;
            const done = pillarApproved(pillar);
            const pctP = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={pillar}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`flex items-center gap-1.5 text-[12px] font-semibold capitalize ${PILLAR_COLORS[pillar].split(" ")[1]}`}>
                    <span className="material-symbols-outlined text-[15px]">{PILLAR_ICONS[pillar]}</span>
                    {pillar}
                  </span>
                  <span className="text-[11px] text-text-muted">{done}/{total}</span>
                </div>
                <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pillar === "environmental" ? "bg-emerald-500" : pillar === "social" ? "bg-blue-500" : "bg-purple-500"}`}
                    style={{ width: `${pctP}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Bank sharing card */}
        <Card className="p-5 border-atlas-200 bg-atlas-50/50">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-atlas-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">account_balance</span>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-text-primary">Share with your bank</p>
              <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                Generate a secure, read-only link for your lender to verify your ESG data directly
                from Atlas — with blockchain proof of authenticity.
              </p>
              <Button className="mt-3 text-[12px]" onClick={() => setShowBankModal(true)}>
                <span className="material-symbols-outlined text-[15px]">link</span>
                Generate bank access link
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setCurrentIndex(0); setPhase("question"); }}>
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Review answers
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}`)}>
            Back to workspace
          </Button>
        </div>

        {/* Bank access modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              {!bankLink ? (
                <>
                  <div className="flex justify-between items-start">
                    <h3 className="text-[16px] font-bold text-text-primary">Generate bank access link</h3>
                    <button onClick={() => setShowBankModal(false)} className="text-text-muted hover:text-text-primary">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                  <div>
                    <label className="atlas-label">Bank or institution name</label>
                    <input
                      className="atlas-input"
                      placeholder="e.g. Deutsche Bank, HSBC"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="atlas-label">Link expires after</label>
                    <select className="atlas-input" value={bankExpiry} onChange={(e) => setBankExpiry(e.target.value)}>
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="">Never expires</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    The bank will see your approved ESG metrics and blockchain verification status.
                    They cannot edit any data.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setShowBankModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={!bankName.trim() || generatingToken}
                      onClick={() => void handleGenerateBankLink()}
                    >
                      {generatingToken ? (
                        <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[15px]">lock</span>
                      )}
                      Generate secure link
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <h3 className="text-[16px] font-bold text-text-primary">Link ready for {bankLink.institution_name}</h3>
                    <button onClick={() => { setShowBankModal(false); setBankLink(null); setBankName(""); }} className="text-text-muted hover:text-text-primary">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>

                  <div className="bg-surface-secondary rounded-lg border border-border p-3 flex items-center gap-2">
                    <span className="text-[11px] text-text-secondary flex-1 truncate font-mono">
                      {bankLink.access_url}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 text-[11px] font-semibold text-atlas-600 hover:text-atlas-700 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <p className="text-[12px] text-text-secondary">
                    Send this link to <strong>{bankLink.institution_name}</strong>. They can view your verified ESG
                    data without creating an account.
                    {bankLink.expires_at && (
                      <> Expires on {new Date(bankLink.expires_at).toLocaleDateString()}.</>
                    )}
                  </p>

                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
                    <span className="text-[12px] text-emerald-700 font-medium">
                      Verified by Atlas · Read-only · Blockchain-anchored
                    </span>
                  </div>

                  <Button className="w-full" onClick={() => { setShowBankModal(false); setBankLink(null); setBankName(""); }}>
                    Done
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Question ──────────────────────────────────────────

  if (!currentQuestion) return null;

  const existingResponse = responses[currentQuestion.id];
  const isAlreadyApproved = existingResponse?.status === "approved";
  // A value Atlas pulled from an upload / prior period, awaiting the user's confirm.
  const isSuggested =
    !isAlreadyApproved &&
    existingResponse?.status === "pending" &&
    existingResponse?.interpreted_value != null &&
    !!existingResponse?.autofill_source;
  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => { if (currentIndex === 0) setPhase("intro"); else setCurrentIndex((i) => i - 1); }} className="px-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        </Button>
        <span className="text-[12px] text-text-muted font-medium">
          {currentIndex + 1} / {questions.length}
        </span>
        <button onClick={() => setPhase("complete")} className="text-[12px] text-text-muted hover:text-text-secondary">
          Overview
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-atlas-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {error && <InlineAlert variant="danger" onDismiss={() => setError(null)}>{error}</InlineAlert>}

      {/* Question card */}
      <Card className="p-6 space-y-5">
        {/* Pillar + category badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PILLAR_COLORS[currentQuestion.pillar]}`}>
            <span className="material-symbols-outlined text-[12px]">{PILLAR_ICONS[currentQuestion.pillar]}</span>
            {currentQuestion.category}
          </span>
          {isAlreadyApproved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              Answered
            </span>
          )}
        </div>

        {/* Auto-calculation notice — shown for any question where Atlas derived the value from related data */}
        {existingResponse?.interpretation_reasoning?.startsWith("Atlas estimated") && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5 shrink-0">auto_awesome</span>
            <div>
              <p className="text-[12px] font-bold text-blue-700">Auto-calculated by Atlas</p>
              <p className="text-[12px] text-blue-600 leading-relaxed mt-0.5">
                {existingResponse.interpretation_reasoning} You can accept this value or enter your own.
              </p>
            </div>
          </div>
        )}

        {/* Question text */}
        <div>
          <h2 className="text-[18px] font-bold text-text-primary leading-snug">
            {currentQuestion.question_text}
          </h2>
          <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
            {currentQuestion.help_text}
          </p>
        </div>

        {/* Answer mode selection */}
        {!selectedMode && !isSuggested && (
          <div className="space-y-2.5">
            <p className="text-[12px] font-semibold text-text-muted">How would you like to answer?</p>
            <div className="grid gap-2.5">
              {currentQuestion.answer_modes.includes("upload") && (
                <button
                  onClick={() => setSelectedMode("upload")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-atlas-400 hover:bg-atlas-50/50 text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-secondary group-hover:bg-atlas-100 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-text-muted group-hover:text-atlas-600">upload_file</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Upload a document</p>
                    <p className="text-[11px] text-text-muted">Invoice, bill, report, or certificate</p>
                  </div>
                </button>
              )}

              {currentQuestion.value_schema?.unit === "boolean" ? (
                <button
                  onClick={() => setSelectedMode("value")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-atlas-400 hover:bg-atlas-50/50 text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-secondary group-hover:bg-atlas-100 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-text-muted group-hover:text-atlas-600">thumbs_up_down</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Yes or No</p>
                    <p className="text-[11px] text-text-muted">Select your answer</p>
                  </div>
                </button>
              ) : currentQuestion.answer_modes.includes("value") && (
                <button
                  onClick={() => setSelectedMode("value")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-atlas-400 hover:bg-atlas-50/50 text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-secondary group-hover:bg-atlas-100 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-text-muted group-hover:text-atlas-600">123</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">I know the number</p>
                    <p className="text-[11px] text-text-muted">
                      {currentQuestion.value_schema ? `Enter a value in ${currentQuestion.value_schema.unit}` : "Enter a numeric value"}
                    </p>
                  </div>
                </button>
              )}

              {currentQuestion.answer_modes.includes("text") && (
                <button
                  onClick={() => setSelectedMode("text")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-atlas-400 hover:bg-atlas-50/50 text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-secondary group-hover:bg-atlas-100 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-text-muted group-hover:text-atlas-600">chat</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Describe in your own words</p>
                    <p className="text-[11px] text-text-muted">AI will extract the value for you</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload mode */}
        {selectedMode === "upload" && (
          <div className="space-y-3">
            <button
              onClick={() => { setSelectedMode(null); setUploadFile(null); setUploadDone(false); }}
              className="text-[11px] text-text-muted hover:text-text-secondary flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">arrow_back</span> Change answer method
            </button>

            {templates.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="atlas-label mb-1">Document type</label>
                  <select
                    className="atlas-input w-full"
                    value={uploadTemplateId}
                    onChange={(e) => setUploadTemplateId(e.target.value)}
                  >
                    <option value="">Select document type…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${uploadFile ? "border-atlas-400 bg-atlas-50/50" : "border-border bg-surface-secondary hover:border-atlas-300"}`}
                  onClick={() => {
                    const inp = document.createElement("input");
                    inp.type = "file";
                    inp.accept = ".pdf,.png,.jpg,.jpeg,.xlsx,.csv";
                    inp.onchange = (e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) setUploadFile(f);
                    };
                    inp.click();
                  }}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-atlas-600 text-[20px]">description</span>
                      <span className="text-[13px] font-semibold text-text-primary truncate max-w-[200px]">{uploadFile.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                        className="text-text-muted hover:text-text-secondary ml-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 block">upload_file</span>
                      <p className="text-[13px] font-semibold text-text-primary">Click to select a file</p>
                      <p className="text-[11px] text-text-muted mt-0.5">PDF, image, or spreadsheet</p>
                    </>
                  )}
                </div>
                <Button
                  className="w-full"
                  disabled={!uploadFile || !uploadTemplateId || uploading}
                  onClick={() => void handleInlineUpload()}
                >
                  {uploading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      Extracting value…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      Upload &amp; extract value
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-surface-secondary border border-border rounded-xl p-5 text-center space-y-3">
                <span className="material-symbols-outlined text-[32px] text-text-muted block">upload_file</span>
                <p className="text-[13px] font-semibold text-text-primary">Upload your supporting document</p>
                <p className="text-[12px] text-text-muted leading-relaxed">
                  Upload your document in the Documents section, then return here — Atlas will auto-fill this answer from the extracted values.
                </p>
                <Button variant="outline" onClick={() => navigate(`/w/${workspaceId}/documents`)} className="text-[12px]">
                  Open Documents
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Value mode */}
        {selectedMode === "value" && (
          <div className="space-y-3">
            <button onClick={() => setSelectedMode(null)} className="text-[11px] text-text-muted hover:text-text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">arrow_back</span> Change answer method
            </button>
            {currentQuestion.value_schema?.unit === "boolean" ? (
              <div className="space-y-3">
                <p className="text-[12px] text-text-muted">{currentQuestion.value_schema?.label ?? "Select your answer"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={saving}
                    onClick={async () => {
                      setRawValue("1");
                      setSaving(true);
                      try {
                        await apiClient(
                          `/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/answer`,
                          { method: "POST", body: JSON.stringify({ answer_mode: "value", raw_value: 1, raw_unit: "boolean" }) }
                        );
                        await handleApprove();
                      } catch (e: any) {
                        setError(e?.message || "Could not save");
                        setSaving(false);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all font-semibold text-[15px]
                      ${rawValue === "1"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-border bg-surface-secondary hover:border-emerald-400 hover:bg-emerald-50/50 text-text-primary"
                      } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="material-symbols-outlined text-[28px]">thumb_up</span>
                    Yes
                  </button>
                  <button
                    disabled={saving}
                    onClick={async () => {
                      setRawValue("0");
                      setSaving(true);
                      try {
                        await apiClient(
                          `/interview/workspace/${workspaceId}/questions/${currentQuestion.id}/answer`,
                          { method: "POST", body: JSON.stringify({ answer_mode: "value", raw_value: 0, raw_unit: "boolean" }) }
                        );
                        await handleApprove();
                      } catch (e: any) {
                        setError(e?.message || "Could not save");
                        setSaving(false);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all font-semibold text-[15px]
                      ${rawValue === "0"
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-border bg-surface-secondary hover:border-red-300 hover:bg-red-50/50 text-text-primary"
                      } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="material-symbols-outlined text-[28px]">thumb_down</span>
                    No
                  </button>
                </div>
                {saving && (
                  <div className="flex items-center justify-center gap-2 text-[12px] text-text-muted">
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    Saving…
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-surface-secondary rounded-xl border border-border p-4 space-y-3">
                  {currentQuestion.value_schema?.label && (
                    <label className="atlas-label">{currentQuestion.value_schema.label}</label>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="atlas-input flex-1"
                      placeholder="Enter value…"
                      value={rawValue}
                      onChange={(e) => setRawValue(e.target.value)}
                      autoFocus
                    />
                    {currentQuestion.value_schema?.unit && (
                      <span className="text-[13px] font-semibold text-text-muted shrink-0 min-w-[3rem]">
                        {currentQuestion.value_schema.unit}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={!rawValue || saving}
                  onClick={() => void handleSaveValue()}
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                  Save and continue
                </Button>
              </>
            )}
          </div>
        )}

        {/* Text mode */}
        {selectedMode === "text" && (
          <div className="space-y-3">
            <button onClick={() => setSelectedMode(null)} className="text-[11px] text-text-muted hover:text-text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">arrow_back</span> Change answer method
            </button>
            <div className="bg-surface-secondary rounded-xl border border-border p-4 space-y-3">
              <label className="atlas-label">Your answer</label>
              <textarea
                className="atlas-input resize-none"
                rows={4}
                placeholder={`Tell us about ${currentQuestion.metric_name.toLowerCase()}…`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                autoFocus
              />
              {!interpretation && (
                <Button
                  className="w-full"
                  disabled={!rawText.trim() || interpreting}
                  onClick={() => void handleInterpret()}
                >
                  {interpreting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      Interpreting…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      Interpret with AI
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* AI interpretation result */}
            {interpretation && (
              <div className="rounded-xl border border-atlas-200 bg-atlas-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-atlas-600 text-[16px]">auto_awesome</span>
                    <p className="text-[12px] font-bold text-atlas-700">AI interpretation</p>
                  </div>
                  <ConfidenceBar pct={interpretation.confidence} />
                </div>

                {interpretation.value !== null ? (
                  <div className="bg-white rounded-lg border border-atlas-200 px-4 py-3">
                    <p className="text-[11px] text-text-muted font-medium mb-0.5">{currentQuestion.metric_name}</p>
                    <p className="text-[20px] font-bold text-text-primary">
                      {interpretation.value.toLocaleString()}
                      <span className="text-[14px] font-medium text-text-muted ml-1.5">{interpretation.unit}</span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[12px] text-amber-700">
                    <span className="material-symbols-outlined text-[14px] mr-1 align-middle">warning</span>
                    No numeric value found. Please re-read the question or enter the value directly.
                  </div>
                )}

                <p className="text-[11px] text-text-muted italic">"{interpretation.reasoning}"</p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-[12px]"
                    onClick={() => { setInterpretation(null); setSelectedMode("value"); setRawValue(String(interpretation.value || "")); }}
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit value
                  </Button>
                  <Button
                    className="flex-1 text-[12px]"
                    disabled={interpretation.value === null || saving}
                    onClick={() => void handleApprove(interpretation.value!, interpretation.unit || undefined)}
                  >
                    {saving ? (
                      <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    )}
                    Approve &amp; continue
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggested from evidence (uploaded docs / prior period) — confirm to accept */}
        {isSuggested && existingResponse && !selectedMode && (
          <div className="rounded-xl border border-atlas-200 bg-atlas-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-atlas-600 text-[20px]">auto_awesome</span>
              <span className="text-[12px] font-bold text-atlas-700">Found in your evidence</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[26px] font-black text-gray-900 leading-none">
                {existingResponse.interpreted_value?.toLocaleString() ?? "—"}
              </span>
              <span className="text-[12px] font-medium text-gray-400 mb-0.5">{existingResponse.interpreted_unit}</span>
            </div>
            {existingResponse.autofill_source?.label && (
              <p className="text-[11px] text-atlas-700/80">{existingResponse.autofill_source.label}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={() => void handleApprove()} disabled={saving} className="text-[12px]">
                <span className="material-symbols-outlined text-[15px]">check</span>
                Confirm this value
              </Button>
              <button
                onClick={() => { setSelectedMode("value"); setRawValue(String(existingResponse.interpreted_value ?? "")); }}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-800 px-2"
              >
                Edit instead
              </button>
            </div>
          </div>
        )}

        {/* Already approved display */}
        {isAlreadyApproved && existingResponse && !selectedMode && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
              <div>
                <p className="text-[12px] font-semibold text-emerald-700">{currentQuestion.metric_name}</p>
                <p className="text-[13px] font-bold text-text-primary">
                  {existingResponse.interpreted_value?.toLocaleString() ?? "—"}
                  <span className="text-[11px] font-medium text-text-muted ml-1">{existingResponse.interpreted_unit}</span>
                </p>
              </div>
              <button onClick={() => { setSelectedMode("value"); setRawValue(String(existingResponse.interpreted_value || "")); }} className="ml-auto text-[11px] text-atlas-600 hover:text-atlas-700 font-medium">
                Edit
              </button>
            </div>
            {existingResponse.autofill_source && (
              <div className="mt-2.5 pt-2.5 border-t border-emerald-100 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-500 text-[14px]">auto_awesome</span>
                <span className="text-[11px] text-emerald-700">
                  Auto-filled · {existingResponse.autofill_source.label}
                </span>
              </div>
            )}
            {existingResponse.override_reason && (
              <p className="mt-1.5 text-[11px] text-gray-500 italic">Edited: {existingResponse.override_reason}</p>
            )}
          </div>
        )}
      </Card>

      {/* Reason-required modal when changing an auto-filled / AI value */}
      {pendingOverride && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-[15px] font-bold text-gray-900">Why are you changing this value?</h3>
            <p className="text-[12px] text-gray-500">
              This answer was auto-filled from your evidence. A short reason keeps the change auditable for the bank.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
              placeholder="e.g. Updated figure from the final annual invoice"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-atlas-400 focus:ring-1 focus:ring-atlas-300 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setPendingOverride(null); setOverrideReason(""); }} className="px-4 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800">Cancel</button>
              <Button
                onClick={() => void handleApprove(pendingOverride.value, pendingOverride.unit, overrideReason)}
                disabled={overrideReason.trim().length < 3 || saving}
              >
                Save change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => void handleSkip()}
          disabled={saving}
          className="text-[12px] text-text-muted hover:text-text-secondary transition-colors"
        >
          Skip this question →
        </button>
        {isAlreadyApproved && !selectedMode && (
          <Button onClick={handleNext} className="text-[12px]">
            Continue
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Button>
        )}
      </div>
    </div>
  );
}
