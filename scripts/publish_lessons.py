#!/usr/bin/env python3
"""Publish declared repository-root HTML lessons to Firestore via REST API.

Runs only in trusted GitHub Actions. Never put service-account JSON in the repo.
"""
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import quote

from google.oauth2 import service_account
from google.auth.transport.requests import Request as AuthRequest

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "lesson-publications"
PROJECT_ID = "english-learning-app-461d8"
BASE_URL = "https://english-learning-tw.github.io/english-learning-app/"
FILE_PATTERN = re.compile(r"^[A-Za-z0-9_-]+\.html?$")
FIELDS = ("title", "category", "url", "updatedAt", "publisherUid")


def fail(message):
    raise ValueError(message)


def declared_lessons():
    for metadata in sorted(LESSONS.glob("*.json")):
        info = json.loads(metadata.read_text(encoding="utf-8"))
        if not isinstance(info, dict):
            fail(f"{metadata.name}: expected a JSON object")
        title, category, filename = (info.get(key) for key in ("title", "category", "file"))
        if not isinstance(title, str) or not title.strip() or len(title) > 150:
            fail(f"{metadata.name}: missing/invalid title")
        if not isinstance(category, str) or not category.strip() or len(category) > 80:
            fail(f"{metadata.name}: missing/invalid category")
        if not isinstance(filename, str) or not FILE_PATTERN.fullmatch(filename):
            fail(f"{metadata.name}: invalid HTML filename")
        html = ROOT / filename
        if not html.is_file() or not html.stat().st_size or html.stat().st_size > 3 * 1024 * 1024:
            fail(f"{metadata.name}: HTML must exist in repo root and be 1 byte to 3 MB")
        yield metadata.name, filename, {
            "title": title.strip(),
            "category": category.strip(),
            "url": BASE_URL + filename,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "publisherUid": "github-actions",
        }


def publish(token, filename, fields):
    document_id = "github-" + filename.rsplit(".", 1)[0]
    base = (f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/"
            f"databases/(default)/documents/publishedLessons/{quote(document_id, safe='')}")
    masks = "&".join("updateMask.fieldPaths=" + key for key in FIELDS)
    body = {"fields": {key: {"stringValue": fields[key]} for key in FIELDS}}
    req = Request(base + "?" + masks, data=json.dumps(body).encode("utf-8"),
                  headers={"Authorization": "Bearer " + token,
                           "Content-Type": "application/json"}, method="PATCH")
    try:
        with urlopen(req, timeout=30) as response:
            if response.status not in (200, 201):
                fail(f"Firestore unexpectedly returned {response.status}")
    except HTTPError as err:
        fail(f"Firestore HTTP {err.code}: {err.read(1000).decode('utf-8', 'replace')}")


def main():
    lessons = list(declared_lessons())
    if not lessons:
        print("No lesson-publications/*.json files found. Nothing to publish.")
        return
    payload = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if not payload:
        fail("Missing FIREBASE_SERVICE_ACCOUNT_JSON Actions secret")
    info = json.loads(payload)
    if info.get("project_id") != PROJECT_ID:
        fail("Service account does not belong to expected Firebase project")
    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/datastore"]
    )
    credentials.refresh(AuthRequest())
    for metadata, filename, fields in lessons:
        publish(credentials.token, filename, fields)
        print(f"Published {metadata} -> {filename}")
    print(f"Successfully published {len(lessons)} HTML lesson(s).")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
