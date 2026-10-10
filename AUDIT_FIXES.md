# Dedicated database protection

Repair branch: `fix/internship-audit-20261010`. Changes are scoped to audit findings; no deployment or live provider action is included.

## Changed

Destructive integration fixtures now require the database name to end in _test before any schema reset. Added verification/runbook notes without weakening sandbox permissions or claiming native anti-cheat proof.

## Verification

`Use a dedicated TEST_DATABASE_URL ending in _test, then run the backend suite and frontend scripts documented in the repository.`

Commands are entry points, not a claim that every live integration was executed. See the repair bundle for actual results.

## Setup and remaining evidence

Fixtures DROP/TRUNCATE the dedicated test database. Never point them at a development/production database. Browser monitoring does not prevent all cheating or control the host OS. Real registration-to-attempt-to-review journeys, judge sandbox isolation and Windows native-client tests need their supported environments. Related Safe Exam repositories are one project family.
