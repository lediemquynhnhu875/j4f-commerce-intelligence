Extract into project root. Existing test-store-http.ts is retained.
Run from backend:
  node --import tsx scripts/test-populated-stores.mjs

The runner uses Shalla credentials from backend/.env.seller-accounts.json
and User2/User3/Admin from existing environment configuration. No passwords
are printed or written to reports, and .env is not changed. Do not share the
credential file. Shop labels assume User2 is Gentlemen and User3 is Gia Dung;
actual ownership IDs are validated by the test.

All three stores must have products, analyses and actions. Tests cover three
pairs/six ownership directions and six SQL assignee rejections. Existing
business-read-only test behavior is retained: temporary authentication sessions
and rejected-write probes; no fixture CRUD is enabled. Run without concurrent
business edits/imports so fingerprints and cross-pair counts stay stable.

Send terminal JSON on PASS. If FAIL, send the final sanitized error lines
and tmp/store-http-results.json. The aggregate result is saved to
  tmp/populated-store-http-results.json

Local validation: syntax and matrix checks for six-way coverage and rejection
of incomplete analysis/action coverage. Real HTTP execution requires the local
backend, Neon connection and credential files.
