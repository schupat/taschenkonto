#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only intercept git commit commands
if ! echo "$COMMAND" | grep -q 'git commit'; then
  exit 0
fi

echo "Pre-commit checks running..." >&2

# Check for inline event handlers (CSP violation)
HANDLERS=$(grep -rn 'onclick\|onsubmit\|onchange\|onload\|onerror' src/ --include='*.tsx' --include='*.jsx' --include='*.html' 2>/dev/null)
if [ -n "$HANDLERS" ]; then
  echo "ERROR: Inline event handlers found (CSP violation):" >&2
  echo "$HANDLERS" >&2
  exit 2
fi

# Run build
npm run build >&2 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: Build failed. Fix errors before committing." >&2
  exit 2
fi

echo "Pre-commit checks passed." >&2
exit 0
