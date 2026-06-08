# 🚀 Vercel Deployment Guide - RetailTrove

Complete step-by-step guide to deploy RetailTrove on Vercel with Supabase PostgreSQL.

---

## Prerequisites

✅ **Required:**
- GitHub account
- Vercel account (free tier works)
- Supabase project (already set up)
- Your repository pushed to GitHub

✅ **Already Configured:**
- Supabase database schema imported
- Environment variables ready
- Server code Supabase-compatible

---

## Step 1: Push to GitHub

If you haven't already pushed your code to GitHub:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment with Supabase"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/JonathanMwangiMaina/RetailTrove.git

# Push to main branch
git push -u origin main
```

---

## Step 2: Create Vercel Account & Import Project

### 2.1 Sign Up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (recommended)
4. Authorize Vercel to access your GitHub account

### 2.2 Import Your Repository
1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Find **"RetailTrove"** in the list
4. Click **"Import"**

---

## Step 3: Configure Project Settings

### 3.1 Framework Preset
- **Framework Preset:** Other (or leave as detected)
- Vercel will auto-detect from `package.json`

### 3.2 Build & Output Settings

**Root Directory:** `./` (leave as default)

**Build Command:**
```bash
npm run vercel-build
```

**Output Directory:** `dist/public`

**Install Command:** `npm install` (auto-detected)

### 3.3 Node.js Version
- **Node Version:** 20.x (set in Project Settings after creation)

---

## Step 4: Configure Environment Variables

In the Vercel project settings, add these environment variables:

### Required Variables

| Variable | Value | Where to Get It |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:BeMyGuest@2001@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres` | Your Supabase connection string |
| `PGHOST` | `db.bdkvujsvyttdzbiwexks.supabase.co` | Supabase project host |
| `PGPORT` | `5432` | Standard PostgreSQL port |
| `PGDATABASE` | `postgres` | Database name |
| `PGUSER` | `postgres` | Database user |
| `PGPASSWORD` | `BeMyGuest@2001` | Your Supabase password |
| `NODE_ENV` | `production` | Environment identifier |
| `SESSION_SECRET` | `LFTUb7/lJDYY65WIFVO/z66Wz6KwnJpio23R/Lfg1KG3GeThH1LF6xJmFN6u96ga0d2qt/1VRTv+EWeHyB/A+w==` | From your .env file |

### How to Add Environment Variables

1. In Vercel dashboard, go to your project
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in sidebar
4. For each variable:
   - Enter **Key** (e.g., `DATABASE_URL`)
   - Enter **Value** (your actual value)
   - Select environments: **Production**, **Preview**, **Development** (check all)
   - Click **"Add"**

**🔒 Security Note:** Never commit these values to Git. Vercel stores them securely.

---

## Step 5: Deploy

### 5.1 Initial Deployment
1. After configuring environment variables, click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Run `npm run vercel-build` (builds frontend)
   - Deploy your application
3. Wait 2-5 minutes for first deployment

### 5.2 Check Deployment Status
- **Building:** Green progress bar
- **Success:** ✅ with deployment URL
- **Failed:** ❌ with error logs (see troubleshooting below)

---

## Step 6: Verify Deployment

### 6.1 Access Your Application
1. Click the deployment URL (e.g., `https://retailtrove.vercel.app`)
2. You should see the RetailTrove homepage

### 6.2 Test Functionality
- [ ] Homepage loads with featured products
- [ ] Navigation works (Shop, About, Contact)
- [ ] Product search works
- [ ] Shopping cart opens and works
- [ ] Products can be added to cart
- [ ] Checkout form loads
- [ ] Login page loads (should work once database is seeded)

### 6.3 Check Database Connection
1. Try to browse products - if they load, database connection is working
2. Try to add item to cart - if successful, writes are working

---

## Step 7: Seed the Database

Your database schema is imported but needs data. Run seeding from your deployed Vercel app:

### Option A: Trigger on First Access
The server attempts to seed on startup. Access your Vercel URL - the first request may be slow while seeding runs.

### Option B: Manual Seeding (Recommended)
Run seeding from your local machine connected to Supabase:

```bash
# On your local machine with the repository
npm install

# Set environment variable
export DATABASE_URL="postgresql://postgres:BeMyGuest@2001@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres"

# Run seed directly
node --loader tsx server/seed-db.ts
```

### Option C: Use Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Run seed command remotely
vercel env pull .env.local
node --loader tsx server/seed-db.ts
```

---

## Step 8: Configure Custom Domain (Optional)

### 8.1 Add Domain
1. In Vercel dashboard, go to **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain (e.g., `retailtrove.com`)
4. Follow DNS configuration instructions

### 8.2 DNS Configuration
Add these records to your domain provider:

**For root domain (retailtrove.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 8.3 SSL Certificate
- Vercel automatically provisions SSL certificates
- HTTPS will be enabled within minutes

---

## Step 9: Set Up Continuous Deployment

### 9.1 Automatic Deployments
Vercel automatically deploys on every push to `main` branch:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically builds and deploys
```

### 9.2 Preview Deployments
- Every pull request gets a unique preview URL
- Test changes before merging to main
- Perfect for collaboration

