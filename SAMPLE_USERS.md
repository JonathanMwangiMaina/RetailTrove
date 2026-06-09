# Sample User Accounts 👥

## Overview

The database is pre-seeded with sample user accounts for testing and demonstration purposes.

**⚠️ IMPORTANT SECURITY NOTE:**
These are **DEMO CREDENTIALS** for development and testing only.
**CHANGE OR DISABLE THESE ACCOUNTS IN PRODUCTION!**

---

## 🔑 Sample Login Credentials

### Admin Account
```
Email:    admin@retailtrove.com
Password: Admin123!
Role:     admin
```

**Permissions:**
- Full system access
- Product management (add, edit, delete)
- User management
- Order management
- Analytics dashboard
- Settings configuration

---

### Vendor Account
```
Email:    vendor@retailtrove.com
Password: Vendor123!
Role:     vendor
```

**Permissions:**
- Product listing management
- Order fulfillment
- Sales analytics
- Inventory management
- Limited system settings

---

### Customer Account #1
```
Email:    customer@retailtrove.com
Password: Customer123!
Role:     customer
```

**Permissions:**
- Browse products
- Add to cart
- Place orders
- View order history
- Update profile

---

### Customer Account #2 (Demo)
```
Email:    demo@retailtrove.com
Password: Demo123!
Role:     customer
```

**Permissions:**
- Same as customer account
- Can be used for public demonstrations

---

### 5. Customer Account #3 (Jane Doe)

**Credentials:**
- Email: `janedoe@example.com`
- Password: `Jane123!`
- Role: `customer`
- Status: `active`

**Use Case:**
- Additional customer test account
- Alternative customer for testing multi-user scenarios
- Example account with external domain

**Permissions:**
- Same as other customer accounts
- Browse and shop catalog
- Manage cart and checkout
- View order history

---

## 🔐 Password Requirements

All sample passwords meet the following criteria:
- Minimum 8 characters
- Contains uppercase letter
- Contains lowercase letter
- Contains number
- Contains special character

---

## 🚀 Testing User Flows

### Test Admin Workflow:
1. Login with admin credentials
2. Navigate to `/admin` dashboard
3. Add/edit/delete products
4. Manage user accounts
5. View sales analytics

### Test Vendor Workflow:
1. Login with vendor credentials
2. Navigate to vendor dashboard
3. List new products
4. Manage inventory
5. Process orders

### Test Customer Workflow:
1. Login with customer credentials
2. Browse product catalog
3. Add items to cart
4. Complete checkout
5. View order history

---

## 📊 User Profile Data

Each sample user has:
- **Avatar**: Auto-generated with DiceBear API
- **Status**: Active
- **Approved**: Yes
- **Created**: On database seed

### Avatar URLs:
- Admin: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`
- Vendor: `https://api.dicebear.com/7.x/avataaars/svg?seed=vendor`
- Customer: `https://api.dicebear.com/7.x/avataaars/svg?seed=customer`
- Demo: `https://api.dicebear.com/7.x/avataaars/svg?seed=demo`

---

## 🔄 How Seeding Works

### Automatic Seeding:
1. On first deployment, database is empty
2. Server initialization triggers seeding
3. `seedSampleUsers()` function runs
4. Checks if users exist (idempotent)
5. If empty → creates sample users
6. If has users → skips seeding

### Manual Re-seeding:
If you need to reset sample users:
```sql
-- In Supabase SQL Editor
DELETE FROM users WHERE email LIKE '%@retailtrove.com';
```
Then restart the server or redeploy.

---

## 🛡️ Security Considerations

### Development/Testing:
✅ Sample users are fine for:
- Local development
- Staging environments
- Demo presentations
- Integration testing
- User acceptance testing (UAT)

### Production:
❌ **DO NOT USE** sample users in production:
- Delete or disable these accounts
- Change passwords if keeping for testing
- Implement proper user registration
- Add email verification
- Enable 2FA for admin accounts

---

## 🔧 Implementation Details

### Password Hashing:
```typescript
// Passwords are hashed using bcrypt
const passwordHash = hashPassword(user.password);
```

### Storage:
```typescript
// Users table schema
users {
  id: serial
  email: text (unique)
  passwordHash: text
  name: text
  role: text (admin | vendor | customer)
  avatarUrl: text
  status: text (active | suspended)
  isApproved: boolean
  createdAt: timestamp
}
```

### Seeding Function:
Location: `server/seed-users.ts`
- Exports `seedSampleUsers()` function
- Exports `SAMPLE_CREDENTIALS` constant
- Idempotent (checks before inserting)
- Logs credentials on first seed

---

## 📝 Customization

### Adding More Sample Users:
Edit `server/seed-users.ts`:
```typescript
const sampleUsers = [
  // ... existing users
  {
    email: "your-email@example.com",
    password: "YourPassword123!",
    name: "Your Name",
    role: "customer", // or "admin" or "vendor"
    avatarUrl: "https://...",
    status: "active",
    isApproved: true,
  },
];
```

### Changing Default Passwords:
Edit the password field in `sampleUsers` array, then:
1. Delete existing users from database
2. Redeploy or restart server
3. New passwords will be seeded

---

## ✅ Verification

### Check Users Were Seeded:
```sql
-- Run in Supabase SQL Editor
SELECT id, email, name, role, status
FROM users
ORDER BY id;
```

### Expected Output:
```
id | email                      | name         | role     | status
---+----------------------------+--------------+----------+--------
1  | admin@retailtrove.com      | Admin User   | admin    | active
2  | vendor@retailtrove.com     | Vendor User  | vendor   | active
3  | customer@retailtrove.com   | John Doe     | customer | active
4  | demo@retailtrove.com       | Demo User    | customer | active
```

### Test Login:
1. Navigate to `/login` page
2. Enter any sample credentials
3. Should successfully authenticate
4. Redirected based on role (admin → dashboard, customer → home)

---

## 🚨 Production Checklist

Before going live:
- [ ] Delete all `@retailtrove.com` demo accounts
- [ ] Disable user seeding in production
- [ ] Implement email verification
- [ ] Add password reset flow
- [ ] Enable rate limiting on login
- [ ] Add CAPTCHA for registration
- [ ] Implement 2FA for admin accounts
- [ ] Review and update password policies
- [ ] Add session timeout
- [ ] Enable login attempt monitoring

---

**Last Updated**: June 9, 2026
**Seeding Function**: `server/seed-users.ts`
**Status**: Active in development/testing
