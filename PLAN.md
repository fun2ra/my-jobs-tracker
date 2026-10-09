# My Jobs Tracker: plan

A private dashboard showing the status of my job applications, built from my Gmail.

## How data gets in

**"Update from Gmail" button** (set up with [SETUP.md](SETUP.md)): Google sign-in restricted to my
account → the Apps Script API runs `runExport` in `apps-script/exportJobEmails.gs` as me → the script
reads Gmail (read-only), updates my private spreadsheet and returns the Emails rows → the app keeps them
in this browser only and revokes the sign-in token.

Fallback: import a CSV download of the Emails tab.

No CSV, data or account identifiers go in the repo or the published site.

## Data model

- **EmailEvent**: one email. Unique key is the Gmail `Message ID`. It has a date, a status
  (from the script), a company and role guess, the sender, subject, snippet and link.
- **Application**: emails grouped by company + role (or a shared job reference number such as
  `JR38080` or `(296459)`). Companies send each update as a *new* conversation, so grouping by
  Gmail thread does not work.
  - **Stage**: offer > rejected > interview > assessment > viewed > applied
  - **Source**: Indeed, LinkedIn, InfoJobs, Net-Empregos, Randstad, Direct email, Company site
  - **Field**: automation / software / other, guessed from the role
  - **Needs action**: GDPR consent, "complete your application", and similar requests
  - **No reply yet** (derived): still at applied/viewed after N days (default 21)
- Login codes, alerts and similar emails (status `Noise`) are kept but hidden. "Other" emails
  attach to an application when the company matches; otherwise they are listed as unassigned.

## Phases

1. **Parser, grouping, tests** (done)
   - Vite + React + TypeScript project, Vitest
   - CSV parsing by column name (works with older exports too)
   - Grouping emails into applications, stage, source, field, needs-action
   - Tests on a made-up fixture, plus a local-only test on the real export
2. **Table and filters**
   - CSV import (drag and drop, several files merged by message ID)
   - Applications table, expandable to show the email timeline with Gmail links
   - Filters: stage, field, source, date range, text search, needs action, show noise/unassigned
   - Imported data kept in IndexedDB so it survives reloads
3. **Dashboard**
   - Stat tiles: total, active, interviews, rejected, response rate, average days to first reply
   - Charts: stage breakdown, applications per week, response rate by source
4. **Manual corrections**
   - Edit company, role and stage, merge or split applications, mark as withdrawn
   - Corrections kept in IndexedDB, keyed by application ID (the first email's message ID),
     and applied again after every import
5. **Update from Gmail, my account only** (code done; Google setup in [SETUP.md](SETUP.md))
   - Google Identity Services token flow in the browser, no backend.
   - OAuth consent screen in **Testing** mode with **only my Gmail address as a test user**:
     Google itself refuses every other account.
   - The app calls the Apps Script API (`scripts.run`, `devMode`, deployment "Only myself"), so the
     script runs as me. It uses the Gmail advanced service, so read-only Gmail access is enough.
   - The app also checks the signed-in address against the one in Settings. Settings (client ID,
     Script ID, address) live in the browser, not in the repo or the build.
   - The token stays in memory and is revoked after every run.
   - Content Security Policy on the built page limits it to its own code and Google's endpoints.
6. **Deploy to GitHub Pages**
   - Vite `base` is `/my-jobs-tracker/` (already set)
   - A GitHub Actions workflow runs the tests, builds, and publishes `dist/` with
     `actions/deploy-pages`
   - **The repository will be public, so CSV exports must never be committed.** `.gitignore`
     already excludes `*.csv` except the test fixtures, which contain only made-up data.

## Privacy notes

- Email data (names, snippets, login codes) only exists in Gmail, the private spreadsheet and the
  browser's IndexedDB. CSV files are git-ignored.
- The test data (`src/lib/__fixtures__/emails.ts`, the script's `testClassify`) is invented from the
  shapes of real emails, with no personal names or addresses.
- Never publish the spreadsheet to the web or share it by link.
