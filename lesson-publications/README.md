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

## One-time owner setup (keyless OIDC)

The repository uses GitHub Actions OIDC and Google Workload Identity Federation.
No service-account JSON key or GitHub secret is needed.

- Workload Identity Pool: `github-actions-pool`
- Provider: `github-actions`
- Service account: `english-learning-publisher@english-learning-app-461d8.iam.gserviceaccount.com`
- Project number: `781857177241`

The provider must restrict access to the trusted GitHub repository and `main`
branch; the service account must grant `roles/iam.workloadIdentityUser` to
that repository's `google.subject` identity. It currently has `Cloud Datastore
User`, which provides broader Firestore permissions than one collection.
Protect write access to the GitHub `main` branch and the workflow files.

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
