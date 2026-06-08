# ✅ Supabase Migration Checklist

Use this checklist to track your migration progress.

## Pre-Migration

- [ ] Read `SUPABASE_MIGRATION_GUIDE.md`
- [ ] Backup files created in `backup/migration-20260608/`
- [ ] Migration SQL ready: `migrations/0000_famous_firebird.sql`

## Supabase Setup

- [ ] Created Supabase account
- [ ] Created new project
- [ ] Saved database password securely
- [ ] Noted project reference ID

## Database Schema Migration

- [ ] Opened Supabase SQL Editor
- [ ] Copied content from `migrations/0000_famous_firebird.sql`
- [ ] Ran SQL successfully (no errors)
- [ ] Verified 10 tables created in Table Editor:
  - [ ] users
  - [ ] products
  - [ ] cart_items
  - [ ] orders
  - [ ] order_items
  - [ ] banner_settings
  - [ ] site_content
  - [ ] site_settings
  - [ ] faqs
  - [ ] user_visits

## Connection Configuration

- [ ] Copied Supabase connection string (URI format)
- [ ] Replaced `[YOUR-PASSWORD]` with actual password
- [ ] Updated `.env` file with new `DATABASE_URL`
- [ ] (Optional) Added `SUPABASE_URL` to `.env`
- [ ] (Optional) Added `SUPABASE_ANON_KEY` to `.env`
- [ ] (Optional) Added `SUPABASE_SERVICE_ROLE_KEY` to `.env`

## Code Updates

- [ ] Installed `pg` package: `npm install pg`
- [ ] Installed type definitions: `npm install --save-dev @types/pg`
- [ ] Updated `server/db.ts`:
  - [ ] Changed import from `@neondatabase/serverless` to `pg`
  - [ ] Changed import from `drizzle-orm/neon-serverless` to `drizzle-orm/node-postgres`
  - [ ] Removed `neonConfig` and `ws` imports
  - [ ] Updated Pool configuration
- [ ] Re-enabled database initialization in `server/index.ts` (lines 63-76)
- [ ] (Optional) Uninstalled Neon packages:
  ```bash
  npm uninstall @neondatabase/serverless ws @types/ws
  ```

## Testing

- [ ] Killed old development server
- [ ] Restarted server: `npm run dev`
- [ ] Server starts without errors
- [ ] Logs show "Database initialized successfully"
- [ ] No "ENOTFOUND helium" errors
- [ ] Server running on port 5173

## Verification in Supabase

- [ ] Opened Supabase Table Editor
- [ ] `users` table has admin user
- [ ] `products` table has sample products
- [ ] `banner_settings` has default banner
- [ ] `site_content` has CMS entries
- [ ] `site_settings` has configuration
- [ ] `faqs` has default questions
- [ ] Foreign key relationships visible in table relationships

## Application Testing

- [ ] Can access application via tunnel URL
- [ ] Homepage loads and displays products
- [ ] Can view product details
- [ ] Can add items to cart
- [ ] Authentication works (if implemented)
- [ ] Admin dashboard accessible (if implemented)
- [ ] No console errors related to database

## Cleanup

- [ ] Verified everything works
- [ ] Removed old `.env.example` references to Neon (optional)
- [ ] Updated documentation with Supabase info (optional)
- [ ] Committed changes to git:
  ```bash
  git add .
  git commit -m "Migrate from Neon to Supabase"
  ```

## Post-Migration (Optional Enhancements)

- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Set up Supabase Auth integration
- [ ] Configure Supabase Storage for product images
- [ ] Set up automated backups
- [ ] Add database indexes for performance
- [ ] Monitor query performance in Supabase dashboard
- [ ] Configure production environment variables
- [ ] Test production deployment

## Rollback Plan (If Needed)

If something goes wrong:

1. [ ] Stop the server
2. [ ] Restore `server/db.ts` from `backup/migration-20260608/db.ts`
3. [ ] Restore old `DATABASE_URL` in `.env`
4. [ ] Reinstall Neon packages: `npm install @neondatabase/serverless ws`
5. [ ] Restart server

---

## 📞 Support Resources

- **Full Guide**: `SUPABASE_MIGRATION_GUIDE.md`
- **Quick Start**: `MIGRATION_QUICK_START.md`
- **Seed Data Info**: `SEED_DATA_REFERENCE.md`
- **Supabase Docs**: https://supabase.com/docs
- **Drizzle + Supabase**: https://orm.drizzle.team/docs/get-started-postgresql#supabase

---

## ✨ Migration Complete!

Once all checkboxes are ticked, you've successfully migrated to Supabase! 🎉

Your database is now:
- ✅ Hosted on Supabase's reliable infrastructure
- ✅ Accessible via standard PostgreSQL connection
- ✅ Ready for additional Supabase features (Auth, Storage, Realtime)
- ✅ Backed by automated daily backups
- ✅ Monitored with built-in observability tools
