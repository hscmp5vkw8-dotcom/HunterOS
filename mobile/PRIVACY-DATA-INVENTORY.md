# HunterOS privacy/data inventory (draft for counsel/store forms)

This is an engineering inventory, not a final legal privacy policy.

## Account/cloud data
When cloud features are enabled, HunterOS can store an account identifier/email through Supabase Auth plus the user's workspace: Gear Locker, trips, packing status, favorites and scan history. Trip records can contain user-entered region/area/location notes. The current app does not automatically collect precise GPS location.

## Scanner data
Barcode/SKU scans are stored locally and can be uploaded to the user's cloud scan submissions. A scan may include a product match and timestamps/count. Shared catalog promotion should strip user identity from public product records; raw per-user scan submissions remain protected by RLS.

## Photos
Current catalog photos are remote reference URLs. Camera access is used for barcode scanning. Arbitrary gear-photo/OCR upload is not yet implemented.

## Third parties
Supabase: authentication/database when configured.
Open Food Facts: a scanned packaged-food barcode may be sent for product lookup.
Manufacturer/retailer hosts: loading remote product images or opening shopping links contacts those services.
Expo/EAS: build/update infrastructure; production telemetry/analytics are not currently implemented by HunterOS itself.

## Required before public launch
Publish a real privacy policy and support URL. Complete Apple App Privacy and Google Play Data safety declarations from the final production behavior. Add account deletion UI/process if accounts are publicly offered. Confirm retention/deletion behavior for Supabase records and backups. Review product-image and affiliate terms.
