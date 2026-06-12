# ✅ Vercel Deployment Checklist

Quick reference checklist for deploying RetailTrove to Vercel.

---

## Pre-Deployment

- [x] Code committed to Git
- [x] Repository pushed to GitHub
- [x] Supabase database schema imported
- [x] Database connection string tested
- [x] All secrets documented (not in code)

---

## Vercel Setup

- [x] Vercel account created
- [x] GitHub connected to Vercel
- [x] Repository imported to Vercel
- [x] Framework preset configured
- [x] Build command set: `npm run vercel-build`
- [x] Output directory set: `dist/public`
- [x] Node.js version set: 24.x

---

## Environment Variables

Copy these to Vercel **Settings** → **Environment Variables**:

- [x] `DATABASE_URL` = `postgresql://postgres:@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres`
- [x] `PGHOST` = `db.bdkvujsvyttdzbiwexks.supabase.co`
- [x] `PGPORT` = `5432`
- [x] `PGDATABASE` = `postgres`
- [x] `PGUSER` = `postgres`
- [x] `PGPASSWORD` = ``
- [x] `SESSION_SECRET` = ``

**Tip:** Check all three environments (Production, Preview, Development) for each variable.

---

## First Deployment

- [x] Clicked "Deploy" in Vercel
- [x] Build succeeded (green checkmark)
- [x] Deployment URL accessible
- [ ] No 500 errors on homepage

---

## Post-Deployment Testing

- [x] Homepage loads
- [ ] Products display (if seeded)
- [x] Navigation works (Shop, About, Contact)
- [ ] Search functionality works
- [ ] Cart drawer opens
- [ ] Add to cart works
- [ ] Checkout form loads
- [ ] No console errors in browser

---

## Database Seeding

Choose one method:

**Method A: Automatic (on first request)**
- [ ] Access deployment URL
- [ ] Wait for first request to seed database
- [ ] Refresh page to see products

**Method B: Manual from local machine**
```bash
export DATABASE_URL="postgresql://postgres:@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres"
node --loader tsx server/seed-db.ts
```
- [ ] Seeding completed successfully
- [ ] Verified products in Supabase Table Editor

**Method C: Vercel CLI**
```bash
vercel env pull .env.local
node --loader tsx server/seed-db.ts
```
- [ ] Environment variables pulled
- [ ] Seeding completed

---

## Verification

- [ ] Featured products visible on homepage
- [ ] New arrivals section populated
- [ ] Shop page shows all products
- [ ] Product detail pages work
- [ ] Cart persists items
- [ ] Footer displays correctly
- [ ] Mobile responsive design works

---

## Optional: Custom Domain

- [ ] Domain purchased/ready
- [ ] DNS records configured:
  - [ ] A record: `@` → `8.8.8.8`
  - [ ] CNAME: `www` → `cname.vercel-dns.com`
- [ ] Domain added in Vercel
- [ ] SSL certificate provisioned (automatic)
- [ ] HTTPS works

---

## Monitoring

- [ ] Bookmarked Vercel dashboard
- [ ] Checked deployment logs (no errors)
- [ ] Tested from different devices
- [ ] Tested from different networks
- [ ] Monitored Supabase usage

---

## Next Phase

After successful deployment:

- [ ] Reviewed PROJECT_COMPLETION_PLAN.md
- [ ] Identified Phase 1 tasks
- [ ] Ready to implement authentication
- [ ] Scheduled time for Phase 1 (2-3 weeks)

---

## Troubleshooting Done?

If you encountered issues:

- [x] Checked Vercel function logs
- [x] Verified environment variables
- [ ] Tested database connection locally
- [x] Reviewed VERCEL_DEPLOYMENT.md troubleshooting section
- [x] Redeployed after fixes

---

## Launch Readiness (For Later)

Not needed now, but before real launch:

- [ ] Phase 1 complete (Authentication)
- [ ] Phase 2 complete (Payments)
- [ ] Phase 3 complete (Hardening)
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Security audit passed
- [ ] Performance tested
- [ ] Backup strategy in place

---

**Current Status:** Ready to deploy ✅

**Next Action:** Follow VERCEL_DEPLOYMENT.md Step 1

**Estimated Time:** 30-45 minutes for first deployment
