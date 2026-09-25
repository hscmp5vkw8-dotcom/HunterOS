# Private feedback records

HunterOS feedback is kept in its own Supabase project ejuzguancnrrrcdulixb, table public.feedback_reports. The app submits through submit_feedback(jsonb), which returns a receipt. App clients cannot read, edit or delete the table. It is an operator inbox, not a public feed. No separate assistant email address or continuous background monitoring is implied.

Apply supabase/feedback.sql once reviewed. Verify with the rollback transaction in supabase/verify-feedback.sql before committing the migration. This does not modify account/cloud workspace policies or Crawl Exchange. Initial private-beta limits are 100 reports/day globally and 20/hour per signed-in user; these limit storage, not robust public-launch bot protection. Review abuse controls before public launch.

Each record contains the original notes, steps/expectation, optional reply email, app/device version, server receipt time and authenticated account ID when present. Only an operator may assign status (new/reviewing/planned/fixed/closed), priority and operator_notes. is_test records must be excluded from user-feedback summaries. Keep original text unchanged when recording a fix.

When asked for a summary, read the private table through the authenticated Supabase dashboard, group by issue/theme, deduplicate using report IDs, list frequency and affected versions, distinguish open/fixed issues, and cite receipt IDs. Include all pages; never call a limited page the complete history. Do not copy raw feedback, contact details or screenshots into the public repository. Local working records belong under outputs/HunterOS-feedback/, not mobile source.

Example operator query:

    select id,received_at,status,priority,report->>'kind' as kind,
      report->>'details' as details,report->>'steps' as steps,
      report->>'expected' as expected,report->>'app_version' as app_version,
      report->>'platform' as platform,operator_notes
    from public.feedback_reports
    where not is_test
    order by received_at,id;

Email copies and screenshots go to support@gethunteros.com and should include the receipt ID. Text copies contain the original report ID, but any extra text or screenshots added in a separate SMS conversation are not automatically available here. The owner can forward these to support for inclusion. A saved report is not proof an optional email/text copy was sent.

The app saves pending reports locally before its request; network failure or an unacknowledged response stays Not sent. Retrying the same ID/payload returns the original server receipt without a duplicate row. The local history keeps up to 50 reports and never evicts unsent reports. Corrupt local history is not overwritten. There is no automatic background send. Feedback is separate from the trip workspace and its export/import.

Verified September25: migration committed; rollback access/validation/idempotency/rate-limit tests passed; anonymous table REST read denied401; actual browser failed submission persisted through reload, retry received a server receipt, and receipt persisted after reload. Synthetic checks are flagged is_test. Owner's Back-button report is recorded separately with fix status and commit.43 tests, TypeScript and clean all-platform export pass. Version0.4.1 includes this intake and the Account Back fix; new native builds are still required. Existing Android build5/iOS build6 do not include them. No unattended monitoring or automatic email notification is configured.
