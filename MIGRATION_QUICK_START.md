# 🚀 Supabase Migration Quick Start

## TL;DR - 5 Minute Migration

### 1️⃣ Create Supabase Project
- Go to [supabase.com](https://supabase.com) → New Project
- Save your password!

### 2️⃣ Import Schema
- In Supabase: **SQL Editor** → New Query
- Copy/paste content from: `migrations/0000_famous_firebird.sql`
- Click **Run**

### 3️⃣ Get Connection String
- Supabase: **Project Settings** → **Database**
- Copy **Connection string (URI)**
- Replace `[YOUR-PASSWORD]` with your actual password

### 4️⃣ Update .env
```bash
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 5️⃣ Update Dependencies
```bash
npm install pg
npm install --save-dev @types/pg
```

### 6️⃣ Update server/db.ts
Replace:
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
```

With:
```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
```

### 7️⃣ Re-enable Database Init
In `server/index.ts`, uncomment lines 63-76 (database initialization code)

### 8️⃣ Test
```bash
npm run dev
```

---

## ✅ Success Indicators
- Server starts without "ENOTFOUND helium" error
- Log shows "Database initialized successfully"
- Supabase Table Editor shows 10 tables with data

---

## 📦 Files Created
- ✅ `migrations/0000_famous_firebird.sql` - Your complete schema
- ✅ `SUPABASE_MIGRATION_GUIDE.md` - Detailed guide
- ✅ `backup/migration-20260608/` - Backup of current config

---

## 🆘 Need Help?
See `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions and troubleshooting.
