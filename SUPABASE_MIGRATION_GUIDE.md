# Supabase Migration Guide for RetailTrove

This guide will help you migrate from Neon to Supabase while preserving your complete database structure.

## 📋 Overview

Your RetailTrove database has **10 tables** with the following structure:
- **users** - User accounts (customers, vendors, admins)
- **products** - Product catalog with vendor relationships
- **cart_items** - Shopping cart data
- **orders** - Customer orders
- **order_items** - Order line items
- **banner_settings** - Site banner configuration
- **site_content** - CMS content (About, Contact, ToS, etc.)
- **site_settings** - Site configuration (social links, etc.)
- **faqs** - FAQ system
- **user_visits** - Analytics/tracking data

---

## 🎯 Migration Steps

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in:
   - **Name**: RetailTrove (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Plan**: Free tier is fine for development
5. Click **"Create new project"** (takes ~2 minutes)

### Step 2: Get Your Supabase Connection String

Once your project is created:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"Database"** tab
3. Scroll to **"Connection string"** section
4. Select **"URI"** format
5. Copy the connection string (looks like):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
6. **Important**: Replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Import Database Schema to Supabase

You have two options:

#### Option A: Using Supabase SQL Editor (Recommended)

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the contents of `migrations/0000_famous_firebird.sql`
4. Paste into the SQL Editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. You should see: ✅ "Success. No rows returned"

#### Option B: Using Command Line

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR-PROJECT-REF

# Apply migrations
psql "YOUR_SUPABASE_CONNECTION_STRING" < migrations/0000_famous_firebird.sql
```

### Step 4: Update Environment Variables

Update your `.env` file:

```bash
# Replace the old Neon DATABASE_URL with your Supabase connection string
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Optional: Add Supabase-specific variables for future features
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key-from-supabase-settings
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-settings
```

**To get your Supabase keys:**
1. Go to **Project Settings** → **API**
2. Copy **Project URL** → `SUPABASE_URL`
3. Copy **anon public** key → `SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 5: Update Database Connection Code

The good news: **No code changes needed!**

Your current setup uses:
- `@neondatabase/serverless` with WebSocket
- Drizzle ORM

Supabase supports standard PostgreSQL connections, but for better performance with serverless, we should update to use Supabase's connection pooler.

**Current code (server/db.ts):**
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Updated for Supabase (recommended):**
```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Step 6: Install Required Dependencies

If updating to use standard PostgreSQL driver:

```bash
npm install pg
npm install --save-dev @types/pg
```

You can then optionally remove Neon-specific packages:
```bash
npm uninstall @neondatabase/serverless ws @types/ws
```

### Step 7: Re-enable Database Initialization

In `server/index.ts`, uncomment the database initialization code (lines 63-76).

### Step 8: Test the Migration

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Verify database connection:**
   - Server should start without errors
   - Check logs for "Database initialized successfully"

3. **Test in Supabase Dashboard:**
   - Go to **Table Editor** in Supabase
   - You should see all 10 tables
   - Check that mock data was seeded (users, products, etc.)

---

## 🔄 Optional: Migrate Existing Data

If you have existing data in your Neon database that you want to migrate:

### Option 1: Using pg_dump (if accessible)

```bash
# Export from Neon
pg_dump "postgresql://postgres:password@helium/heliumdb?sslmode=disable" > neon_backup.sql

# Import to Supabase
psql "YOUR_SUPABASE_CONNECTION_STRING" < neon_backup.sql
```

### Option 2: Manual Export/Import via Drizzle

Since you can't connect to "helium" from this environment, you would need to:
1. Run the export from an environment that CAN access the Neon database
2. Or manually export data using Neon's dashboard if available

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All 10 tables created in Supabase Table Editor
- [ ] Foreign key constraints working (check Relationships tab)
- [ ] Default admin user created (check users table)
- [ ] Sample products seeded (check products table)
- [ ] Server starts without errors
- [ ] Application functions correctly
- [ ] Authentication works
- [ ] Products display on homepage
- [ ] Shopping cart operations work

---

## 🎁 Bonus: Supabase Features You Can Use

Once migrated, you gain access to:

1. **Supabase Auth** - Built-in authentication system
   - Email/password, magic links, OAuth providers
   - Better than rolling your own

2. **Row Level Security (RLS)** - Database-level permissions
   - Protect user data at the database level
   - Example: Users can only see their own orders

3. **Storage** - File uploads for product images
   - Built-in CDN
   - Image transformations

4. **Real-time** - Live updates for order tracking
   - WebSocket subscriptions
   - No additional setup needed

5. **Dashboard** - Visual database management
   - Table editor, SQL editor
   - Logs and monitoring

---

## 🆘 Troubleshooting

### Connection Errors

**Error: "getaddrinfo ENOTFOUND"**
- Check your DATABASE_URL is correct
- Ensure you replaced `[YOUR-PASSWORD]` with actual password
- Verify your IP isn't blocked (Supabase allows all IPs by default)

**Error: "password authentication failed"**
- Double-check your password
- Ensure no special characters are breaking the URL (URL-encode if needed)

**Error: "relation does not exist"**
- Schema wasn't imported - revisit Step 3
- Run the migration SQL file

### SSL Issues

If you get SSL errors, add `?sslmode=require` to your connection string:
```
postgresql://user:pass@host:6543/postgres?sslmode=require
```

---

## 📝 Notes

- **Migration file location**: `migrations/0000_famous_firebird.sql`
- **Schema definition**: `shared/schema.ts`
- **Drizzle config**: `drizzle.config.ts`
- **Database connection**: `server/db.ts`

Your schema is already production-ready with:
✅ Proper foreign keys
✅ Sensible defaults
✅ Unique constraints
✅ Timestamps for audit trails
✅ Type safety with Drizzle + Zod

---

## 🚀 Next Steps After Migration

1. Enable Row Level Security for better security
2. Consider using Supabase Auth instead of custom auth
3. Set up automated backups in Supabase
4. Add indexes for frequently queried columns
5. Monitor query performance in Supabase dashboard

---

**Need help?** Check:
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- Your generated SQL: `migrations/0000_famous_firebird.sql`
