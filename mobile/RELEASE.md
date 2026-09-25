# HunterOS release-day checklist

The repository is prepared for Android + iOS builds, but store/account credentials must be supplied by the owner. Do not commit passwords, Apple credentials, Google service-account JSON, Supabase secrets, or EAS tokens.

## 1. Supabase
1. Create/open the HunterOS Supabase project.
2. Run `supabase/schema.sql` in SQL Editor.
3. Copy `.env.example` to `.env`.
4. Put the project URL and **publishable/anon client key** in `.env`. Never use the service-role key in the app.
5. In EAS, create production/preview environment variables with the same two public values.
6. Test: create two accounts and confirm each cannot read the other's workspace.

## 2. Expo / EAS
From `mobile/`:
```sh
npm install
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```
If `eas init` adds an `extra.eas.projectId` to app config, commit that generated project ID.

Create a preview first:
```sh
npx eas-cli@latest build --platform all --profile preview
```
Install on real Android/iPhone devices and test account sign-up, cloud upload/download, camera barcode scan, offline edits, relaunch, reconnect, and backups.

## 3. Apple
- Active Apple Developer Program membership.
- Create/confirm App Store Connect app for bundle ID `com.totalfreedomindustries.hunteros`.
- Let EAS manage signing credentials unless existing production credentials must be preserved.
- Add App Store privacy details, screenshots, support/privacy-policy URLs, age rating, category and description.
- Production build: `npx eas-cli@latest build --platform ios --profile production`
- Submit: `npx eas-cli@latest submit --platform ios --profile production`
- First send to TestFlight. Production release still requires App Review.

## 4. Android
- Google Play Console developer account.
- Create app with package `com.totalfreedomindustries.hunteros`.
- Complete Data safety, content rating, privacy policy, screenshots/listing and testing requirements.
- Configure Google Play service account only if using automated EAS Submit.
- Production AAB: `npx eas-cli@latest build --platform android --profile production`
- Submit: `npx eas-cli@latest submit --platform android --profile production`
- The checked-in submit profile targets internal/draft first; promote only after testing.

## 5. Release gate
Do not promote to production until:
- iPhone and Android physical-device tests pass.
- Airplane-mode edits survive force-close/reopen.
- Cloud upload/download is tested with intentionally conflicting copies.
- Scanner permission denial/retry works.
- Unknown barcode and known food barcode both work.
- Account sign-out/sign-in restores the expected cloud copy.
- RLS cross-account access test fails as intended.
- Product-image commercial rights are resolved for images shipped/displayed in production.
- Privacy policy accurately describes account, scan, trip and location-related data.
