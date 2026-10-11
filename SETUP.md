# Setup: "Update from Gmail" button

One-time setup so the app can run the export script for you, with your Google account only.
Takes about 15 minutes.

## How it works and what keeps it private

```
[Continue with Google] → sign-in popup (your account only)
[Update from Gmail]    → Apps Script API runs runExport() as you
                    → script reads Gmail (read-only), updates your private spreadsheet
                    → rows come back to the app → stored in this browser only
```

| Protection | What it does |
|---|---|
| OAuth app in **Testing** mode, with only your address as a test user | Google refuses to sign in any other account |
| Script deployment **"Only myself"** (`executionApi.access: MYSELF`), run in `devMode` | Only the script's owner (you) can run it through the API |
| Optional allowed-account check (`VITE_ALLOWED_EMAIL`) | The app also refuses any other account |
| Read-only Gmail scope; token kept in memory only, **revoked on Sign out**, expires within an hour | The app never holds a lasting credential and can't change your mail |
| Data stored in this browser (IndexedDB) only | Nothing goes to GitHub or any server; "Remove data from this browser" deletes it |
| Content Security Policy on the published site | The page only loads its own code and Google's sign-in, and only talks to Google |
| `*.csv` and `.env` in `.gitignore` | No email data in the public repo. The client ID and Script ID are in the published JavaScript; they are identifiers, not credentials, and are useless without your Google sign-in |

Keep the spreadsheet private: never use **File → Share → Publish to the web**, and don't share it by link.

## 1. Google Cloud project

1. Go to <https://console.cloud.google.com/> and create a project, e.g. `jobs-tracker`.
2. Note its **project number** (Dashboard → Project info). You need it in step 4.
3. **APIs & Services → Library**: enable **Apps Script API** and **Gmail API**.

## 2. OAuth consent screen

In **Google Auth Platform** (or **APIs & Services → OAuth consent screen**):

1. User type **External**. Fill in an app name and your email.
2. **Audience**: leave the publishing status as **Testing**. Under **Test users**, add **only your Gmail address**.
3. **Data access** (optional while testing): add the scopes `gmail.readonly`, `spreadsheets`, `openid`, `email`.

Because the app isn't verified, Google shows "Google hasn't verified this app" at sign-in.
That's expected for your own app: choose **Continue**.

## 3. OAuth client ID

**Credentials → Create credentials → OAuth client ID**:

1. Type **Web application**.
2. **Authorized JavaScript origins**:
   - `http://localhost:5173` (development)
   - `https://<your-github-user>.github.io` (once published)
3. No redirect URIs are needed. Copy the **Client ID**.

## 4. Apps Script project

Open the spreadsheet → **Extensions → Apps Script**, then:

1. **Project Settings** → tick **Show "appsscript.json" manifest file in editor**.
2. Replace `appsscript.json` with [`apps-script/appsscript.json`](apps-script/appsscript.json), and the code
   with [`apps-script/exportJobEmails.gs`](apps-script/exportJobEmails.gs). Save.
   (The manifest turns on the Gmail service; if the editor asks, add **Services → Gmail API**.)
3. **Project Settings → Google Cloud Platform (GCP) Project → Change project**: enter the project
   number from step 1. The script and the OAuth client must share a project, or the API call is refused.
4. Run **testClassify** (should log "All passed"), then **testGmailAccess** and allow the permissions.
   This also remembers which spreadsheet to write to.
5. Turn on **Google Apps Script API** at <https://script.google.com/home/usersettings>.

## 5. API deployment

1. **Deploy → New deployment → Select type → API Executable**.
2. **Who has access: Only myself** → **Deploy**.
3. **Project Settings → IDs**: copy the **Script ID**.

The app runs the latest *saved* code (`devMode`), so later script edits don't need a new deployment.

## 6. The app

1. `npm install`, then `npm run dev` and open <http://localhost:5173/my-jobs-tracker/>.
2. Copy `.env.example` to `.env` and fill in the Client ID and the Script ID. `VITE_ALLOWED_EMAIL` is
   optional: the test-user list already limits sign-in, and the address would be readable on the published site.
   Restart `npm run dev` after changing `.env`.
3. Click **Continue with Google**, then **Update from Gmail**, and wait (a run takes up to a minute or two).

## 7. GitHub Pages

The deploy workflow builds with repository variables (not secrets: the values end up in the
published JavaScript anyway). Set them once from your `.env`:

```bash
gh variable set -f .env
```

or in GitHub: **Settings → Secrets and variables → Actions → Variables**. Without them the build stops
with "Missing VITE_…", and the site that's already published stays as it is.

Also add `https://<your-github-user>.github.io` to the OAuth client's origins (step 3).

## Troubleshooting

The app shows the error from Google plus a hint. The usual causes:

| Message contains | Fix |
|---|---|
| `has not been used` / `disabled` | Step 1.3: enable the Apps Script API (and Gmail API) in the Cloud project |
| `User has not enabled the Apps Script API` | Step 4.5 |
| `not found` | Wrong Script ID, or no API Executable deployment (step 5) |
| `Script function not found: runExport` | The API reached a script, but that script has no `runExport`. Check the three causes listed below this table |
| `PERMISSION_DENIED` | The script isn't linked to the Cloud project (step 4.3) |
| `access_denied` / `not allowed` at sign-in | Your address isn't a test user (step 2.2), or `VITE_ALLOWED_EMAIL` is different |
| `Missing configuration` / `Missing VITE_…` | Create `.env` from `.env.example` (step 6), or set the repository variables (step 7) |
| `origin` / `redirect_uri_mismatch` | Add the page's origin to the OAuth client (step 3.2) |

### `Script function not found: runExport`

1. **Wrong `VITE_APPS_SCRIPT_ID`.** Use the **Script ID** from Project Settings → IDs. A deployment ID
   (starts with `AKfycb…`) won't work, and neither will the ID of another copy of the script.
   Open the Apps Script project from the spreadsheet (Extensions → Apps Script) so you get the right one.
2. **Code not saved.** The app runs the latest *saved* code. Paste the whole new
   `exportJobEmails.gs`, press Save (Ctrl+S), and check the editor's function dropdown lists `runExport`.
3. **Old code in another file.** If the project has more than one `.gs` file, delete the old copy, so
   only one file defines these functions.
