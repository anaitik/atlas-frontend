import { useState } from "react";
import { useExperienceMode } from "../../hooks/useExperienceMode";
import { VerificationBadge } from "../trust/VerificationBadge";
import { Dialog } from "./Dialog";
import { CryptographicProofPanel } from "../trust/CryptographicProofPanel";
import { copy } from "../../lib/copy";
export type DocumentVerification = {
  document_id: string;
  sha256_hash: string;
  blockchain_enabled: boolean;
  chain_id: number | null;
  contract_address: string | null;
  verified_on_chain: boolean;
  verification_status: "verified" | "not_found" | "not_configured";
  blockchain_tx_id: string | null;
};

/** @deprecated Prefer VerificationBadge — kept for backward compatibility */
export function BlockchainBadge({
  verification,
  onRefresh,
}: {
  verification: DocumentVerification | null;
  onRefresh?: () => void;
}) {
  const { isSimple } = useExperienceMode();
  const [isOpen, setIsOpen] = useState(false);

  if (!verification || !verification.blockchain_enabled) return null;

  if (isSimple) {
    return <VerificationBadge verification={verification} onRefresh={onRefresh} showExpertProof={false} />;
  }

  return (
    <>
      <VerificationBadge verification={verification} onRefresh={onRefresh} showExpertProof={false} />
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[10px] font-semibold text-atlas-600 hover:underline ml-1"
      >
        {copy.trust.cryptographicProof}
      </button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} title={copy.trust.cryptographicProof}>
        <CryptographicProofPanel verification={verification} onRefresh={onRefresh} onClose={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
}
