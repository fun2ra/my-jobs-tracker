# My Jobs Tracker

A personal dashboard for keeping track of job applications, built from the emails they generate.

When you apply for many jobs, the updates are scattered across your inbox: confirmations from job
sites, "we've reviewed your application", interview invitations, assessments, rejections. Each update
often arrives as a new conversation, so Gmail alone can't tell you where each application stands.

This app reads those emails and groups them into **applications** (company + role, or a shared job
reference number). For each application it shows the current **stage** (applied, viewed, assessment,
interview, rejected, offer), the source (LinkedIn, Indeed, InfoJobs, …), whether something needs your
action, and which applications have had no reply for a while.

## How it works

```
[Continue with Google] → sign-in (your account only)
[Update from Gmail]    → Apps Script reads Gmail (read-only) and updates a private spreadsheet
                       → the emails come back to the app → stored in your browser only
```

- [`apps-script/exportJobEmails.gs`](apps-script/exportJobEmails.gs): a Google Apps Script that searches
  Gmail for job-related emails, classifies each one (applied, rejected, interview, …) and guesses the
  company and role.
- [`src/`](src/): a React + TypeScript web app with no backend. It calls the script through the
  Apps Script API, groups the emails into applications and shows them. A CSV download from the
  spreadsheet also works as a fallback.

## Privacy

The code is public; the data is not.

- No emails or CSV exports are in this repo (`*.csv` and `.env` are git-ignored). The test data is invented.
- Sign-in is limited to one Google account, Gmail access is read-only, and the token stays in memory: it is revoked on sign-out and expires within an hour.
- Emails are stored only in your browser's IndexedDB, and the app can delete them.
- The Google client ID and Script ID come from environment variables (`.env`, see `.env.example`).
  They end up in the published JavaScript, which is fine: they are identifiers, not credentials.

## Getting started

```bash
npm install
npm run dev     # http://localhost:5173/my-jobs-tracker/
npm test
npm run build
```

Copy `.env.example` to `.env` and follow the one-time Google setup in [SETUP.md](SETUP.md).

The logic lives in two hooks, so the UI only renders: `useAuth` (Continue with Google, sign out,
session expiry) and `useJobs` (stored emails, grouped applications, Update from Gmail, CSV import).

## Status

Sign-in, getting emails from Gmail, classifying them and grouping them into applications work, and
every push to `main` publishes to GitHub Pages. Still to come: the UI (filterable table, dashboard)
and manual corrections.
See [PLAN.md](PLAN.md).
