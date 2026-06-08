# 🌱 Seed Data Reference

## Overview

Your RetailTrove database is automatically populated with initial data when the server starts. This ensures you have working data to test and demonstrate the application.

## 📊 Data Files

1. **`server/seed-db.ts`** - Core database seeding
2. **`server/update-products.ts`** - Product catalog (Part 1)
3. **`server/update-products-2.ts`** - Product catalog (Part 2)
4. **`server/storage.ts`** - Utility functions that ensure:
   - Default admin account
   - Banner settings
   - Site content (About, Contact, etc.)
   - Site settings (social links)
   - Default FAQs

## 🎯 What Gets Seeded

### Default Admin User
- **Email**: `admin@retailtrove.com` (or configured default)
- **Password**: Check `storage.ensureDefaultAdmin()` implementation
- **Role**: admin
- **Status**: active, approved

### Banner Settings
- Default promotional banner text
- Background color
- Active/inactive status

### Products
The system seeds a comprehensive product catalog including:
- Electronics (phones, laptops, accessories)
- Fashion items (clothing, accessories)
- Home goods
- Various categories and subcategories
- Featured products
- New arrivals
- Stock quantities and pricing

### Site Content
- **About Us** page content
- **Contact** page content
- **Footer About** section
- **Terms of Service**
- **Privacy Policy**

### Site Settings
Social media links and other configurable settings:
- Facebook URL
- Twitter URL
- Instagram URL
- LinkedIn URL
- YouTube URL
- And more...

### FAQs
Default frequently asked questions to help users

## 🔄 How Seeding Works

When the server starts (`server/index.ts`), it runs:

```typescript
await seed();                           // Core database setup
await updateProducts();                 // Product catalog part 1
await updateProducts2();                // Product catalog part 2
await storage.ensureBanner();          // Banner settings
await storage.ensureDefaultAdmin(hashPassword); // Admin user
await storage.ensureSiteContent();     // CMS content
await storage.ensureSiteSettings();    // Site configuration
await storage.ensureDefaultFaqs();     // FAQ entries
```

## 🎨 Customization

After migration to Supabase, you can:

1. **Modify seed data** by editing the seed files
2. **Add more products** in Supabase Table Editor
3. **Update site content** through your admin dashboard
4. **Change default settings** directly in the database

## 📝 Important Notes

- Seeding is **idempotent** - safe to run multiple times
- Existing data won't be duplicated
- Uses `ensure*` functions to check before inserting
- Admin password is hashed using bcrypt

## 🚀 After Supabase Migration

Your seed data will automatically populate your Supabase database on first server start. You'll have:

✅ A working admin account
✅ Sample products to browse
✅ Configured site content
✅ Default settings
✅ Initial FAQs

All visible and editable in the Supabase Table Editor!

---

## 🔍 Viewing Seed Data

**In Supabase Dashboard:**
1. Go to **Table Editor**
2. Select table (users, products, etc.)
3. View all seeded data
4. Edit directly if needed

**In Your Application:**
- Admin dashboard will show all products
- Users can browse the seeded catalog
- Site content appears on respective pages
