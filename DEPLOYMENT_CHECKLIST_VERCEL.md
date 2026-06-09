# Vercel Deployment Checklist ✅

## 🚀 Current Deployment Status

**Commit**: `f2f326d`
**Changes**: Full-stack configuration (static frontend + serverless backend)

---

## ✅ Pre-Deployment (Completed)

- [x] Created `api/index.ts` serverless function entry point
- [x] Updated `vercel.json` for hybrid deployment
- [x] Fixed security vulnerabilities (SQL injection in drizzle-orm)
- [x] Tested build locally (successful)
- [x] Committed and pushed to GitHub
- [x] Environment variables set in Vercel dashboard

---

## 📋 Monitor Deployment (In Progress)

### Watch for These in Vercel Dashboard:

1. **Build Logs** - Check for:
   - ✅ `vite build` completes successfully
   - ✅ `api/index.ts` compiles without errors
   - ⚠️ No "MODULE_NOT_FOUND" errors
   - ⚠️ No TypeScript compilation errors

2. **Function Deployment**:
   - ✅ Serverless function created at `/api/index.ts`
   - ✅ Function size reasonable (<50MB)
   - ✅ No timeout during initialization

3. **Static Assets**:
   - ✅ Frontend files deployed to CDN
   - ✅ `dist/public/index.html` exists
   - ✅ Asset files (JS, CSS) uploaded

---

## 🧪 Post-Deployment Testing

### Once Deployment Completes:

#### 1. **Frontend (Static)**
```bash
# Visit your Vercel URL
https://[your-app].vercel.app/

Expected: Homepage loads without errors
```

**Checklist**:
- [ ] Page loads (no 500 error)
- [ ] No console errors in browser DevTools
- [ ] Images and CSS load correctly
- [ ] Navigation works

#### 2. **Backend API (Serverless)**
```bash
# Open browser DevTools → Network tab
# Then interact with the site
```

**Test These Endpoints**:
- [ ] `/api/products` - Should return product list (200 OK)
- [ ] `/api/categories` - Should return categories (200 OK)
- [ ] `/api/newsletter/subscribe` - POST with email should work
- [ ] Check Network tab: All `/api/*` calls return 200 (not 500)

#### 3. **Database Connection**
- [ ] Products display on homepage (from Supabase)
- [ ] Can add items to cart
- [ ] Cart persists across page refreshes
- [ ] Product details pages load

#### 4. **Newsletter & Email**
- [ ] Newsletter form accepts email
- [ ] Toast notification shows success
- [ ] Welcome email arrives in inbox (check spam)
- [ ] Verify in Resend dashboard
- [ ] Check Supabase `newsletter_subscribers` table

---

## 🔍 Common Issues & Solutions

### Issue 1: Still Getting 500 Errors

**Possible Causes**:
1. Environment variables not set correctly
2. Database connection failing
3. Serverless function timeout

**Debug Steps**:
```bash
# 1. Check Function Logs
Vercel Dashboard → Functions → Latest Invocation → View Logs

# 2. Look for specific errors:
- "DATABASE_URL must be set" → Check env vars
- "getaddrinfo ENOTFOUND" → Database host unreachable
- "Timeout" → Function taking too long to initialize
```

**Solutions**:
- Verify env vars in Vercel: Settings → Environment Variables
- Check Supabase database is online and accessible
- Review function logs for specific error messages

### Issue 2: Frontend Loads but API Calls Fail

**Symptoms**: Homepage shows but products don't load

**Debug**:
- Open browser DevTools → Network tab
- Look for failed `/api/*` requests
- Check response body for error message

**Solutions**:
- Ensure `api/index.ts` deployed successfully
- Check function logs in Vercel dashboard
- Verify routing in `vercel.json` is correct

### Issue 3: Database Connection Errors

**Error**: `Error: getaddrinfo ENOTFOUND db.xxx.supabase.co`

**Solutions**:
- Verify `DATABASE_URL` environment variable is correct
- Check Supabase project is not paused
- Test connection from Supabase SQL editor
- Ensure IP restrictions allow Vercel (if any)

---

## 📊 Performance Monitoring

### Expected Metrics:

**Frontend (Static)**:
- First Load: ~630 KB total
- Time to Interactive: <3 seconds
- Lighthouse Score: 90+ (Performance)

**Backend (Serverless)**:
- Cold Start: 1-2 seconds (first request after idle)
- Warm Requests: 50-200ms
- Database Queries: 10-50ms each

**Monitor in Vercel**:
- Analytics → Speed
- Functions → Invocations
- Logs → Real-time function logs

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ Homepage loads without errors
2. ✅ All product images display
3. ✅ Can browse categories
4. ✅ Shopping cart functionality works
5. ✅ Newsletter subscription sends email
6. ✅ No 500 errors in Network tab
7. ✅ Database queries execute successfully
8. ✅ Function logs show successful initialization

---

## 🆘 If Issues Persist

### Get Help:

1. **Check Vercel Function Logs**:
   ```
   Vercel Dashboard → [Your Project] → Functions → View Logs
   ```

2. **Check Build Logs**:
   ```
   Vercel Dashboard → [Your Project] → Deployments → [Latest] → Build Logs
   ```

3. **Verify Environment Variables**:
   ```
   Settings → Environment Variables
   Ensure all 3 are set for "Production"
   ```

4. **Test Database Connection**:
   ```
   Supabase Dashboard → SQL Editor
   Run: SELECT COUNT(*) FROM products;
   Should return product count
   ```

5. **Share Logs**:
   If issues continue, copy:
   - Function error logs
   - Build error logs
   - Network tab errors from browser
   - Specific error messages

---

## 📝 Configuration Summary

**Architecture**: Hybrid (Static Frontend + Serverless Backend)

**Frontend**:
- Built with: Vite
- Output: `dist/public/`
- Served from: Vercel CDN

**Backend**:
- Entry: `api/index.ts`
- Runtime: Node.js 20.x
- Includes: `server/**`, `shared/**`
- Handles: `/api/*` routes

**Database**: Supabase PostgreSQL

**Email**: Resend API

**Environment Variables** (Set in Vercel):
- `DATABASE_URL`
- `SESSION_SECRET`
- `RESEND_API_KEY`

---

**Last Updated**: June 9, 2026
**Status**: Deployment in progress
**Next Step**: Monitor Vercel dashboard for completion
