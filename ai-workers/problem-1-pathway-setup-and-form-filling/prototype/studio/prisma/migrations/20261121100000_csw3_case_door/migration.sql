-- CS-W3 part 1 (Release 1 row R1.3; brief build-lead-c-briefs/CS-W3-1.md; spec: design/cs-w3-spike-2026-11-16.md "Part 1's
-- brief lines"; case-side contract v0.1 §8 step 5b; P-575, P-588 (4)): the case side's door finds a request's firm before
-- it can read anything, because the walls (CS-W4) hide every case row while no firm is set. Four narrow lookups, each
-- returning nothing but a firm id, beside CS-W1's case_lookup.case_firm_id_of_key (same schema, owner, search_path and
-- grants). Functions, grants and one policy only: no table changes.
--   * case_lookup.case_firm_of_case(case_id): the firm of one case (a simulated client's request names its case).
--   * case_lookup.case_firm_of_link(token_hash): the firm of a link's case, by the link's token hash (open, send a code,
--     verify: before a session exists). Through person_link.case_id, so no firm_id on the link tables is needed.
--   * case_lookup.case_firm_of_link_session(token_hash): the firm of a link session's case (session → link → case).
--   * case_lookup.case_firm_of_client(actor): the firm of a simulated client's cases. More than one firm raises
--     cardinality_violation (21000), which the door answers 409: a client whose cases sit in two firms needs a real
--     client sign-in to choose (Build Lead C's ruling 1; a prototype stand-in mechanic, not a product rule). None: null.
--   * Owner xr_case_lookup (NOLOGIN, owns no table, NOBYPASSRLS; PF-12's role, made by CS-W1 where missing). FORCE binds a
--     table's owner too, so a function owned by the migration role would read nothing once CS-W4 forces the walls; the
--     role reads past them only through policies TO xr_case_lookup. EXECUTE to xr_data (xr_app and the bypass role),
--     never PUBLIC. search_path pinned, pg_temp last.
--   * Column grants: exactly what the functions read. runtime_case (id, firm_id, client_actor_id); person_link (id,
--     token_hash, case_id) (id: the session's link_id joins on it); person_link_session (token_hash, link_id).
--   * One role-only policy FOR SELECT TO xr_case_lookup USING (true) on each table the lookups read: runtime_case,
--     person_link, person_link_session. Each does nothing until a wall is forced on its table (CS-W4; CS-W2 part links for
--     the link tables), and then keeps the lookups working whichever of those lands first, as CS-W1 makes its role
--     wherever it is missing (a deviation from the brief, which left the link tables' two to CS-W2: said in the PR).
-- Rollback (in this order): DROP POLICY case_lookup_read ON runtime_case, ON person_link, ON person_link_session; DROP FUNCTION case_lookup.case_firm_of_case(uuid),
--   case_lookup.case_firm_of_link(text), case_lookup.case_firm_of_link_session(text), case_lookup.case_firm_of_client(text);
--   REVOKE SELECT (id, firm_id, client_actor_id) ON runtime_case FROM xr_case_lookup; REVOKE SELECT (id, token_hash, case_id)
--   ON person_link FROM xr_case_lookup; REVOKE SELECT (token_hash, link_id) ON person_link_session FROM xr_case_lookup;
--   then delete this folder's row from _prisma_migrations. Nothing is stored here, so nothing is lost.

GRANT SELECT (id, firm_id, client_actor_id) ON runtime_case TO xr_case_lookup;
GRANT SELECT (id, token_hash, case_id) ON person_link TO xr_case_lookup;
GRANT SELECT (token_hash, link_id) ON person_link_session TO xr_case_lookup;
CREATE POLICY case_lookup_read ON runtime_case FOR SELECT TO xr_case_lookup USING (true);
CREATE POLICY case_lookup_read ON person_link FOR SELECT TO xr_case_lookup USING (true);
CREATE POLICY case_lookup_read ON person_link_session FOR SELECT TO xr_case_lookup USING (true);

-- OR REPLACE: a reset that drops only public (Prisma's shadow database) keeps the case_lookup schema and its functions.
CREATE OR REPLACE FUNCTION case_lookup.case_firm_of_case(case_id uuid) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, case_lookup, pg_temp
  AS $fn$ SELECT c.firm_id FROM public.runtime_case c WHERE c.id = $1 $fn$;

CREATE OR REPLACE FUNCTION case_lookup.case_firm_of_link(token_hash text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, case_lookup, pg_temp
  AS $fn$ SELECT c.firm_id FROM public.person_link l JOIN public.runtime_case c ON c.id = l.case_id WHERE l.token_hash = $1 $fn$;

CREATE OR REPLACE FUNCTION case_lookup.case_firm_of_link_session(token_hash text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, case_lookup, pg_temp
  AS $fn$ SELECT c.firm_id FROM public.person_link_session s JOIN public.person_link l ON l.id = s.link_id
            JOIN public.runtime_case c ON c.id = l.case_id WHERE s.token_hash = $1 $fn$;

CREATE OR REPLACE FUNCTION case_lookup.case_firm_of_client(actor text) RETURNS uuid
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, case_lookup, pg_temp AS $fn$
DECLARE firms uuid[];
BEGIN
  SELECT array_agg(DISTINCT c.firm_id) INTO firms FROM public.runtime_case c WHERE c.client_actor_id = $1 AND c.firm_id IS NOT NULL;
  IF coalesce(cardinality(firms), 0) > 1 THEN
    RAISE EXCEPTION 'case_firm_of_client: this client''s cases are in more than one firm' USING ERRCODE = '21000';
  END IF;
  RETURN firms[1];
END $fn$;

DO $own$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['case_lookup.case_firm_of_case(uuid)', 'case_lookup.case_firm_of_link(text)',
    'case_lookup.case_firm_of_link_session(text)', 'case_lookup.case_firm_of_client(text)'] LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO xr_case_lookup', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO xr_data', f);
  END LOOP;
END $own$;
