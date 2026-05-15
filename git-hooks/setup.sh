#!/usr/bin/env bash
set -euo pipefail

# Symlink git-hooks/ into .git/hooks/
HOOKS_DIR="$(git rev-parse --show-toplevel)/git-hooks"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

for hook in "$HOOKS_DIR"/*; do
  hook_name=$(basename "$hook")
  [ "$hook_name" = "setup.sh" ] && continue
  ln -sf "$hook" "$GIT_HOOKS_DIR/$hook_name"
  echo "Linked $hook_name"
done

echo "Git hooks installed."
