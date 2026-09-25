# Private vendor attribution operations

The vendor tracker is separate from the mobile app's customer workspace data.

Migration: [20260925_vendor_attribution.sql](migrations/20260925_vendor_attribution.sql). Apply once after the bootstrap schema; it creates new tables and does not overwrite existing objects.

Verification: [vendor_attribution.sql](tests/vendor_attribution.sql). Run in the database SQL editor; all sample records are rolled back.

Add a real vendor in `vendor_partners`. Its trigger creates 14 unknown method rows in `vendor_attribution_methods`. Record each vendor answer there. The read-only `vendor_attribution_tracker` view provides the requested overview fields, including support flags, codes, per-method windows, commission classifications, and evidence.

Support is independent of commission. Classify each method as unknown, analytics_only, manual_referral_review, or affiliate_commission. Known classifications require an actual vendor answer, evidence reference, and confirmation date. A survey selection or code alone is never proof of commission.

These records are private to database administration: RLS is enabled, client grants are revoked, and the view uses invoker security. There is no mobile access policy or client UI for these records.

Applied and verified in HunterOS project ejuzguancnrrrcdulixb on September 25, 2026. Full operating notes and updated vendor email templates are saved in the workspace outputs folder under HunterOS-vendor-attribution and HunterOS-business-email-kit.md.
