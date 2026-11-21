#!/usr/bin/env bash
# PF-8b F3: the self-signed certificate for no-domain staging (`-c xr:domain=none`; README "No-domain mode"). It generates
# a key and a certificate for *.ca-central-1.elb.amazonaws.com in a temporary folder outside the repository, imports them
# into ACM in ca-central-1, prints the ARN for `-c xr:certArn=<arn>`, and deletes the folder: the private key exists only
# in ACM and is never written into git. Browsers warn on a self-signed certificate (curl needs -k): this is for the
# R1.13 and R1.15 proofs until the staging domain exists (R1.24 waits for it).
#   bash deploy/cdk/bin/self-signed-cert.sh [--dry-run]     (--dry-run: generate and show the certificate, import nothing)
# Needs openssl, and for the import the AWS CLI signed in to the founder's account (the AWS session runs it, never a lane).
set -euo pipefail
REGION=ca-central-1
NAME="*.${REGION}.elb.amazonaws.com"
DAYS=90   # Sample: re-run and redeploy with the new ARN before it ends
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1
[ $# -le 1 ] && { [ $# -eq 0 ] || [ "$DRY" = 1 ]; } || { echo "usage: $0 [--dry-run]" >&2; exit 2; }
command -v openssl >/dev/null || { echo "openssl is needed" >&2; exit 2; }

WORK=$(mktemp -d "${TMPDIR:-/tmp}/xr-self-signed.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days "$DAYS" -keyout "$WORK/key.pem" -out "$WORK/cert.pem" \
  -subj "/CN=${NAME}/O=Expat Ready staging (self-signed)" -addext "subjectAltName=DNS:${NAME}" 2>"$WORK/openssl.err" \
  || { cat "$WORK/openssl.err" >&2; echo "openssl could not make the certificate (LibreSSL on a Mac may lack -addext: use Homebrew's openssl)" >&2; exit 1; }
openssl x509 -in "$WORK/cert.pem" -noout -subject -enddate -ext subjectAltName >&2

if [ "$DRY" = 1 ]; then echo "dry run: nothing imported; the key is deleted with $WORK" >&2; exit 0; fi
command -v aws >/dev/null || { echo "the AWS CLI is needed for the import (or use --dry-run)" >&2; exit 2; }
ARN=$(aws acm import-certificate --region "$REGION" --certificate "fileb://$WORK/cert.pem" --private-key "fileb://$WORK/key.pem" \
  --tags Key=project,Value=expat-ready Key=purpose,Value=staging-no-domain --query CertificateArn --output text)
[[ "$ARN" =~ ^arn:aws:acm:ca-central-1:[0-9]{12}:certificate/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] \
  || { echo "unexpected answer from ACM: $ARN (a certificate may have been imported: check ACM in ca-central-1)" >&2; exit 1; }
echo "$ARN"
