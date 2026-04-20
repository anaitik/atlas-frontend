import { ReactNode } from "react";

/**
 * Auth layout — split screen with branding left, form right.
 * Used for Login, Register, Pending pages.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-surface">
      {/* ── Left: Branding Panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] gradient-primary relative overflow-hidden items-end p-12">
        {/* Decorative asymmetric elements */}
        <div className="absolute top-12 left-12 opacity-10">
          <h3 className="font-headline text-8xl font-black text-on-primary leading-none tracking-tighter">
            ESG
          </h3>
        </div>
        <div className="absolute top-1/4 right-8 opacity-5">
          <div className="w-64 h-64 rounded-full border border-on-primary"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 opacity-5">
          <div className="w-48 h-48 rounded-full border border-on-primary"></div>
        </div>

        <div className="relative z-10 text-on-primary animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-on-primary/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7 text-primary-fixed" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight">SustainabilityAI</h1>
              <p className="text-primary-fixed-dim text-xs font-semibold tracking-widest uppercase">Sovereign Analyst</p>
            </div>
          </div>

          <h2 className="font-headline text-4xl font-bold tracking-tight leading-tight mb-4">
            Transform ESG Data
            <br />
            Into Decisive Intelligence
          </h2>
          <p className="text-primary-fixed-dim/80 text-sm leading-relaxed max-w-md">
            AI-powered extraction, metric computation, and reporting
            for institutional sustainability governance.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark ghost-border">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-pulse-soft"></span>
              <span className="text-[10px] font-headline font-bold text-primary-fixed tracking-widest uppercase">
                Verified Platform
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form Area ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
