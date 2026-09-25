# HunterOS cloud setup status — 2026-09-25

## Live setup

- Supabase organization: HunterOS (Free), ID mputqsnklufupsfsndod.
- Project: HunterOS, ID ejuzguancnrrrcdulixb, West US/Oregon. Dashboard reported Healthy.
- Project URL: https://ejuzguancnrrrcdulixb.supabase.co.
- Database schema installed successfully via SQL Editor with user approval.
- Tables: user_workspaces, scan_submissions, products, trip_members. RLS enabled on all.
- Only user_workspaces grants authenticated client access, restricted to auth.uid() = user_id. The other three tables are private scaffolding, not shipped sharing features.
- Live transaction test passed: own read/write, cross-account read/update/insert denied, ownership reassignment denied, anonymous privileges denied, reserved tables private. Test users and rows rolled back.
- Public REST check returned 401 / 42501 for anonymous workspace reads.
- Email authentication enabled; auto-confirm false. Owner completed signup, reached a signed-in browser session and saved a cloud backup. Reload preserved sign-in. Recovery, restore and two-account client isolation remain pending.
- EAS development/preview/production environments now contain EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. No database password or service-role key was used.

## Candidate validation

- 39 unit/data/auth-stub tests passed, including 0.1.2 migration, scan validation, invalid cloud payload rejection, restoring only an unchanged local workspace, invalid/expired recovery and separation of recovery from ordinary sign-in.
- TypeScript passed; Expo dependency compatibility check passed.
- Clean iOS, Android and web JavaScript bundles exported successfully. Native 0.4.0 candidates are tracked in RELEASE.md; no family distribution is claimed.
- Browser checks: account form loads; empty sign-in gives a clear error; manual unknown SKU saves to locker and persists after reload; unreadable saved state shows recovery instead of overwriting it.
- Expo Doctor: 19/21 checks passed. Two Git-ignore checks could not verify this source snapshot because Git is unavailable and there is no checkout metadata. mobile/.gitignore explicitly ignores .expo/ and .env* while allowing .env.example; .easignore also excludes local env and build artifacts. This is not reported as a full Doctor pass.
- Physical camera behavior, native secure session persistence and email/auth/upload/restore flows remain unverified.

## Current blocker

Custom SMTP is saved and auth.gethunteros.com is verified. Sender HunterOS <noreply@auth.gethunteros.com>, smtp.resend.com:465, username resend, interval60seconds. Owner saved a separate sending-only key after a successful direct SMTP235 test. No SMTP or service key belongs in the app/repository.

Confirmation and password reset accept email codes inside the app. Both templates in auth-templates/ are saved and verified after reload. Owner signup reached a signed-in session. Complete sign-in/out, recovery and two-user upload/restore acceptance remains pending. Supabase's old localhost Site URL is not used by these templates, but is unsuitable for future email-link flows.

Private feedback intake is deployed separately in this project. submit_feedback accepts validated bounded reports with receipts, idempotency and intake limits. feedback_reports has RLS and no app-role table access. Rollback policy/validation/rate tests and live browser delivery/retry/persistence passed; anonymous REST read denied401. FEEDBACK-OPERATIONS.md documents later summaries. Native0.4.0 builds predate this0.4.1 feature.

Email provider code length is 8 digits and expiration is 3600 seconds. Server password minimum was changed to 12 to match the app. Confirmation remains required, anonymous sign-in and manual identity linking remain disabled.

## Source locations

Work candidate: work/HunterOS-v0.4/mobile.
Upstream starting commit: 0cd5b807da518a37f7d71c0abb75b41325603b2e.
Shipped baseline: work/HunterOS/mobile (0.1.2).
Existing 0.1.2 family builds remain available. The new source and native artifacts are release candidates; configured infrastructure or passing stub tests are not evidence of live account readiness.
