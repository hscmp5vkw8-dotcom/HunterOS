# HunterOS v0.4 release checklist

Status 2026-09-25: 0.4.0 native candidates are Android build 5 and iOS build 6; not yet submitted or distributed. Current family release remains 0.1.2 (3).

- Android APK: https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/235aaa09-c2f5-40c8-85af-2ed1c444e304
- iOS TestFlight candidate: https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/b1dd90dc-e651-45e8-90b8-867141b55e3f — build 6 queued September 25 at 16:44 UTC. Earlier build 5 completed but its artifact revealed unused default microphone/Face ID permission descriptions. Those descriptions are explicitly disabled; config introspection confirms only camera remains. Build 5 is superseded and must not be submitted.
- TypeScript, 39 unit/data/auth-stub tests and clean iOS/Android/web exports pass. Browser checks confirm signup/reset validation and feedback preview/version. These do not prove real email delivery, cloud login or device behavior.

## Completed

- Supabase free project ejuzguancnrrrcdulixb created in the HunterOS organization.
- supabase/schema.sql applied. Database owner-only policies tested live using supabase/verify-rls.sql; all test data rolled back.
- Anonymous REST reads denied (HTTP 401, PostgreSQL 42501).
- Email confirmation remains enabled.
- Expo project hunteross-team/hunteros linked (be009c48-012c-4220-a8d7-764c090695aa).
- Public client connection settings created in development, preview and production EAS environments.
- iOS bundle and Android package remain com.totalfreedomindustries.hunteros. App Store Connect app remains 6815313376.
- SDK 57 and the 0.1.2 persistence/recovery/feedback fixes preserved.

## Before another family release

1. Configure an email sender (SMTP). Default Supabase mail only goes to project administrators, not family testers. Do not add testers as backend administrators or disable confirmation as a workaround.
2. Save the confirmation and reset templates from auth-templates/ after custom SMTP is enabled. Use subjects "Confirm your HunterOS account" and "Reset your HunterOS password". Both use {{ .Token }}; users enter the code inside the app, so no web callback or localhost return is required. Keep email confirmation enabled, set minimum password length to 12, and verify the provider's code expiration. Test real confirmation/recovery, expired and reused codes. Recovery uses a separate in-memory client and must not switch the normal workspace account.
3. Test two real accounts: signup, confirmation, sign-in, background/foreground session refresh, sign-out, cloud upload/restore and account switching. Live SQL tests validate policies, not the complete client auth flow.
4. Test upgrade from 0.1.2 on iPhone and Android: existing trips, packing state, favorites and gear survive. Export a backup before updating.
5. Test scanner permission denial, manual entry, a known barcode, an unknown SKU, unavailable network and duplicate callbacks on physical devices.
6. Test force-close/reopen in airplane mode; then reconnect. Cloud backups are manual full-workspace replacements, not automatic merging.
7. Review the candidate changes and preserve them in GitHub before distributing new builds.

## Build and distribution

Use EAS CLI 24.7.0 or a reviewed compatible version. Existing project signing credentials are reused. Build counters are Android 5 / iOS 6 and autoIncrement is enabled. Candidates can complete while email setup is pending; do not distribute them until the applicable gates pass. Download existing successful artifacts instead of rebuilding to install them.

    npx eas-cli@24.7.0 build --platform android --profile preview
    npx eas-cli@24.7.0 build --platform ios --profile production
    npx eas-cli@24.7.0 submit --platform ios --profile production --id b1dd90dc-e651-45e8-90b8-867141b55e3f

Android preview produces a standalone APK. Send testers the new install link; install over the existing app without uninstalling to preserve data. TestFlight distributes iOS updates after processing/review. EAS Update is not configured, so do not promise automatic over-the-air fixes.

For source archives without Git, set EAS_NO_VCS=1 and EAS_PROJECT_ROOT to this mobile directory. The catalog importer is self-contained. Do not upload .env.local, database credentials, node_modules or generated build output; .easignore excludes them.

Google Play production builds produce an AAB. Submission remains internal/draft and still needs the Play Console account/app/service account. Do not switch to public distribution as part of family testing.

## Before public launch

Finish account deletion in-app and the verified server-side deletion process, password recovery, final privacy/support URLs, Apple/Google privacy forms, physical-device testing, and manufacturer image rights. Review backup retention, email deliverability and free-tier hosting limits. A project being created does not make the public release ready.
