# Status storage

Requests use `pending`, `approved`, `rejected`, `cancelled`, `ready_for_claim`, `claimed`, `released`, and `completed`. Users use `active` and `suspended`. Input casing and surrounding whitespace are normalized before validation and storage; request labels such as `Ready For Claim` are accepted. Unknown statuses are rejected.

Distribution records retain their existing schema values: `Pending`, `Prepared`, `Released`, `Received`, `Completed`. Distribution progress counts request statuses, using lowercase values. Existing workflow transition and role restrictions still apply.

From the backend directory, preview existing database corrections with:

```powershell
node scripts/normalize-statuses.js
```

Apply recognized corrections with:

```powershell
node scripts/normalize-statuses.js --apply
```

The script uses the same environment configuration as the backend, changes only recognized status values, leaves unknown values untouched, and can be rerun safely. It does not delete records or rewrite historical audit logs.
