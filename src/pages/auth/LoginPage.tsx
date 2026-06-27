import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { apiClient } from "../../lib/api-client";
import { defaultExperienceModeForRole, defaultPersonaForRole, useUiPreferencesStore } from "../../store/uiPreferences";

interface LoginResponse {
  user: any;
  access_token: string;
}

function FloatingOrb({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 animate-float ${className}`} style={style} />
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setActiveCompany = useWorkspaceStore((state) => state.setActiveCompany);
  const resetWorkspaceContext = useWorkspaceStore((state) => state.resetWorkspaceContext);
  const setExperienceMode = useUiPreferencesStore((state) => state.setExperienceMode);
  const setPersonaMode = useUiPreferencesStore((state) => state.setPersonaMode);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiClient<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(data.access_token, data.user);
      resetWorkspaceContext();
      setExperienceMode(defaultExperienceModeForRole(data.user.role));
      setPersonaMode(defaultPersonaForRole(data.user.role));

      // Route based on role
      if (data.user.role === "system_admin") {
        navigate("/admin");
      } else if (data.user.role === "system_audit_officer") {
        navigate("/audit");
      } else {
        if (data.user.company_id) {
          setActiveCompany(data.user.company_id);
        }
        navigate(`/c/${data.user.company_id || "setup"}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Cinematic Brand Panel ──────────────── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] login-brand-panel relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern" />

        {/* Floating orbs */}
        <FloatingOrb className="w-64 h-64 bg-atlas-500 top-[10%] left-[10%]" />
        <FloatingOrb className="w-48 h-48 bg-atlas-400 bottom-[20%] right-[15%]" style={{ animationDelay: "1s" } as React.CSSProperties} />
        <FloatingOrb className="w-32 h-32 bg-emerald-300 top-[60%] left-[50%]" style={{ animationDelay: "2s" } as React.CSSProperties} />

        {/* Decorative circles */}
        <div className="absolute top-12 right-12 w-48 h-48 rounded-full border border-atlas-400/10" />
        <div className="absolute top-16 right-16 w-40 h-40 rounded-full border border-atlas-400/5" />
        <div className="absolute bottom-32 left-8 w-24 h-24 rounded-full border border-atlas-400/8" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Brand */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-atlas-500/20 border border-atlas-400/20 flex items-center justify-center backdrop-blur-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Atlas</h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-atlas-400">
                  Sustainability reporting
                </p>
              </div>
            </div>
          </div>

          {/* Middle: Hero messaging */}
          <div className="my-auto">
            <h2 className="text-[40px] font-extrabold text-white leading-[1.1] tracking-tight mb-5">
              Know where your
              <br />
              <span className="text-gradient-green">sustainability report</span>
              <br />
              stands
            </h2>
            <p className="text-[15px] text-atlas-300/80 leading-relaxed max-w-md mb-10">
              Every metric traceable to source documents. See what to do next before your deadline—with
              tamper-evident records when anchoring is enabled.
            </p>

            <div className="grid grid-cols-3 gap-6">
              {[
                { value: "Step-by-step", label: "Guided workflow", icon: "route" },
                { value: "Traceable", label: "Evidence trail", icon: "bar_chart" },
                { value: "Audit-ready", label: "Board export", icon: "description" },
              ].map((stat) => (
                <div key={stat.label} className="glass-dark rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-atlas-400 text-[16px]">{stat.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-atlas-400/70">{stat.label}</span>
                  </div>
                  <div className="text-[22px] font-bold text-white tracking-tight">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Trust indicators */}
          <p className="text-[11px] text-atlas-400/60 max-w-sm">
            Cryptographic proof available for auditors in Expert mode.
          </p>
        </div>
      </div>

      {/* ── Right: Login Form ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center login-bg relative">
        {/* Mobile brand (shown only on small screens) */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-atlas-900 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-text-primary">Atlas</span>
        </div>

        <form
          onSubmit={handleLogin}
          className="relative z-10 w-full max-w-[420px] mx-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/[0.06] border border-white/50 p-10 animate-atlas-in"
        >
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-atlas-900 flex items-center justify-center mb-4 shadow-lg shadow-atlas-900/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Atlas</h1>
            <p className="text-[11px] font-semibold text-atlas-600 mt-1">Sign in to your organization</p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-text-primary">Welcome back</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Manage reporting periods, uploads, and audit-ready reports.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2 animate-slide-up">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Work email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  required
                  className="atlas-input !pl-10 !bg-white/90"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  id="login-email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-text-secondary">Password</label>
                <a href="#" className="text-[12px] font-medium text-atlas-600 hover:text-atlas-500 transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-[18px]">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="atlas-input !pl-10 !pr-10 !bg-white/90"
                  placeholder="************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Remember */}
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-border text-atlas-600 focus:ring-atlas-500/30" />
            <span className="text-[13px] text-text-secondary">Maintain secure session for 24h</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-atlas-900 hover:bg-atlas-800 text-white text-[14px] font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer group"
            id="login-submit"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Authenticating...
              </>
            ) : (
              <>
                Log In
                <span className="text-[16px] group-hover:translate-x-0.5 transition-transform">-&gt;</span>
              </>
            )}
          </button>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-atlas-500 animate-atlas-pulse"></span>
              <span className="text-[10px] font-semibold text-text-secondary">Secure sign-in</span>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-text-muted">
              <a href="#" className="hover:text-text-secondary transition-colors">Security Policy</a>
              <a href="#" className="hover:text-text-secondary transition-colors">Audit Protocol</a>
              <a href="#" className="hover:text-text-secondary transition-colors">Technical Support</a>
            </div>
          </div>

          <p className="text-center text-[13px] text-text-muted mt-6">
            Don't have an account?{" "}
            <a href="/register" className="text-atlas-600 hover:text-atlas-500 font-semibold transition-colors">
              Request Access
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
