import { truncateHash } from "../../lib/display-labels";
import { copy } from "../../lib/copy";
import type { DocumentVerification } from "../ui/BlockchainBadge";
import { Button } from "../ui/Button";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* ignore */
  }
}

export function CryptographicProofPanel({
  verification,
  onRefresh,
  onClose,
}: {
  verification: DocumentVerification;
  onRefresh?: () => void;
  onClose?: () => void;
}) {
  const isVerified = verification.verified_on_chain;

  return (
    <div className="space-y-4">
      {isVerified ? (
        <div className="p-3 bg-atlas-50 text-atlas-800 rounded-lg text-[13px] border border-atlas-200 flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] text-atlas-600 mt-0.5">verified_user</span>
          <p>{copy.expert.verificationHint}</p>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-[13px] border border-amber-200">
          <p>Securing record is in progress. Verification details will be available shortly.</p>
        </div>
      )}

      <div>
        <span className="block text-[11px] font-semibold text-text-secondary mb-1">{copy.expert.fileFingerprint}</span>
        <p className="text-[10px] text-text-muted mb-1">Unique hash of the uploaded file contents.</p>
        <div className="bg-surface-secondary border border-border rounded px-3 py-2 flex items-center justify-between gap-2">
          <code className="text-[11px] font-mono text-text-primary break-all" title={verification.sha256_hash}>
            {truncateHash(verification.sha256_hash, 10)}
          </code>
          <Button variant="ghost" className="text-[10px] px-2 py-1 h-auto shrink-0" onClick={() => copyText(verification.sha256_hash)}>
            Copy
          </Button>
        </div>
      </div>

      {verification.blockchain_tx_id && (
        <div>
          <span className="block text-[11px] font-semibold text-text-secondary mb-1">{copy.expert.onChainReference}</span>
          <p className="text-[10px] text-text-muted mb-1">Public record that links this file to your organization.</p>
          <div className="bg-surface-secondary border border-border rounded px-3 py-2 flex items-center justify-between gap-2">
            <code className="text-[11px] font-mono text-text-primary break-all" title={verification.blockchain_tx_id}>
              {truncateHash(verification.blockchain_tx_id, 10)}
            </code>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" className="text-[10px] px-2 py-1 h-auto" onClick={() => copyText(verification.blockchain_tx_id!)}>
                Copy
              </Button>
              <a
                href={`https://amoy.polygonscan.com/tx/${verification.blockchain_tx_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-atlas-600 hover:text-atlas-800 p-1"
                title="View on block explorer"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {onRefresh && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onRefresh} className="text-[12px]">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </Button>
          {onClose && <Button onClick={onClose}>Close</Button>}
        </div>
      )}
    </div>
  );
}
