# HunterOS v0.4 candidate

Prepared on 2026-09-25 from main commit 0cd5b807da518a37f7d71c0abb75b41325603b2e, with the shipped 0.1.2 fixes carried forward. EAS native candidates are version 0.4.0 build 5. See RELEASE.md for build references and the remaining distribution gates. This is not a public-store release.

## What is ready

- Expo SDK 57 and the existing HunterOS app identity/signing project.
- A self-contained catalog source: clean installs no longer need a parent HTML file.
- Trips, locker, favorites, packing, export/import and feedback from the family beta.
- Camera/manual barcode input, local scan history and optional food-barcode lookup.
- Optional account and manual cloud backup with replacement confirmation.
- Native secure session storage and web browser session storage.
- Email-code confirmation and password recovery inside the app, with a separate temporary recovery session.
- Feedback email to support@gethunteros.com plus the existing share/text option.
- Preservation of old workspaces, invalid-data recovery and calendar-date validation.

## Cloud project

HunterOS, free plan, West US (Oregon): https://supabase.com/dashboard/project/ejuzguancnrrrcdulixb

The schema has been applied. Signed-in users can access only their own workspace. Reserved scan submission, shared product and membership tables have no client access. Scans are included in the private workspace backup; there is no separate scan publication or shared-trip UI yet.

The project URL and publishable client key are configured in Expo's development, preview and production environments. Local overrides are in ignored .env.local. Database passwords, service-role keys and admin tokens do not belong in the app.

## Release still blocked

Custom SMTP and real email delivery are pending. Supabase's default email sender cannot send signup confirmations to arbitrary family email addresses. Keep email confirmation enabled. The app's confirmation/recovery code flow is implemented and unit-tested, but requires the two templates in auth-templates/ and real inbox verification before distribution. Account signup/upload/restore on physical phones still needs end-to-end verification.

See RELEASE.md for exact next steps and CLOUD-SETUP-STATUS.md for evidence. The currently distributed standalone Android APK and iOS TestFlight build remain v0.1.2 (3); they do not need a running laptop.

## Local development

Use Node.js 22.16 or newer in this mobile directory:

    npm ci
    npm test
    npm run typecheck
    npx expo install --check
    npx expo export --platform all

For development only, npm start runs Expo Go and needs a running development server. Family members use a standalone APK or TestFlight instead. The camera and secure storage require native-device validation; a browser preview does not replace it.
