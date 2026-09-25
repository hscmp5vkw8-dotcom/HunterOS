## Current product-picture update: 0.4.2 (8)

Android release 2 is Active / Available to internal testers on the existing private Google Play track. iOS: Uploaded successfully; Apple processing pending. Family Beta assignment and review still need completion. Both cloud builds finished and their archived artifacts passed static identity/permission checks. Runtime source commit: 31ed1a717a055dd682876810666501eec843f4d6. See PRODUCT-PHOTOS.md for the shared catalog, data separation and validation.

The earlier 0.4.1 entries below are historical. Physical upgrades, native behavior, recovery and two-account cloud acceptance remain unverified. No public-store release or new family email was sent.

---

# HunterOS0.4.1 family beta release

Status 2026-09-25T18:52:14.536Z: direct-entry Account Back and private saved feedback are implemented and browser-verified.43 tests, TypeScript and all-platform export pass. A final clean web export confirms0.4.1 metadata. Source is preserved in draft PR5; main remains unchanged. No public store release.

## Current candidates

- Android0.4.1(6), preview standalone APK: FINISHED, archived and statically inspected for package/version/permissions and public signer continuity. Physical upgrade remains untested. https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/8b5afdab-a17a-46a3-9c55-f2e095285a99
- iOS0.4.1(7): FINISHED; IPA archived and inspected. EAS submission55a9ba86-0413-4f80-ad57-bd9d295c70d5 finished19:19:34UTC. Apple build84e5adb9-2ce7-498e-b4fc-66e6810a6919 is VALID, internal IN_BETA_TESTING, external READY_FOR_BETA_SUBMISSION as of19:25UTC. Owner test notes saved. https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/a190877d-119b-4ecd-93e6-cbe79070e039
- Existing0.4.0 Android5/iOS6 archives do not contain the Back/feedback changes. iOS0.4.0(6) was processed for internal testing only. External family TestFlight remains0.1.2(3).
- Earlier0.4.0 iOS5 is superseded for unused permission descriptions and must not be submitted.

Builds run in Expo's cloud independently of the laptop. Do not submit duplicate jobs. EAS autoIncrement advanced local counters to Android7/iOS7 after the separate Play AAB request. Check these exact job IDs and archive successful artifacts before sharing links.

## Completed

- Existing HunterOS Supabase ejuzguancnrrrcdulixb and EAS project be009c48-012c-4220-a8d7-764c090695aa are linked. Public client URL/key are set in development, preview and production; backend secrets are not bundled.
- Workspace owner-only policies passed rollback SQL tests and anonymous REST read denial. Feedback is a separate private table with bounded append-only RPC, receipts and idempotent retry; live intake/browser and denial checks passed. See FEEDBACK-OPERATIONS.md.
- Custom SMTP is saved; auth.gethunteros.com verified; owner signup, code confirmation/sign-in and browser cloud upload succeeded. Confirmation remains required, anonymous sign-in disabled, minimum password12characters. Both code-only confirmation/recovery templates are saved; no localhost callback is required for their in-app code flow.
- Package/bundle ID stays com.totalfreedomindustries.hunteros; Apple app6815313376. Existing signing credentials are reused. Android blocked audio/media permissions and camera-only iOS purpose text are configured.

## Before family notification

1. Inspect the completed0.4.1 APK/IPA for identity, counters, signer continuity and intended permissions. Preserve hashes and matching source. Old artifact checks do not verify these new files.
2. iOS7 upload, processing and owner notes are complete. Finish owner acceptance, required external beta review and Family Beta assignment.
3. Test real recovery/code/new-password/sign-in. The owner enters and submits the changed password. Verify email authentication headers and expired/reused codes; do not infer them from signup success.
4. Use two real accounts for cloud upload/restore and switching. SQL isolation checks do not replace client tests. Restore replaces a workspace; export a backup first.
5. On phones, verify upgrade from0.1.2 preserves trips/gear/favorites/packing, session background/foreground, camera denial/manual entry/known and unknown barcode, offline force-close/reopen/reconnect, and saved feedback receipt/retry. Do not uninstall to update.
6. Send the authorized family instructions only after the applicable route is available. No new family notification has been sent.

## Distribution

Use EAS CLI24.7 or a reviewed compatible version. iOS7 is already uploaded and processed. Do not submit it again. Check submission55a9ba86-0413-4f80-ad57-bd9d295c70d5 and Apple build84e5adb9-2ce7-498e-b4fc-66e6810a6919. For a future inspected candidate, use its own new ID:

    npx eas-cli@24.7.0 submit --platform ios --profile production --id FUTURE_BUILD_ID

Android preview APKs remain a manual-install fallback. Google Play internal testing is now active for 0.4.1 (7), using the same app signing certificate as the existing family APKs. Listed testers must join through the private opt-in link and install/update from Google Play; future native releases can then use Play's automatic-update settings. Actual physical upgrade and automatic delivery remain unverified. iPhone fixes appear in TestFlight after processing/review; testers can enable TestFlight automatic updates. EAS Update is not configured.

For source archives without Git, set EAS_NO_VCS=1 and EAS_PROJECT_ROOT to this mobile directory. Preserve the self-contained catalog importer. Exclude .env.local, credentials, node_modules, .expo, generated exports and test outputs. Google Play submission remains internal/draft and requires its own account/app/service account.

## Before public launch

Finish account deletion and its verified server-side process, privacy/support URLs, store privacy forms, manufacturer image rights, device testing, feedback abuse controls and backup/email quota review. Family beta readiness does not mean public-store readiness.

## Google Play setup in progress

The separate 0.4.1/code7 AAB is finished, archived and statically inspected: 99481e0b-b094-4fcb-8c0e-36552fa6a804. HunterOS app4972291825989850904 exists under verified GetHunterOS. With explicit owner approval, the existing EAS signing key was encrypted through Google PEPK and imported; Google app signing and upload certificate match the family APK. Temporary keystore/password files were removed. Internal release 1, 0.4.1 (7) - Family beta, was published around21:54UTC September25 and shows Active / Available to internal testers. The list includes the owner and one supplied Android tester; the remaining Android email and actual phone opt-in/install tests are outstanding. The only validation warning concerns an optional deobfuscation file. GOOGLE-PLAY.md records temporary store naming, signing and update requirements. No public release or family email notification. Original APK6 and iOS7 jobs are preserved.
