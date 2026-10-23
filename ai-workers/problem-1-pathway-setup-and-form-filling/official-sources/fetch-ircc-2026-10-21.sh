#!/bin/bash
# Superseded by fetch_official_sources.py (P-31); kept so the earlier command still works.
exec python3 "$(dirname "$0")/fetch_official_sources.py" "$@"
