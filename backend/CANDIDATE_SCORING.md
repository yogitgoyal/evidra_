# Evidence Candidate Scoring

Candidate discovery is deterministic. Every exact clue match starts at 100 points. A candidate receives 10 additional points for each matching record after the first and 5 additional points for each distinct source after the first. Phone and IP counterparties use the same score and include an interaction-count reason.

Results are tie-broken by score descending, matching-record count descending, entity type ascending, and normalized entity value ascending. Matching is typed: phone values use phone normalization, IP values use `ipaddress`, and banking candidates use the `bank_account` entity type. Transaction and UPI clues inspect only the allowlisted banking attributes `transaction_id`, `upi_ref`, and `upi_reference`.