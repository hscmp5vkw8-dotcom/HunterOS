# HunterOS on Google Play - internal family testing

Updated September 25, 2026. Google Play internal testing is active for version 0.4.1 (7). The scope is private testing, not a public production launch. Internal testing supports up to 100 selected testers and Play Store app updates.

## Current build

- Version 0.4.1, Android version code 7: AAB finished at 19:37 UTC. Downloaded and statically inspected: expected package/version, non-debug, intended permissions and matching EAS public signing certificate. SHA-256: b39fc8cc984a4cacda33535c44b7845d709eb77f73f2c593b169071b33c9998b.
- EAS job: https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/99481e0b-b094-4fcb-8c0e-36552fa6a804
- Source before counter increment: 40fe9075d4b8dd891ba2dfb27bec7b8f75b9ce15. The code includes private saved feedback and the Account Back fallback.
- Existing APK preview build 6 is a separate fallback route. Do not upload an APK as the new Play app's bundle or rebuild an already successful AAB just to download it.
- Package stays com.totalfreedomindustries.hunteros. Current local counters are Android 7 / iOS 7. Future builds must advance Android's code above 7.

## Account and release work still required

The owner completed registration for personal developer account GetHunterOS, ID5829532387748741859, under jacob@gethunteros.com. Two-step verification is enabled. Owner explicitly confirmed no registered company. HunterOS as a public developer name was already taken; GetHunterOS was accepted. The app's intended name remains HunterOS.

Verified September 25: account verification gates cleared and contact phone shows verified. The owner explicitly approved the Developer Program Policies, Play App Signing Terms and US export declaration. HunterOS was created with English (United States), App, Free and the available existing package. Play app ID: 4972291825989850904. Internal release 1 was published at approximately 21:54 UTC and Play shows Active / Available to internal testers. No public release. No ID/address documents or payment credentials were copied into project records. Do not repeat registration/payment.

With explicit owner approval, the existing Expo Android signing key was encrypted using Google's PEPK tool, uploaded and saved in Play App Signing. Google's app signing fingerprint and upload certificate now match the existing EAS family APK: a2c1b8ac1b2f7c3b73a5ad764f5a8e5b0ef56de19ac381fee1804a148c059a43. The Expo key was not changed or revoked. Temporary keystore and password argument files were removed after encryption; only the encrypted import ZIP remains in a restricted directory outside source. Do not repeat the import or generate a replacement key.

The bundle was accepted and published as internal release 1, named 0.4.1 (7) - Family beta. Validation showed one non-blocking missing-deobfuscation-file warning; native debug symbols are attached. The HunterOS family beta email list is saved for this track with the owner and one supplied Android tester; the other Android address is still required. Keep personal tester addresses in private operator records, not source. Each tester must opt in through the actual generated test link using the exact listed Google account. Tester access does not grant developer-account administration. Google may take up to an hour, occasionally longer, for publication to reach the storefront.

Google currently displays the temporary store name com.totalfreedomindustries.hunteros (unreviewed) until listing setup and review are completed. This is expected for the initial internal test and must be explained in the invitation. The actual app remains HunterOS. Physical opt-in, install, upgrade preservation and a later automatic update remain unverified; an Active track does not prove those device results.

Google Play requires a signed AAB for this new app. The production EAS profile builds that format. The existing production submit profile deliberately targets internal with releaseStatus draft. Complete the first release through Play Console, or later connect a narrowly scoped Google service account for EAS submissions. Current Expo documentation permits a first release through EAS Submit once its prerequisites are met; a manual first upload is optional. No new service account/key is created or connected yet.

## Preserve existing APK installations

Existing 0.1.2/code3 and 0.4.0/code5 APKs have public signer SHA-256 a2c1b8ac1b2f7c3b73a5ad764f5a8e5b0ef56de19ac381fee1804a148c059a43. Before finalizing Play App Signing, inspect Google's actual options and choose the supported existing-key migration path if retaining the same installed app identity. Do not blindly accept a different Google-generated signing identity and promise an in-place upgrade. Existing app updates require compatible signing certificates as well as the same package and a higher version code. Do not revoke/rotate EAS signing credentials.

If Google needs the original signing key, prepare the exact encrypted import flow first and obtain any required owner handoff/confirmation for credential access or transfer. Keep private keys/passwords outside source and build archives. Compare the resulting Play signing certificate, then test an actual upgrade from the old APK with a saved backup. Static certificate checks alone do not prove device data preservation.

## Tester instructions once the real Play link exists

1. In HunterOS, export a backup and keep the app installed.
2. On the Android phone, sign into Google Play with the email added to the tester list.
3. Open the HunterOS opt-in link supplied by the owner, join the test, then open its Google Play download link.
4. Install or update HunterOS from Google Play. If it reports a package/signature conflict, stop and contact the owner; do not uninstall to bypass the error.
5. On HunterOS's Play Store page, open the three-dot menu and enable auto-update. Google controls update timing and device/network requirements; updates are not guaranteed instantly and a separate notification is not guaranteed.
6. Use Settings â†’ Send feedback in version 0.4.1 and wait for Received. Reports are saved privately; failed sends stay on the phone for retry. Optional email/text copies keep the receipt reference.

Later releases: build a new AAB with a higher version code, upload and roll it out to the same internal track. Enrolled testers can then receive Play Store updates according to their auto-update settings. No APK link is needed for testers who successfully move to Play. No Expo Go or running laptop is required for the installed app. Developer release upload and Google processing still happen for every native update.

## Commands

    npm run build:android:play
    npm run submit:android:play -- --id BUILD_ID

The submit command needs Play app/account setup and an authorized EAS service credential. It currently prepares an internal draft, not an automatic rollout. Do not run it before these prerequisites exist. No CI trigger, public production rollout or forced in-app update is configured.

## Release verification

Verify the completed AAB version/package/permissions/signing; confirm the Play track is internal; check actual tester access and the generated opt-in link; prove installation and one later higher-version update on a physical Android device. Keep recovery, account isolation/restore, camera/offline and upgrade-preservation acceptance checks from RELEASE.md. Play registration does not establish app readiness.

New personal accounts have additional production testing and Android device-verification requirements. Confirm the dashboard's actual gates after registration. Do not mislabel a personal developer as a business to bypass verification.

## Current official references

- Internal testing and opt-in: https://support.google.com/googleplay/android-developer/answer/9845334
- Auto-update settings: https://support.google.com/googleplay/answer/113412
- Account types: https://support.google.com/googleplay/android-developer/answer/13634885
- Registration and fee: https://support.google.com/googleplay/android-developer/answer/6112435
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Android signing compatibility: https://developer.android.com/studio/publish/app-signing
- EAS Submit: https://docs.expo.dev/submit/android/
