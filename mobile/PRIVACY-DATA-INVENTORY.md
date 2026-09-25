# HunterOS privacy/data inventory — private beta draft

This engineering inventory is not the final public privacy policy.

Accounts use Supabase Auth (email, password authentication and account identifier). Native session credentials use SecureStore; web previews use browser storage. Signing out does not erase the device workspace.

On explicit Upload, the complete workspace is sent to the user's private Supabase backup: trips, entered region/area/location notes, gear, packing, favorites and scan records with codes, timestamps, counts and product matches. Restore replaces the device copy after confirmation. Backups do not automatically merge across devices. There is no separate scan-submission publication or shared-trip implementation; reserved tables have no client permissions.

Barcode scanning uses the camera without uploading camera images/video. Numeric UPC/EAN-shaped codes may be sent to Open Food Facts, which also receives ordinary network information. QR URLs and arbitrary mixed SKU strings are not sent for food lookup. Unknown identifiers are saved locally for manual editing. No precise GPS collection or photo/OCR upload is implemented.

Catalog photos are external reference URLs; their hosts receive ordinary request information. Shopping links open external sites. No product-image license is implied. Feedback is user-composed and explicitly submitted to a private Supabase feedback table: notes, steps, expectation, optional reply email, app/device version, server receipt time and signed-in account ID when present. The owner and authorized tools can review/summarize it. There is no client read access to the table. Trips, gear and passwords are not attached. A separate local feedback journal keeps up to50 reports, preserving unsent reports for manual retry. Optional email/text copies and screenshots added outside the app remain separate communications. Feedback can be submitted without an account. Removal requests go to support@gethunteros.com with the report ID. Public-release retention policy still needs finalization.

Exported backups include private notes and any entered locations. Removing local app data does not delete Supabase accounts or cloud copies. During the private beta, users may request cloud-account/data removal through jhericks94@gmail.com; an implemented, tested in-app account deletion flow and documented backup retention policy are required before public release.

Third parties: Supabase (authentication/database), the selected SMTP service once configured (confirmation/recovery email), Open Food Facts (barcode lookup), manufacturer/retailer image/link hosts, Expo/EAS (build/distribution). HunterOS does not currently implement separate analytics or a crash-reporting SDK.

Before public launch: finalize privacy/support URLs, store disclosures, deletion and retention, password recovery, email verification, image rights and physical-device validation.
