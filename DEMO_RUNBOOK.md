# Atlas ESG Investor Demo Runbook (22-25 min)

## Preflight (5 min before call)
0. Reset/seed demo state: `cd ../atlas-backend && python demo_seed.py`
1. Set `VITE_DEMO_MODE=true` and run the frontend.
2. Confirm Polygon Amoy wallet has gas and txs are visible.
3. Log in with `system_admin` role.
4. Keep one backup tab pre-authenticated at Company Management.
5. Keep sample files ready:
- electricity invoice
- fuel invoice
- waste manifest
- HR export
- board minutes

## Act-by-Act Click Path

### Act 2: Entity setup
1. Open **Admin -> Company Management**.
2. Click **Prepare NovaTerra Demo**.
3. Open NovaTerra workspace list and mention segregation of duties.

### Act 3: Workspace + blueprint scope
1. In Company Home, open/create `FY2025 CSRD Report`.
2. Go to **Template Manager**.
3. Show blueprint list and explain schema + standards mapping.

### Act 4: Upload + anchoring wow moment
1. Go to **Extraction Dashboard**.
2. Upload electricity invoice first.
3. Run pre-run/finalize and open blockchain tx proof.
4. Upload remaining sample docs quickly.

### Act 5: Human review
1. Go to **Review**.
2. Approve one clean extraction.
3. Override one value with rationale (fuel correction).
4. Show low-confidence routing behavior.

### Act 6: Metrics + lineage
1. Go to **Metrics Dashboard**.
2. Show KPI cards and pillar breakdown.
3. Open one metric lineage chain back to source doc + hash.

### Act 7: Report generation + verification
1. Open **Report Studio**.
2. Generate CSRD report for 2025.
3. Show version, verification badge/hash, and export options.
4. Regenerate one section to show version lineage.

### Act 8: Story + audit log
1. Open **Pipeline Story**.
2. Read the plain-language narrative.
3. Open raw audit feed and show attribution/timestamps.

## Demo Guardrails
- Never click disabled “coming soon” controls during demo.
- If tx confirmation is delayed: explain optimistic anchoring.
- If extraction misses a field: frame as correct HITL behavior.
- If generation is slow: explain cross-framework synthesis + XHTML.

## Fast Recovery Script
- “This is exactly why we designed the review layer.”
- “Hash is captured immediately off-chain, with on-chain confirmation next.”
- “Let’s trace this metric back to its source document now.”

## Final Ask Slide Reminder
1. 5 EU manufacturing pilots.
2. SOC2 Type II + EU data sovereignty.
3. Scope 3 supplier portal launch.
