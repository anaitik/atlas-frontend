import { useState } from "react";
import { Button } from "./Button";

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

export function BlockchainBadge({
  verification,
  onRefresh
}: {
  verification: DocumentVerification | null;
  onRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!verification) return null;

  const isVerified = verification.verified_on_chain;

  if (!verification.blockchain_enabled) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
          isVerified
            ? "bg-atlas-100 text-atlas-700 border-atlas-300 hover:bg-atlas-200"
            : "bg-surface-tertiary text-text-muted border-border hover:bg-surface-hover"
        }`}
        title={isVerified ? "Secured on Blockchain" : "Blockchain Anchoring Pending"}
      >
        <span className="material-symbols-outlined text-[14px]">
          {isVerified ? "shield" : "gpp_maybe"}
        </span>
        {isVerified ? "On-Chain" : "Pending"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-border overflow-hidden">
             <div className="p-4 border-b border-border bg-surface-secondary flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className={`material-symbols-outlined ${isVerified ? "text-atlas-600" : "text-amber-500"}`}>
                   {isVerified ? "shield" : "gpp_maybe"}
                 </span>
                 <h3 className="font-bold text-[15px] text-text-primary">
                   Cryptographic Provenance
                 </h3>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary">
                 <span className="material-symbols-outlined text-[20px]">close</span>
               </button>
             </div>
             
             <div className="p-5 space-y-4">
               {isVerified ? (
                 <div className="p-3 bg-atlas-50 text-atlas-800 rounded-lg text-[13px] border border-atlas-200 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-atlas-600 mt-0.5">verified_user</span>
                    <p>This document is cryptographically anchored to the Polygon Proof-of-Stake network, ensuring its contents have not been modified since upload.</p>
                 </div>
               ) : (
                 <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-[13px] border border-amber-200 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] mt-0.5">pending_actions</span>
                    <p>Anchoring is in progress or awaiting block confirmation. The proof will be available shortly.</p>
                 </div>
               )}

               <div className="space-y-3">
                 <div>
                    <span className="block text-[11px] font-bold text-text-secondary uppercase mb-1">SHA-256 File Hash</span>
                    <div className="bg-surface-secondary border border-border rounded px-3 py-2">
                      <code className="text-[11px] font-mono text-text-primary break-all">
                        {verification.sha256_hash}
                      </code>
                    </div>
                 </div>

                 {verification.blockchain_tx_id ? (
                   <div>
                      <span className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Transaction Hash</span>
                      <div className="bg-surface-secondary border border-border rounded px-3 py-2 flex items-center justify-between gap-2">
                        <code className="text-[11px] font-mono text-text-primary break-all">
                          {verification.blockchain_tx_id}
                        </code>
                        <a 
                          href={`https://amoy.polygonscan.com/tx/${verification.blockchain_tx_id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-atlas-600 hover:text-atlas-800 shrink-0"
                          title="View on Polygonscan explorer"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                      </div>
                   </div>
                 ) : (
                   <div>
                      <span className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Transaction Hash</span>
                      <div className="bg-surface-secondary border border-border rounded px-3 py-2 text-text-muted text-[12px] italic">
                        {isVerified
                          ? "Verified on-chain (transaction id unavailable for this artifact)."
                          : "Transaction pending..."}
                      </div>
                   </div>
                 )}
                 <div>
                    <span className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Chain ID</span>
                    <div className="text-[13px] text-text-primary">
                      {verification.chain_id || "Unknown"}
                    </div>
                 </div>
               </div>
             </div>

             <div className="p-4 border-t border-border bg-surface-secondary flex items-center justify-end gap-3">
               {onRefresh && (
                 <Button variant="ghost" onClick={onRefresh} className="text-[12px]">
                   <span className="material-symbols-outlined text-[16px] mr-1">refresh</span>
                   Refresh Proof
                 </Button>
               )}
               <Button onClick={() => setIsOpen(false)}>Close</Button>
             </div>
           </div>
        </div>
      )}
    </>
  );
}
