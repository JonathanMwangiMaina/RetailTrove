-- 0032_add_client_request_key.sql
-- Order-creation idempotency key (distinct from orders.idempotency_key, which
-- guards payment callbacks). The client generates a UUID before POST /orders and
-- reuses it on retries so a timed-out request can never create duplicate orders.
--
-- The partial unique index only enforces uniqueness on rows that actually carry a
-- key; multiple NULLs remain allowed (legacy orders / non-idempotent clients).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_key text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_key_idx
  ON orders (client_request_key)
  WHERE client_request_key IS NOT NULL;
