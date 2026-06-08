# ✅ Vercel Deployment Checklist

Quick reference checklist for deploying RetailTrove to Vercel.

---

## Pre-Deployment

- [ ] Code committed to Git
- [ ] Repository pushed to GitHub
- [ ] Supabase database schema imported
- [ ] Database connection string tested
- [ ] All secrets documented (not in code)

---

## Vercel Setup

- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] Repository imported to Vercel
- [ ] Framework preset configured
- [ ] Build command set: `npm run vercel-build`
- [ ] Output directory set: `dist/public`
- [ ] Node.js version set: 20.x

---

## Environment Variables

Copy these to Vercel **Settings** → **Environment Variables**:

- [ ] `DATABASE_URL` = `postgresql://postgres:BeMyGuest@2001@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres`
- [ ] `PGHOST` = `db.bdkvujsvyttdzbiwexks.supabase.co`
- [ ] `PGPORT` = `5432`
- [ ] `PGDATABASE` = `postgres`
- [ ] `PGUSER` = `postgres`
- [ ] `PGPASSWORD` = `BeMyGuest@2001`
- [ ] `NODE_ENV` = `production`
- [ ] `SESSION_SECRET` = `LFTUb7/lJDYY65WIFVO/z66Wz6KwnJpio23R/Lfg1KG3GeThH1LF6xJmFN6u96ga0d2qt/1VRTv+EWeHyB/A+w==`

**Tip:** Check all three environments (Production, Preview, Development) for each variable.

---

## First Deployment

- [ ] Clicked "Deploy" in Vercel
- [ ] Build succeeded (green checkmark)
- [ ] Deployment URL accessible
- [ ] No 500 errors on homepage

---

## Post-Deployment Testing

- [ ] Homepage loads
- [ ] Products display (if seeded)
- [ ] Navigation works (Shop, About, Contact)
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
export DATABASE_URL="postgresql://postgres:BeMyGuest@2001@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres"
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
  - [ ] A record: `@` → `76.76.21.21`
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

- [ ] Checked Vercel function logs
- [ ] Verified environment variables
- [ ] Tested database connection locally
- [ ] Reviewed VERCEL_DEPLOYMENT.md troubleshooting section
- [ ] Redeployed after fixes

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
