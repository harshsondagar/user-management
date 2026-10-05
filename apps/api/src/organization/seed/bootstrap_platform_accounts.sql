-- Run ONCE per environment (dev, staging, prod), against your actual app database
-- after pgledger is installed there. NOT idempotent as written — if you re-run it,
-- you'll get duplicate accounts with the same name. Wrap in a existence-check if you
-- need to run this via a repeatable migration (see guarded version below).

-- (name, currency, allow_negative_balance, allow_positive_balance)

-- Source of all incoming viewer payments (Stripe holds the real cash; this just mirrors it)
SELECT *
FROM pgledger_create_account (
        'platform:stripe_clearing', 'USD', true, false
    );

-- Platform's realized 20% cut
SELECT *
FROM pgledger_create_account (
        'platform:revenue', 'USD', false, true
    );

-- Collected but not yet allocated to orgs (holds the 80% between payment and monthly settlement)
SELECT *
FROM pgledger_create_account (
        'platform:creator_pool', 'USD', false, true
    );

-- Historical total of everything ever paid out to orgs
SELECT *
FROM pgledger_create_account (
        'platform:payouts_paid', 'USD', false, true
    );

-- Copy the 4 returned `id` values (pgla_...) into your app config / env vars:
--   LEDGER_ACCT_STRIPE_CLEARING
--   LEDGER_ACCT_REVENUE
--   LEDGER_ACCT_CREATOR_POOL
--   LEDGER_ACCT_PAYOUTS_PAID

-- ============================================================
-- GUARDED VERSION — safe to run multiple times, skips existing accounts by name.
-- Prefer this one if this runs via your migration tool.
-- ============================================================

DO $$
DECLARE
  accounts text[][] := ARRAY[
    ['platform:stripe_clearing', 'true', 'false'],
    ['platform:revenue', 'false', 'true'],
    ['platform:creator_pool', 'false', 'true'],
    ['platform:payouts_paid', 'false', 'true']
  ];
  acc text[];
BEGIN
  FOREACH acc SLICE 1 IN ARRAY accounts LOOP
    IF NOT EXISTS (SELECT 1 FROM pgledger_accounts_view WHERE name = acc[1]) THEN
      PERFORM pgledger_create_account(acc[1], 'USD', acc[2]::boolean, acc[3]::boolean);
    END IF;
  END LOOP;
END $$;

-- Then fetch the ids to put in config:
SELECT DISTINCT
    ON (name) name,
    id
FROM pgledger_accounts_view
WHERE
    name LIKE 'platform:%'
ORDER BY name, version DESC;

-- Remove the stale org->ledger-account mapping so fresh accounts get created
DELETE FROM org_ledger_accounts
WHERE
    "organizationId" IN (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
    );

-- Remove ALL watch stats for these fake orgs, regardless of day/contentId
DELETE FROM watch_stats
WHERE
    "organizationId" IN (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
    );

DELETE FROM settlement_lines
WHERE
    "settlementRunId" IN (
        SELECT id
        FROM settlement_runs
        WHERE
            "periodStart" = '2099-01-01'
    );

DELETE FROM settlement_runs WHERE "periodStart" = '2099-01-01';

DELETE FROM payments WHERE "stripePaymentIntentId" LIKE 'pi_test_%';