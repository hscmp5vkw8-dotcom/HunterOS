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
- Email authentication enabled; auto-confirm false. No persistent app test users were created.
- EAS development/preview/production environments now contain EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. No database password or service-role key was used.

## Candidate validation

- 39 unit/data/auth-stub tests passed, including 0.1.2 migration, scan validation, invalid cloud payload rejection, restoring only an unchanged local workspace, invalid/expired recovery and separation of recovery from ordinary sign-in.
- TypeScript passed; Expo dependency compatibility check passed.
- Clean iOS, Android and web JavaScript bundles exported successfully. Native 0.4.0 candidates are tracked in RELEASE.md; no family distribution is claimed.
- Browser checks: account form loads; empty sign-in gives a clear error; manual unknown SKU saves to locker and persists after reload; unreadable saved state shows recovery instead of overwriting it.
- Expo Doctor: 19/21 checks passed. Two Git-ignore checks could not verify this source snapshot because Git is unavailable and there is no checkout metadata. mobile/.gitignore explicitly ignores .expo/ and .env* while allowing .env.example; .easignore also excludes local env and build artifacts. This is not reported as a full Doctor pass.
- Physical camera behavior, native secure session persistence and email/auth/upload/restore flows remain unverified.

## Current blocker

Custom SMTP is not yet saved. HunterOS's separate Resend sender auth.gethunteros.com has three publicly visible provider-issued DNS records; provider verification is pending. SMTP form is prepared with HunterOS <noreply@auth.gethunteros.com>, smtp.resend.com:465, username resend, interval 60 seconds; the password remains blank. Owner must enter the separate domain-scoped sending key. No service key belongs in the app or repository.

Confirmation and password reset now accept email codes inside the app. Templates in auth-templates/ must be saved after SMTP is enabled. Live signup -> received code -> confirmation -> sign-in/out -> reset -> sign-in and two-user upload/restore remain unverified. Do not publish the account feature before these pass. Supabase's old localhost Site URL is not used by the new code-only templates, but remains unsuitable for any future email-link flow.

Email provider code length is 8 digits and expiration is 3600 seconds. Server password minimum was changed to 12 to match the app. Confirmation remains required, anonymous sign-in and manual identity linking remain disabled.

## Source locations

Work candidate: work/HunterOS-v0.4/mobile.
Upstream starting commit: 0cd5b807da518a37f7d71c0abb75b41325603b2e.
Shipped baseline: work/HunterOS/mobile (0.1.2).
Existing 0.1.2 family builds remain available. The new source and native artifacts are release candidates; configured infrastructure or passing stub tests are not evidence of live account readiness.
