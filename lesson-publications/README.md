# Automatic Firestore lesson publishing

Each new lesson requires TWO repository files:
1. A standalone HTML file at repository root, for example `rescue_english_200.html`.
2. A JSON metadata file in this directory, for example `lesson-publications/rescue_english_200.json`:

```json
{
  "title": "消防救護英文 200 單字",
  "category": "消防救護英文",
  "file": "rescue_english_200.html"
}
```

Once both files are committed to `main`, GitHub Actions publishes the lesson's
title, category and public URL to the Firestore `publishedLessons` collection.

## One-time owner setup

In your GitHub repository: Settings -> Secrets and variables -> Actions ->
New repository secret; Name: `FIREBASE_SERVICE_ACCOUNT_JSON`.
The value is the JSON key of a *dedicated* Firebase/Google Cloud service account
restricted to writing the Firestore lesson documents in the project
`english-learning-app-461d8`. Limit who can change workflows and metadata;
a GitHub Actions secret permits the workflow to act with its Google Cloud roles.

Generate the key using the Google Cloud console; NEVER commit or paste a key in
a conversation, issue, code file, or public page. Prefer short-lived
Workload Identity Federation in a future version.

GitHub Actions uses a server credential, so Firestore's client-side security
rules are not changed. The existing visitor read access remains the same.

## Safety / behavior

- Publishing is triggered only by changes in `lesson-publications/**/*.json`,
  or manually from the Actions page.
- Script validates the name of each HTML file and confirms it exists in root.
- Re-publishing an existing filename updates its existing Firestore document.
- It does not delete Firestore documents when metadata is removed.
- It does not alter `index.html`, `cloud.js`, `service-worker.js`, or
  existing HTML lessons.
- GitHub Pages deployment and Firestore publication may complete at different
  times; users should open new links after Pages completes deployment.
