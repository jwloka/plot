#!/bin/sh
# GIT_ASKPASS helper for plot-writer-push.mjs. git calls this with ONE prompt
# string as $1 ("Username for '...'" or "Password for '...'") and reads the
# answer from stdout — never from argv — so the Writer app installation token
# reaches git only through PLOT_WRITER_TOKEN, an environment variable this
# script's parent sets for this child alone.
case "$1" in
  Username*) echo "x-access-token" ;;
  Password*) echo "$PLOT_WRITER_TOKEN" ;;
esac
