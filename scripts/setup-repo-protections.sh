#!/usr/bin/env bash
#
# setup-repo-protections.sh
#
# Configures GitHub repository protections for azereki/ue-flow.
# Run this after making the repo public.
#
# Prerequisites:
#   - gh CLI installed and authenticated: gh auth login
#   - You must be a repo admin
#
# Usage:
#   ./scripts/setup-repo-protections.sh
#
set -euo pipefail

REPO="azereki/ue-flow"

echo "=== Setting up repository protections for $REPO ==="
echo ""

# ─── 1. Branch protection: main ──────────────────────────────────────────────
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

# ─── 2. Branch protection: dev ────────────────────────────────────────────────
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

# ─── 3. Tag protection ───────────────────────────────────────────────────────
echo "▸ Protecting tags matching 'v*'..."
gh api --method POST "repos/$REPO/tags/protection" \
  --field pattern='v*' 2>/dev/null \
  && echo "  ✓ Tag protection rule created" \
  || echo "  ⚠ Tag protection may already exist or requires GitHub Pro"

# ─── 4. Repository settings ──────────────────────────────────────────────────
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
  "allow_update_branch": true,
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
EOF
echo "  ✓ Repository settings hardened"

# ─── 5. Enable vulnerability alerts ──────────────────────────────────────────
echo "▸ Enabling vulnerability alerts (Dependabot)..."
gh api --method PUT "repos/$REPO/vulnerability-alerts" 2>/dev/null \
  && echo "  ✓ Vulnerability alerts enabled" \
  || echo "  ⚠ Could not enable vulnerability alerts"

# ─── 6. Enable automated security fixes ──────────────────────────────────────
echo "▸ Enabling automated security fixes..."
gh api --method PUT "repos/$REPO/automated-security-fixes" 2>/dev/null \
  && echo "  ✓ Automated security fixes enabled" \
  || echo "  ⚠ Could not enable automated security fixes"

echo ""
echo "=== Repository protections configured! ==="
echo ""
echo "Summary of protections:"
echo "  • main: PRs required, 1 review, code owner review, all CI must pass, no force push"
echo "  • dev:  PRs required, 1 review, build + python-tests must pass, no force push"
echo "  • Tags: v* pattern protected (admin-only creation)"
echo "  • Repo: squash/rebase merge only, auto-delete branches, wiki disabled"
echo "  • Security: secret scanning, push protection, Dependabot alerts + auto-fixes"
echo ""
echo "Next steps:"
echo "  1. Make the repo public:  gh repo edit $REPO --visibility public"
echo "  2. Verify protections:    gh api repos/$REPO/branches/main/protection | jq '.'"
