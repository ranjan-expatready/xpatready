#!/bin/bash
# qa C6.5: reader coverage on the walked case's release (read-only SQL on qa's own copy; P-437's test). Usage: coverage.sh <db> <combination id> <version>
psql -h 127.0.0.1 -p 54329 -U xr_studio -d "$1" -XAtq -c "select t->>'key', t->'supplies_facts', t->'reader_profile'->>'readerKind', t->'reader_profile'->>'identityDocument' from config_release r, jsonb_array_elements(r.snapshot->'document_types') t where r.combination_id='$2' and r.version=$3 order by 1"
psql -h 127.0.0.1 -p 54329 -U xr_studio -d "$1" -XAtq -c "select 'document types on the release: ' || jsonb_array_length(snapshot->'document_types') from config_release where combination_id='$2' and version=$3"
