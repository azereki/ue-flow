#!/usr/bin/env bash
#
# setup-repo-protections.sh
#
# Configures GitHub repository protections for azereki/ue-flow
# and optionally makes the repo public.
#
# Prerequisites:
#   - gh CLI installed and authenticated: gh auth login
#   - You must be a repo admin
#
# Usage:
#   ./scripts/setup-repo-protections.sh           # apply protections only
#   ./scripts/setup-repo-protections.sh --public   # apply protections + make repo public
#
set -euo pipefail

REPO="azereki/ue-flow"
GO_PUBLIC=false

for arg in "$@"; do
  case "$arg" in
    --public) GO_PUBLIC=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "=== Setting up repository protections for $REPO ==="
echo ""

# ─── 1. Make repo public (if requested) — must happen before security features ─
if [ "$GO_PUBLIC" = true ]; then
  echo "▸ Making repository public..."
  gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
  echo "  ✓ Repository is now public"
fi

# ─── 2. Branch protection: main ──────────────────────────────────────────────
echo "▸ Protecting 'main' branch..."
gh api --method PUT "repos/$REPO/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build", "python-tests", "lint", "e2e-tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true
}
EOF
echo "  ✓ main branch protected"

# ─── 3. Branch protection: dev ────────────────────────────────────────────────
echo "▸ Protecting 'dev' branch..."
gh api --method PUT "repos/$REPO/branches/dev/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["build", "python-tests"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false
}
EOF
echo "  ✓ dev branch protected"

# ─── 4. Tag protection ───────────────────────────────────────────────────────
echo "▸ Protecting tags matching 'v*'..."
gh api --method POST "repos/$REPO/tags/protection" \
  --field pattern='v*' 2>/dev/null \
  && echo "  ✓ Tag protection rule created" \
  || echo "  ⚠ Tag protection may already exist or requires GitHub Pro"

# ─── 5. Repository settings ──────────────────────────────────────────────────
echo "▸ Hardening repository settings..."
gh api --method PATCH "repos/$REPO" \
  --input - <<'EOF'
{
  "has_wiki": false,
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": true,
  "delete_branch_on_merge": true,
  "allow_auto_merge": false,
  "allow_update_branch": true
}
EOF
echo "  ✓ Repository settings hardened"

# ─── 6. Security features (require public repo on free plan) ─────────────────
echo "▸ Enabling secret scanning..."
if gh api --method PATCH "repos/$REPO" \
  --input - <<'EOF' 2>/dev/null
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
EOF
then
  echo "  ✓ Secret scanning enabled"
else
  echo "  ⚠ Secret scanning not available (requires public repo or GitHub Advanced Security)"
fi

echo "▸ Enabling vulnerability alerts (Dependabot)..."
gh api --method PUT "repos/$REPO/vulnerability-alerts" 2>/dev/null \
  && echo "  ✓ Vulnerability alerts enabled" \
  || echo "  ⚠ Could not enable vulnerability alerts"

echo "▸ Enabling automated security fixes..."
gh api --method PUT "repos/$REPO/automated-security-fixes" 2>/dev/null \
  && echo "  ✓ Automated security fixes enabled" \
  || echo "  ⚠ Could not enable automated security fixes"

echo ""
echo "=== Repository protections configured! ==="
echo ""
echo "Summary of protections:"
if [ "$GO_PUBLIC" = true ]; then
  echo "  • Visibility: PUBLIC"
fi
echo "  • main: PRs required, 1 review, code owner review, all CI must pass, no force push"
echo "  • dev:  PRs required, 1 review, build + python-tests must pass, no force push"
echo "  • Tags: v* pattern protected (admin-only creation)"
echo "  • Repo: squash/rebase merge only, auto-delete branches, wiki disabled"
echo "  • Security: secret scanning, push protection, Dependabot alerts + auto-fixes"
echo ""
echo "Verify protections: gh api repos/$REPO/branches/main/protection | jq '.'"
