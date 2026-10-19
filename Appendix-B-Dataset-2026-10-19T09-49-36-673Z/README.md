# Appendix B - Dataset

This owner-authorized, anonymized extract contains 259 synthetic test/demo records from nine MongoDB collections used by the school logistics system. The owner confirmed that all records are synthetic; they should not be presented as evidence of real school operations.

## Snapshot

- Started: Monday, 19 October 2026 at 17:49:36 GMT+8
- Completed: Monday, 19 October 2026 at 17:49:37 GMT+8
- Timezone: Asia/Singapore (UTC+08:00)
- Consistency: one read-only MongoDB snapshot transaction. No database records or application source files were changed.
- Campus scope: PHINMA University of Pangasinan. All records in the selected collections were included. Inventory inherits campus through its resource; audit logs have no campus field in the current model and use related records where available. Missing links prevent reliable campus inference for some records.

| Collection | Exported records | Origin |
|---|---:|---|
| users | 13 | Synthetic |
| campus | 1 | Synthetic |
| resources | 5 | Synthetic |
| inventories | 7 | Synthetic |
| requests | 28 | Synthetic |
| allocations | 26 | Synthetic |
| claimschedules | 9 | Synthetic |
| distributions | 7 | Synthetic |
| auditlogs | 163 | Synthetic |
| **Total** | **259** | **Synthetic** |

## Contents

- data/: nine JSON arrays containing sanitized records.
- data-dictionary.csv: spreadsheet-readable dictionary, allowed values, relationships, and field coverage.
- data-dictionary.md: human-readable field dictionary.
- snapshot-summary.json: scope, counts, snapshot window and processing details.
- relationship-check.json: 93 references whose targets are absent from the selected snapshot. These source inconsistencies are preserved and explicitly reported.
- checksums.json: SHA-256 checksums for the package contents except this checksum manifest itself.

## Anonymization

Only approved field lists were read for export. Passwords/hashes, authentication factors, verification/reset/email-change tokens, sessions, personal names, email addresses, student/employee IDs, avatars, contact/address information, notes, reasons, arbitrary metadata, pickup/release locations and verification narratives are excluded. All database IDs and reference IDs are replaced with consistent aliases; no reverse mapping is included or saved. Resource display names and categories are consistently aliased. Campus institution names are retained for scope documentation. Exact timestamps are reduced to UTC dates. Every record contains dataOrigin: synthetic. This is an anonymized academic extract, not a guarantee against every possible linkage inference.

## Limitations

The current MongoDB collection for campuses is named campus (singular); inventory is inventories. No source records were invented or repaired. Unlinked references are listed using aliases only. Notifications and trusteddevices are outside the nine requested collections and are excluded. Required application fields may have been removed for privacy, so these files are not intended for restoring the application. The request/inventory JSON export from the Reports page is a report output and is not a complete database backup; this appendix extract is also not a full database backup.
