import pg from "pg";

export interface DbOrderItem {
  productId: number;
  productName: string | null;
  price: string | null;
  quantity: number;
}

export interface DbOrder {
  id: number;
  total: string;
  paymentStatus: string;
  paymentProvider: string | null;
  mpesaReceiptNumber: string | null;
  items: DbOrderItem[];
}

/**
 * Reads an order and its `order_items` rows directly from Supabase Postgres.
 *
 * This is the DB-level proof that the checkout persisted the order, the line
 * items, and the M-Pesa callback's payment outcome. `rejectUnauthorized` is
 * disabled because the CA in `.env` does not match the pooler host's chain
 * when connecting from WSL (the app itself reaches Supabase from Vercel).
 */
export async function fetchOrderFromSupabase(orderId: number): Promise<DbOrder> {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  try {
    const order = await pool.query(
      `select
         id,
         total,
         payment_status     as "paymentStatus",
         payment_provider   as "paymentProvider",
         mpesa_receipt_number as "mpesaReceiptNumber"
       from orders
       where id = $1`,
      [orderId],
    );
    if (order.rows.length === 0) {
      throw new Error(`Order id=${orderId} not found in Supabase (orders table)`);
    }
    const items = await pool.query(
      `select
         product_id   as "productId",
         product_name as "productName",
         price,
         quantity
       from order_items
       where order_id = $1
       order by id`,
      [orderId],
    );
    return { ...order.rows[0], items: items.rows };
  } finally {
    await pool.end();
  }
}

export interface PurchaseFindings {
  orderId: number;
  loyalty: {
    accountExists: boolean;
    points: number;
    tier: string;
    transactionForOrder: boolean;
  };
  productStockAfter: number | null;
  today: {
    ordersCreated: number;
    paidOrders: number;
    paidRevenue: number;
  };
}

/**
 * Reads the post-purchase side effects directly from Supabase Postgres:
 * the vendor's loyalty account/transaction for this order, the product's
 * remaining stock (should be qty-sold less), and today's aggregate order +
 * paid-revenue totals (a DB-level proxy for the admin analytics dashboard).
 */
export async function fetchPurchaseFindings(
  orderId: number,
  productId: number,
): Promise<PurchaseFindings> {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  try {
    const [loyalty, tx, stock, today] = await Promise.all([
      pool.query(
        `select la.points, la.tier
           from loyalty_accounts la
           join users u on u.id = la.user_id
           join orders o on o.user_id = u.auth_user_id
          where o.id = $1`,
        [orderId],
      ),
      pool.query(
        `select count(*)::int as awarded
           from loyalty_transactions
          where order_id = $1 and points > 0`,
        [orderId],
      ),
      pool.query(`select stock_quantity as "stock" from products where id = $1`, [productId]),
      pool.query(
        `select
           count(*)::int as "ordersCreated",
           count(*) filter (where payment_status = 'paid')::int as "paidOrders",
           coalesce(sum(total) filter (where payment_status = 'paid'), 0)::numeric as "paidRevenue"
         from orders
         where created_at >= date_trunc('day', now())`,
      ),
    ]);
    return {
      orderId,
      loyalty: {
        accountExists: loyalty.rows.length > 0,
        points: Number(loyalty.rows[0]?.points ?? 0),
        tier: String(loyalty.rows[0]?.tier ?? "none"),
        transactionForOrder: Number(tx.rows[0]?.awarded ?? 0) > 0,
      },
      productStockAfter: stock.rows[0]?.stock ?? null,
      today: {
        ordersCreated: Number(today.rows[0].ordersCreated),
        paidOrders: Number(today.rows[0].paidOrders),
        paidRevenue: Number(today.rows[0].paidRevenue),
      },
    };
  } finally {
    await pool.end();
  }
}
