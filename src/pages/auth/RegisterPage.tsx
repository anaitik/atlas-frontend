import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiClient("/auth/register", {
        method: "POST",
        body: JSON.stringify({ full_name: name, email, password }),
      });
      navigate("/pending");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f0f4f1 0%, #e8ece9 30%, #dce5df 60%, #d0dbd4 100%)",
      }}
    >
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-black/[0.06] p-10 animate-atlas-in">

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

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-text-primary">Request Access</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Apply for institutional credentials to the platform.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              className="atlas-input"
              placeholder="Dr. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              id="register-name"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              className="atlas-input"
              placeholder="analyst@institution.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="register-email"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              className="atlas-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              id="register-password"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="atlas-input"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              id="register-confirm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3 bg-atlas-900 hover:bg-atlas-800 text-white text-[14px] font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          id="register-submit"
        >
          {loading ? "Submitting..." : "Create Account"}
        </button>

        <p className="text-center text-[13px] text-text-muted mt-6">
          Already have credentials?{" "}
          <Link to="/login" className="text-atlas-600 hover:text-atlas-500 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
