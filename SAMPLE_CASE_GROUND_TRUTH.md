# Synthetic demo case ground truth

The one-click demo seed creates `EVIDRA Synthetic Investigation` and loads
three CSV files containing 120 CDR rows, 120 banking rows, and 120 social
rows (360 events total). This is intentionally smaller than a production
export so the graph remains readable during a live demonstration.

## Planted patterns

- Coordinated call group: `+919810000101` through `+919810000105` have
  pairwise CDR contact in the first 10 rows.
- Bridge phone: `+919800000999` receives calls from
  `+919820000201` through `+919820000204` and calls
  `+919830000301` through `+919830000304`.
- Mule accounts: `rajesh.kumar@upi`, `meena.shah@upi`, and
  `vikas.patel@upi` each receive eight transfers from the same sender pool
  within the first 48 minutes, followed by an `85000` NEFT onward transfer
  to `farhan.traders@upi`.
- Short-window sequence: the first CDR row begins at 09:01 UTC, the first
  mule transfers begin at 09:20 UTC, and the first social links occur at
  09:01-09:03 UTC. These records are deliberately close together so the
  timeline exposes the call/transfer/social progression.
- Decoy activity: `+919840000401` through `+919840000405` generate repeated
  calls to separate `+919840001xxx` numbers, while `decoy.merchant@upi` and
  `salary.account@upi` generate low-value banking activity without overlap
  with the planted ring.
- Social bridge: `@bridge.operator` is linked to the planted handles and
  appears in both the direct sequence and recurring social interactions.

## Loading

After authenticating as an officer, call:

```text
POST /cases/demo-seed
```

The response returns the new `case_id` and the created/rejected counts for
each dataset. Open that case in the overview, graph, timeline, financial,
story, and copilot pages.
