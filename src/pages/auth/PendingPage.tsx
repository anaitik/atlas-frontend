import { Link } from "react-router-dom";

export function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #f0f4f1 0%, #e8ece9 30%, #dce5df 60%, #d0dbd4 100%)",
      }}
    >
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-black/[0.06] p-10 text-center animate-atlas-in">
        <div className="w-16 h-16 bg-warning-bg rounded-full flex items-center justify-center mb-5 border border-warning-border mx-auto">
          <span className="material-symbols-outlined text-3xl text-warning">hourglass_empty</span>
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-3">Registration Pending</h1>
        <p className="text-[13px] text-text-secondary mb-6 leading-relaxed">
          Your account is currently under review by our system administrators.
          You will receive an email once your access has been granted.
        </p>
        <Link
          to="/login"
          className="text-[13px] text-atlas-600 hover:text-atlas-500 font-semibold transition-colors"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
