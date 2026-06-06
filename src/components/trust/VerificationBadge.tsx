import { useState } from "react";
import { copy } from "../../lib/copy";
import type { DocumentVerification } from "../ui/BlockchainBadge";
import { Dialog } from "../ui/Dialog";
import { CryptographicProofPanel } from "./CryptographicProofPanel";

export function VerificationBadge({
  verification,
  onRefresh,
  showExpertProof = true,
}: {
  verification: DocumentVerification | null;
  onRefresh?: () => void;
  showExpertProof?: boolean;
}) {
  const [proofOpen, setProofOpen] = useState(false);

  if (!verification || !verification.blockchain_enabled) return null;

  const isVerified = verification.verified_on_chain;
  const label = isVerified ? copy.trust.verified : copy.trust.securing;

  return (
    <>
      <button
        type="button"
        onClick={() => (showExpertProof ? setProofOpen(true) : undefined)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
          isVerified
            ? "bg-atlas-100 text-atlas-700 border-atlas-300"
            : "bg-surface-secondary text-text-muted border-border"
        } ${showExpertProof ? "hover:bg-atlas-200 cursor-pointer" : "cursor-default"}`}
        title={showExpertProof ? copy.expert.verificationDetails : label}
      >
        <span className="material-symbols-outlined text-[14px]">{isVerified ? "shield" : "schedule"}</span>
        {label}
      </button>

      {showExpertProof && (
        <Dialog open={proofOpen} onClose={() => setProofOpen(false)} title={copy.expert.verificationDetails}>
          <CryptographicProofPanel verification={verification} onRefresh={onRefresh} onClose={() => setProofOpen(false)} />
        </Dialog>
      )}
    </>
  );
}
