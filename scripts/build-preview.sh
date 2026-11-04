#!/usr/bin/env bash
# Builds a static, host-anywhere copy of the site into ./preview (for sharing the demo).
# Share images, manifest, robots and sitemap are server routes, so they're set aside during this build.
set -euo pipefail
cd "$(dirname "$0")/.."
STASH=$(mktemp -d)
restore() { (cd "$STASH" && find . -type f) | while read -r f; do mkdir -p "app/$(dirname "$f")"; mv "$STASH/$f" "app/$f"; done; rm -rf "$STASH"; }
trap restore EXIT
(cd app && find . -name 'opengraph-image.tsx' -o -name 'twitter-image.tsx' -o -name 'manifest.ts' -o -name 'robots.ts' -o -name 'sitemap.ts') | while read -r f; do mkdir -p "$STASH/$(dirname "$f")"; mv "app/$f" "$STASH/$f"; done
rm -rf out preview
NEXT_PUBLIC_STATIC_EXPORT=1 npx next build
mv out preview
# make every asset path relative so the folder works from any URL
find preview -name '*.html' -o -name '*.txt' | xargs sed -i -E 's#(["( ])/(_next|icons|mock)/#\1\2/#g; s#"/(icon\.svg|apple-icon\.png|manifest\.webmanifest)#"\1#g'
find preview -name '*.css' | xargs sed -i -E 's#url\(/_next/static/media/#url(../media/#g'
find preview -name '*.js' | xargs sed -i -E 's#"/_next/#"_next/#g; s#"/mock/#"mock/#g'
echo "Preview ready in ./preview"
# some static hosts reserve names starting with "_": move _next → nx
mv preview/_next preview/nx
find preview \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.txt' \) -print0 | xargs -0 sed -i -E 's#(^|[^a-zA-Z0-9])_next/#\1nx/#g'
# escape literal U+FFFD characters in JS (some hosts reject them) — same meaning inside strings/regexes
python3 - <<'PY'
import glob
for f in glob.glob("preview/nx/static/chunks/*.js"):
    s = open(f, encoding="utf-8").read()
    if "�" in s:
        open(f, "w", encoding="utf-8").write(s.replace("�", "\\uFFFD"))
PY
