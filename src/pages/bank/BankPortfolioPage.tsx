import { useState, useEffect } from "react";

// Public page — no auth required. Banks paste MSME access links here.
// Tokens are stored in localStorage so the portfolio persists across sessions.

const LS_KEY = "atlas_portfolio_tokens";
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8000/api/v1"
  : `${window.location.origin}/api/v1`;

interface PortalEntry {
  company_name: string;
  workspace_name: string;
  reporting_year: number | null;
  nace_sector: string | null;
  employee_count_range: string | null;
  turnover_range_eur: string | null;
  interview_completion_pct: number;
  total_approved: number;
  total_questions: number;
  pillar_scores: Record<string, number>;
  overall_esg_score: number;
  data_quality_score: number;
  institution_name: string;
  blockchain_verified: boolean;
  generated_at: string;
  atlas_score?: {
    performance_score: number | null;
    grade: string;
    provisional: boolean;
    flags: { severity: "critical" | "warn" | "info"; code: string; message: string }[];
  } | null;
  _token: string; // local-only, not from API
}

// ── Helpers ────────────────────────────────────────────────────────

function extractToken(input: string): string | null {
  input = input.trim();
  // Full URL like https://app.com/verify/TOKEN
  const m = input.match(/\/verify\/([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  // Raw token
  if (/^[A-Za-z0-9_-]{20,}$/.test(input)) return input;
  return null;
}

function scoreGrade(s: number) {
  if (s >= 80) return { letter: "A", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (s >= 60) return { letter: "B", cls: "text-blue-700 bg-blue-50 border-blue-200" };
  if (s >= 40) return { letter: "C", cls: "text-amber-700 bg-amber-50 border-amber-200" };
  if (s >= 20) return { letter: "D", cls: "text-orange-600 bg-orange-50 border-orange-100" };
  return { letter: "E", cls: "text-red-600 bg-red-50 border-red-100" };
}

function PillarRing({ score, color, size = 44 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="system-ui,sans-serif">
        {score}
      </text>
    </svg>
  );
}

function exportCSV(entries: PortalEntry[]) {
  const headers = ["Company", "Workspace", "Sector", "Employees", "ESG Performance", "Grade", "Environmental", "Social", "Governance", "Completeness %", "Data Trust", "Critical Flags", "Review Flags", "Blockchain"];
  const rows = entries.map(e => {
    const fl = e.atlas_score?.flags ?? [];
    return [
      e.company_name, e.workspace_name, e.nace_sector || "", e.employee_count_range || "",
      e.overall_esg_score, scoreGrade(e.overall_esg_score).letter,
      e.pillar_scores?.environmental ?? 0,
      e.pillar_scores?.social ?? 0,
      e.pillar_scores?.governance ?? 0,
      e.interview_completion_pct, e.data_quality_score,
      fl.filter(f => f.severity === "critical").length,
      fl.filter(f => f.severity === "warn").length,
      e.blockchain_verified ? "Yes" : "No",
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `atlas_esg_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Main ───────────────────────────────────────────────────────────

export function BankPortfolioPage() {
  const [tokens, setTokens] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  const [entries, setEntries] = useState<PortalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "name" | "completion">("score");

  // Persist tokens
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(tokens));
  }, [tokens]);

  // Fetch all portals when tokens change
  useEffect(() => {
    if (tokens.length === 0) { setEntries([]); return; }
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/bank/public/portfolio/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokens }),
        });
        const json = await res.json();
        const raw: (PortalEntry & { _access_token?: string })[] = (json?.data || json || []);
        // Backend tags each result with its source token — use that, fall back to local
        const tokenSet = new Set(tokens);
        const enriched = raw.map((e) => ({
          ...e,
          _token: (e._access_token && tokenSet.has(e._access_token)) ? e._access_token : "",
        }));
        setEntries(enriched);
      } catch {} finally { setLoading(false); }
    };
    void load();
  }, [tokens]);

  const handleAdd = () => {
    setAddError("");
    const token = extractToken(addInput);
    if (!token) { setAddError("Paste a valid Atlas access link or token."); return; }
    if (tokens.includes(token)) { setAddError("This borrower is already in your portfolio."); return; }
    setTokens(prev => [...prev, token]);
    setAddInput("");
    setShowAdd(false);
  };

  const handleRemove = (token: string) => {
    setTokens(prev => prev.filter(t => t !== token));
    setEntries(prev => prev.filter(e => e._token !== token));
  };

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === "score") return b.overall_esg_score - a.overall_esg_score;
    if (sortBy === "completion") return b.interview_completion_pct - a.interview_completion_pct;
    return a.company_name.localeCompare(b.company_name);
  });

  const avgScore = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.overall_esg_score, 0) / entries.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-atlas-50/20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-atlas-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900">Atlas ESG</p>
              <p className="text-[10px] text-gray-400">Bank Portfolio Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={() => exportCSV(entries)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Export CSV
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-atlas-600 hover:bg-atlas-700 rounded-full px-4 py-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add borrower
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Summary stats */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Borrowers", value: entries.length, icon: "domain" },
              { label: "Avg ESG Score", value: avgScore, icon: "analytics" },
              { label: "Grade A/B", value: entries.filter(e => e.overall_esg_score >= 60).length, icon: "verified" },
              { label: "Blockchain verified", value: entries.filter(e => e.blockchain_verified).length, icon: "link" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-atlas-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-atlas-600 text-[18px]">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-[20px] font-black text-gray-900 leading-none">{stat.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        {entries.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium">Sort by:</span>
            {(["score", "name", "completion"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  sortBy === opt
                    ? "bg-atlas-600 text-white border-atlas-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-atlas-300"
                }`}
              >
                {opt === "score" ? "ESG Score" : opt === "name" ? "Company" : "Completion"}
              </button>
            ))}
          </div>
        )}

        {/* Portfolio grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-atlas-100 flex items-center justify-center mx-auto animate-pulse">
                <span className="material-symbols-outlined text-atlas-600 text-[20px]">analytics</span>
              </div>
              <p className="text-[13px] text-gray-400">Loading portfolio…</p>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-gray-200 mb-4 block">account_balance</span>
            <h2 className="text-[18px] font-bold text-gray-900 mb-2">No borrowers yet</h2>
            <p className="text-[13px] text-gray-400 max-w-sm mx-auto mb-6">
              Add your MSME clients by pasting the Atlas ESG verification links they sent you.
              Each link looks like: <code className="bg-gray-100 px-1 rounded text-[11px]">atlas-esg.com/verify/…</code>
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-atlas-600 text-white text-[13px] font-bold px-6 py-3 rounded-xl hover:bg-atlas-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add your first borrower
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((entry, idx) => {
              const grade = scoreGrade(entry.overall_esg_score);
              const flags = entry.atlas_score?.flags ?? [];
              const critical = flags.filter((f) => f.severity === "critical").length;
              const warn = flags.filter((f) => f.severity === "warn").length;
              return (
                <div key={entry._token || idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">
                  {/* Company header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-gray-900 truncate">{entry.company_name}</h3>
                      <p className="text-[11px] text-gray-400 truncate">{entry.workspace_name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {entry.reporting_year && (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">FY {entry.reporting_year}</span>
                        )}
                        {entry.nace_sector && (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{entry.nace_sector}</span>
                        )}
                        {entry.employee_count_range && (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{entry.employee_count_range} emp.</span>
                        )}
                        {critical > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            <span className="material-symbols-outlined text-[11px]">error</span>{critical} critical
                          </span>
                        )}
                        {critical === 0 && warn > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <span className="material-symbols-outlined text-[11px]">warning</span>{warn} review
                          </span>
                        )}
                        {entry.atlas_score?.provisional && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">provisional</span>
                        )}
                      </div>
                    </div>
                    {/* Overall score */}
                    <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${grade.cls} shrink-0 ml-3`}>
                      <span className="text-[26px] font-black leading-none">{entry.overall_esg_score}</span>
                      <span className="text-[10px] font-bold opacity-70">Grade {grade.letter}</span>
                    </div>
                  </div>

                  {/* Pillar rings */}
                  <div className="flex items-center justify-around py-1 border-y border-gray-50">
                    {[
                      { key: "environmental", color: "#10b981", label: "E" },
                      { key: "social",        color: "#3b82f6", label: "S" },
                      { key: "governance",    color: "#8b5cf6", label: "G" },
                    ].map(({ key, color, label }) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <PillarRing score={entry.pillar_scores?.[key] ?? 0} color={color} size={44} />
                        <span className="text-[9px] font-bold text-gray-400">{label}</span>
                      </div>
                    ))}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-[44px] h-[44px] flex flex-col items-center justify-center">
                        <span className="text-[18px] font-black text-gray-700 leading-none">{entry.interview_completion_pct}%</span>
                      </div>
                      <span className="text-[9px] font-bold text-gray-400">Complete</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {entry.blockchain_verified ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <span className="material-symbols-outlined text-[11px]">link</span>On-chain
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-medium">Pending chain</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/verify/${entry._token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-atlas-600 hover:text-atlas-700"
                      >
                        View report →
                      </a>
                      <button
                        onClick={() => handleRemove(entry._token)}
                        className="text-[11px] text-gray-300 hover:text-red-400 transition-colors"
                        title="Remove from portfolio"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add borrower modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-bold text-gray-900 mb-1">Add a borrower</h2>
            <p className="text-[12px] text-gray-400 mb-4">
              Paste the Atlas ESG verification link your client sent you, or paste the raw access token.
            </p>
            <input
              autoFocus
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:border-atlas-400 mb-2"
              placeholder="https://atlas-esg.com/verify/… or paste token"
              value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            {addError && <p className="text-[11px] text-red-500 mb-2">{addError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setShowAdd(false); setAddInput(""); setAddError(""); }}
                className="flex-1 py-2.5 text-[13px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleAdd}
                className="flex-1 py-2.5 text-[13px] font-bold text-white bg-atlas-600 hover:bg-atlas-700 rounded-lg">
                Add to portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
