import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { apiClient } from "../../lib/api-client";

interface LoginResponse {
  user: any;
  access_token: string;
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

      // Route based on role
      if (data.user.role === "system_admin") {
        navigate("/admin");
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f0f4f1 0%, #e8ece9 30%, #dce5df 60%, #d0dbd4 100%)",
      }}
    >
      {/* Subtle decorative text removed per request */}

      {/* Login Card */}
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-black/[0.06] p-10 animate-atlas-in"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-atlas-900 flex items-center justify-center mb-4 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Atlas</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-atlas-600 mt-1">
            ESG Reporting Hub
          </p>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-text-primary">Institutional Access</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Authenticate to manage global governance protocols.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Institutional Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-[18px]">
                mail
              </span>
              <input
                type="email"
                required
                className="atlas-input !pl-10"
                placeholder="admin@sustainability.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="login-email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
                Access Key
              </label>
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
                className="atlas-input !pl-10 !pr-10"
                placeholder="••••••••••••"
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
          className="w-full mt-6 py-3 bg-atlas-900 hover:bg-atlas-800 text-white text-[14px] font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          id="login-submit"
        >
          {loading ? "Authenticating..." : (
            <>Log In <span className="text-[16px]">→</span></>
          )}
        </button>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-atlas-500"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-secondary">
              Verified ESG Endpoint
            </span>
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
  );
}