### 9.3 Deployment Protection (Optional)
1. Go to **Settings** → **Deployment Protection**
2. Enable **"Vercel Authentication"** for staging/preview deployments
3. Require login to view non-production deployments

---

## Troubleshooting

### Build Fails with "Module not found"

**Problem:** Missing dependencies

**Solution:**
```bash
# Locally, ensure all deps are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Database Connection Errors

**Problem:** Environment variables not set or incorrect

**Solution:**
1. Go to Vercel **Settings** → **Environment Variables**
2. Verify `DATABASE_URL` is correct
3. Test connection string locally first
4. Redeploy after adding/updating variables

### 500 Errors on API Routes

**Problem:** Server-side errors

**Solution:**
1. Check **Vercel Logs** in dashboard
2. Go to **Deployments** → Click deployment → **Functions**
3. View error logs for specific routes
4. Common issues:
   - Database not seeded → Run seeding
   - Missing environment variables → Add them
   - Code errors → Check logs for stack traces

### "This Serverless Function has crashed"

**Problem:** Server initialization failure

**Solution:**
1. Check if all environment variables are set
2. Verify `DATABASE_URL` format is correct
3. Check Vercel function logs for specific error
4. Ensure Node.js version is set to 20.x

### Products Not Loading

**Problem:** Database not seeded

**Solution:**
- Run seeding as described in Step 7
- Check Supabase dashboard to verify tables have data
- Check Vercel logs for database connection errors

### Cart/Login Not Working

**Problem:** Session management or authentication issues

**Solution:**
1. Verify `SESSION_SECRET` is set in environment variables
2. Check that cookies are enabled in browser
3. For authentication errors, check if `users` table exists and has data

---

## Performance Optimization

### Enable Edge Functions (Optional)
1. Vercel Edge Functions are faster than Serverless Functions
2. For static content, consider Edge Network caching

### Configure Caching Headers
Already configured in the application for:
- Static assets (images, CSS, JS): cached for 1 year
- API responses: no caching (dynamic data)

### Monitor Performance
1. Vercel **Analytics** tab shows:
   - Page load times
   - Core Web Vitals
   - Real user monitoring
2. Enable in **Settings** → **Analytics** (free on Pro plan)

---

## Security Checklist

Before going live:

- [ ] All environment variables are set
- [ ] `SESSION_SECRET` is unique and strong
- [ ] Database password is secure
- [ ] No secrets in Git repository
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Supabase RLS policies enabled (see Phase 1 in PROJECT_COMPLETION_PLAN.md)
- [ ] Admin routes protected (implement in Phase 1)
- [ ] Rate limiting configured (implement in Phase 3)

---

## Cost Considerations

### Vercel Free Tier Limits
- ✅ 100 GB bandwidth/month
- ✅ Unlimited personal projects
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Edge Network

**Will RetailTrove fit?**
- Yes, for development and early launch
- Monitor bandwidth usage in Vercel dashboard
- Upgrade to Pro ($20/month) when needed

### Supabase Free Tier Limits
- ✅ 500 MB database
- ✅ 2 GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ Automatic backups

**Will RetailTrove fit?**
- Yes, for development and moderate traffic
- 38 products + users = ~5 MB
- Monitor in Supabase dashboard

---

## Going to Production

When ready for real customers:

### 1. Complete Phase 1 (Authentication)
- Implement Supabase Auth
- Add role-based access control
- Protect admin routes

### 2. Complete Phase 2 (Payments)
- Integrate Lemon Squeezy
- Integrate M-Pesa
- Remove test payment methods

### 3. Complete Phase 3 (Hardening)
- Add security headers
- Implement rate limiting
- Add error monitoring (Sentry)
- Complete test suite

### 4. Legal Requirements
- Terms of Service page
- Privacy Policy page
- Cookie consent
- GDPR compliance

### 5. Launch Checklist
- [ ] All phases complete
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Database backed up
- [ ] Error monitoring active
- [ ] Performance tested
- [ ] Security audit passed
- [ ] Legal pages published

---

## Useful Vercel Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link local project to Vercel project
vercel link

# Deploy from local (like git push)
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs [deployment-url]

# Pull environment variables
vercel env pull .env.local

# Add environment variable
vercel env add DATABASE_URL
```

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Discord:** https://vercel.com/discord
- **GitHub Issues:** Create an issue in your repository

---

## Next Steps After Deployment

1. ✅ **Verify application is accessible**
2. ✅ **Seed the database**
3. ✅ **Test all user flows**
4. 📋 **Begin Phase 1 implementation** (see PROJECT_COMPLETION_PLAN.md)
5. 🔐 **Implement authentication**
6. 💳 **Integrate payment providers**
7. 🚀 **Launch to users!**

---

**Deployment Configuration Complete!**

Your RetailTrove application is ready to deploy on Vercel. Follow the steps above to go live.

**Current Status:**
- ✅ Vercel configuration files created
- ✅ Build scripts configured
- ✅ Environment variables documented
- ✅ Deployment guide written

**Files Created:**
- `vercel.json` - Vercel deployment configuration
- `.vercelignore` - Files to exclude from deployment
- `VERCEL_DEPLOYMENT.md` - This comprehensive guide

**Ready to Deploy:** Yes! Follow Step 2 to begin.
