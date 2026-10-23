"""Compare an already-built dist with public bytes; this does not prove gameplay acceptance."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--source-sha', required=True, help='Exact source SHA separately verified in deployment UI')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = Path(args.output).resolve()
    report = {'checkedAtUtc': datetime.now(timezone.utc).isoformat(), 'url': args.url,
              'sourceSha': args.source_sha, 'shaProvenance': 'Supplied from separately inspected deployment UI; not inferred from HTTP.',
              'scope': 'Byte equality only; actual gameplay and human acceptance are separate gates.', 'files': []}
    for file in sorted((root / 'dist').rglob('*')):
        if not file.is_file():
            continue
        relative = file.relative_to(root / 'dist').as_posix()
        url = urljoin(args.url.rstrip('/') + '/', quote(relative))
        entry = {'path': relative, 'localSha256': hashlib.sha256(file.read_bytes()).hexdigest()}
        try:
            with urlopen(Request(url, headers={'Accept-Encoding': 'identity', 'User-Agent': 'CutlassWake-ReleaseVerification/1.0'}), timeout=30) as response:
                data = response.read()
                entry.update(status=response.status, remoteSha256=hashlib.sha256(data).hexdigest(), bytes=len(data))
                entry['matches'] = entry['localSha256'] == entry['remoteSha256']
        except Exception as error:
            entry.update(matches=False, error=str(error))
        report['files'].append(entry)
    report['passed'] = bool(report['files']) and all(item['matches'] for item in report['files'])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'files': len(report['files']),
                      'mismatches': [item['path'] for item in report['files'] if not item['matches']],
                      'output': str(output)}, ensure_ascii=False))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
