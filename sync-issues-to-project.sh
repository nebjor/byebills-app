#!/usr/bin/env bash
# Ensures EVERY open issue in the repo is in Project #1.
# Safe to re-run — adding an issue that's already in the project is a no-op.
#
# Run:
#   bash sync-issues-to-project.sh

set -e
OWNER="nebjor"
PROJECT=1
REPO="nebjor/byebills-app"

echo "Open issues in $REPO:"
GH_HOST=github.com gh issue list --repo "$REPO" --state open --limit 100 \
  --json number,title --jq '.[] | "  #\(.number)  \(.title)"'

echo
echo "Adding each to project #$PROJECT ..."
for url in $(GH_HOST=github.com gh issue list --repo "$REPO" --state open --limit 100 --json url --jq '.[].url'); do
  GH_HOST=github.com gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" >/dev/null && echo "  ✓ $url"
done

echo
echo "Project item count:"
GH_HOST=github.com gh project item-list "$PROJECT" --owner "$OWNER" --limit 200 --format json \
  --jq '.items | length'
