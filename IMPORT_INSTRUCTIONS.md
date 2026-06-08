# 📋 Import Schema to Supabase - Step by Step

Since direct connection from this environment to Supabase is restricted, follow these steps to import your schema manually.

## ✅ Your .env File is Already Updated!

Your `.env` file now contains the correct Supabase connection string:
```
DATABASE_URL=postgresql://postgres:BeMyGuest@2001@db.bdkvujsvyttdzbiwexks.supabase.co:5432/postgres
```

## 🎯 Import Schema (5 Minutes)

### Step 1: Open Your Migration File

The file you need is: `migrations/0000_famous_firebird.sql`

You can view it by running:
```bash
cat migrations/0000_famous_firebird.sql
```

Or open it in your code editor.

### Step 2: Copy the SQL Content

1. Open `migrations/0000_famous_firebird.sql`
2. Select **all content** (Ctrl+A or Cmd+A)
3. Copy it (Ctrl+C or Cmd+C)

### Step 3: Import via Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button
5. **Paste** the entire SQL content into the editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. Wait for it to complete (should take 2-3 seconds)

### Step 4: Verify Success

You should see:
- ✅ Green success message: "Success. No rows returned"
- No error messages

### Step 5: Check Tables Were Created

1. Click **"Table Editor"** in the left sidebar
2. You should see **10 tables**:
   - ✅ banner_settings
   - ✅ cart_items
   - ✅ faqs
   - ✅ order_items
   - ✅ orders
   - ✅ products
   - ✅ site_content
   - ✅ site_settings
   - ✅ user_visits
   - ✅ users

---

## 🚀 After Import is Complete

Once you've successfully imported the schema, come back here and let me know.

I'll then:
1. ✅ Restart the development server
2. ✅ Run database seeding (populate with sample data)
3. ✅ Verify everything works
4. ✅ Show you the working application

---

## 📝 What the SQL Creates

The migration file creates your complete database structure:

### Tables with Relationships:
- **users** → Authentication & user roles (admin, vendor, customer)
- **products** → Product catalog (links to vendors via foreign key)
- **cart_items** → Shopping cart (links to products)
- **orders** → Customer orders
- **order_items** → Order details (links to orders & products)
- **banner_settings** → Site banner configuration
- **site_content** → CMS pages (About, Contact, ToS, Privacy)
- **site_settings** → Site configuration (social links, etc.)
- **faqs** → FAQ system
- **user_visits** → Analytics/tracking

### Features:
- ✅ Foreign key relationships between tables
- ✅ Unique constraints (email, etc.)
- ✅ Default values for fields
- ✅ Timestamps (created_at, updated_at)
- ✅ Proper data types (text, integer, numeric, boolean)

---

## 🆘 Troubleshooting

### "Relation already exists" Error
If you get errors like `relation "users" already exists`:
- Tables were already created
- Safe to ignore if this is your first import
- Or drop all tables first: Go to SQL Editor → Run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` → Then import again

### "Syntax error" Message
- Make sure you copied the **entire** SQL file
- Check that no characters were lost during copy/paste
- The file should start with `CREATE TABLE "banner_settings"`

### Can't Find SQL Editor
- It's in the left sidebar of your Supabase dashboard
- Icon looks like `</>` or a database with gears
- Alternative path: Project → SQL Editor

---

## 📸 Visual Guide

**Where to find SQL Editor:**
```
Supabase Dashboard
├── [Your Project Name]
    ├── 🏠 Home
    ├── 📊 Table Editor  ← (Check tables here after import)
    ├── </> SQL Editor   ← (Import here!)
    ├── ⚡ Database
    └── ...
```

**What to do in SQL Editor:**
1. New Query
2. Paste SQL
3. Run (green button or Ctrl+Enter)
4. See success message

---

## ✨ Next Steps

After you've imported the schema:

1. **Tell me "Schema imported"**
2. I'll restart your server
3. Database will auto-seed with sample data:
   - Admin user
   - ~50 sample products
   - Banner settings
   - Site content
   - FAQs
4. Your app will be fully functional!

---

**Ready? Go import the schema and let me know when it's done!** 🚀
