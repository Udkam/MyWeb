"""Verify the published SpriteLab release with anonymous, TLS-verified GETs.

Usage: python tests/verify_release.py <expected-40-character-source-commit>
Run only after deployment. There is no retry loop; the first failure stops checks.
The evidence goes to .qa/production-release.json and is never uploaded.
"""
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener
import argparse
import json
import re
import ssl
import sys


BASE = "https://foreseer.site/spritelab/"
REPORT_PATH = Path(__file__).resolve().parent.parent / ".qa" / "production-release.json"
EXPECTED_FILES = {
    "app.js", "core.js", "favicon.svg", "index.html", "io.js", "stage.js",
    "styles.css", "templates.js", "vendor/fflate.js", "vendor/LICENSE-fflate.txt",
    "vendor/NOTICE.md",
}
EXPECTED_TITLE = "SpriteLab · 像素动作工坊"
MAX_RUNTIME_BYTES = 8 * 1024 * 1024


class VerificationError(Exception):
    pass


class PageIdentity(HTMLParser):
    def __init__(self):
        super().__init__()
        self.language = None
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "html":
            self.language = dict(attrs).get("lang")
        elif tag == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, text):
        if self.in_title:
            self.title += text


class RecordedRedirects(HTTPRedirectHandler):
    """Record redirects, refusing off-site or non-HTTPS destinations."""
    def __init__(self):
        super().__init__()
        self.events = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        destination = urljoin(req.full_url, newurl)
        parsed = urlsplit(destination)
        if parsed.scheme != "https" or parsed.netloc != "foreseer.site":
            raise VerificationError("Redirect left the expected HTTPS origin")
        self.events.append({"from": req.full_url, "to": destination, "status": code})
        return super().redirect_request(req, fp, code, msg, headers, destination)


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def source_commit(value):
    if not re.fullmatch(r"[0-9a-fA-F]{40}", value):
        raise argparse.ArgumentTypeError("expected source commit must be a complete 40-character hexadecimal SHA")
    return value.lower()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_commit", type=source_commit, help="expected independent SpriteLab source commit")
    args = parser.parse_args()
    report = {
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "baseURL": BASE, "expectedSourceCommit": args.source_commit,
        "anonymous": True, "tlsCertificateVerification": True,
        "passed": False, "requests": [], "checks": [], "files": [],
    }
    redirects = RecordedRedirects()
    # No cookie jar, login, authorization header, private browser profile, or TLS bypass.
    opener = build_opener(HTTPSHandler(context=ssl.create_default_context()), redirects)

    def fetch(url, limit):
        before = len(redirects.events)
        entry = {"url": url}
        report["requests"].append(entry)
        request = Request(url, headers={
            "User-Agent": "SpriteLab-Release-Verification/1.0",
            "Accept-Encoding": "identity", "Cache-Control": "no-cache",
        })
        try:
            with opener.open(request, timeout=30) as response:
                entry.update({"status": response.status, "finalURL": response.url,
                              "contentType": response.headers.get("Content-Type", "")})
                require(response.status == 200, f"Expected HTTP 200: {url}")
                data = response.read(limit + 1)
                require(len(data) <= limit, f"Response exceeds size limit: {url}")
                entry["bytes"] = len(data)
                entry["sha256"] = sha256(data).hexdigest()
                return data, entry
        except HTTPError as error:
            entry["status"] = error.code
            raise VerificationError(f"HTTP {error.code}: {url}") from error
        except URLError as error:
            raise VerificationError(f"Connection or TLS validation failed for {url}: {error.reason}") from error
        finally:
            entry["redirects"] = redirects.events[before:]

    try:
        raw, manifest_request = fetch(BASE + "release.json", 128 * 1024)
        require(manifest_request["finalURL"] == BASE + "release.json", "release.json unexpectedly redirected")
        manifest = json.loads(raw.decode("utf-8"))
        require(isinstance(manifest, dict), "Release manifest must be an object")
        require(manifest.get("title") == "SpriteLab", "Release title does not identify SpriteLab")
        require(manifest.get("sourceCommit") == args.source_commit, "Production source commit does not match the expected source commit")
        report["sourceCommit"] = manifest["sourceCommit"]
        report["checks"].append("exact expected source commit")
        files = manifest.get("files")
        require(isinstance(files, list) and len(files) == 11, "Manifest must contain exactly 11 runtime resources")
        names = [item.get("file") if isinstance(item, dict) else None for item in files]
        require(all(isinstance(name, str) for name in names), "Runtime resource paths must be strings")
        require(len(set(names)) == 11 and set(names) == EXPECTED_FILES, "Manifest runtime paths differ from the exact expected 11 resources")
        report["checks"].append("exact 11-resource manifest")
        for item in files:
            name, expected_bytes, expected_hash = item["file"], item.get("bytes"), item.get("sha256")
            require(type(expected_bytes) is int and 0 < expected_bytes <= MAX_RUNTIME_BYTES, f"Invalid manifest byte length: {name}")
            require(isinstance(expected_hash, str) and re.fullmatch(r"[0-9a-f]{64}", expected_hash), f"Invalid manifest SHA-256: {name}")
            _, result = fetch(BASE + name, expected_bytes)
            asset = {"file": name, "expectedBytes": expected_bytes, "actualBytes": result["bytes"],
                     "expectedSha256": expected_hash, "actualSha256": result["sha256"],
                     "status": result["status"], "finalURL": result["finalURL"]}
            asset["passed"] = result["bytes"] == expected_bytes and result["sha256"] == expected_hash
            report["files"].append(asset)
            require(asset["passed"], f"Runtime resource bytes or SHA-256 mismatch: {name}")
        report["checks"].append("all 11 anonymous runtime resources match manifest bytes and SHA-256")

        html_bytes, page_request = fetch(BASE, 1024 * 1024)
        require(page_request["finalURL"] == BASE, "Canonical editor URL unexpectedly redirected")
        require("text/html" in page_request["contentType"].lower(), "Canonical page is not served as HTML")
        html = PageIdentity()
        html.feed(html_bytes.decode("utf-8"))
        require(html.title.strip() == EXPECTED_TITLE, "Production HTML title differs from the editor title")
        require(html.language == "zh-CN", "Production HTML language must be zh-CN")
        index_hash = next(item["sha256"] for item in files if item["file"] == "index.html")
        require(sha256(html_bytes).hexdigest() == index_hash, "Canonical page differs from released index.html")
        report["html"] = {"title": html.title.strip(), "language": html.language, "status": page_request["status"]}
        report["checks"].append("anonymous canonical HTTP 200 HTML, exact title, zh-CN, released index bytes")

        _, directory = fetch(BASE.rstrip("/"), 1024 * 1024)
        events = directory["redirects"]
        require(events and events[0]["from"] == BASE.rstrip("/") and events[0]["to"] == BASE,
                "Directory URL must redirect directly to /spritelab/")
        require(events[0]["status"] in (301, 302, 303, 307, 308) and directory["finalURL"] == BASE,
                "Directory redirect did not finish at the canonical HTTPS editor")
        require(directory["sha256"] == index_hash, "Directory redirect returned different HTML")
        report["checks"].append("/spritelab redirects to /spritelab/ and serves the released editor")
        report["passed"] = True
    except (VerificationError, ValueError, UnicodeError, OSError) as error:
        report["error"] = str(error)
    finally:
        report["finishedAt"] = datetime.now(timezone.utc).isoformat()
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "verifiedFiles": len(report["files"]),
                      "evidence": str(REPORT_PATH), **({"error": report["error"]} if "error" in report else {})}, ensure_ascii=False))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
