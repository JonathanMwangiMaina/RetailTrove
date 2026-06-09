import { db } from "./db.js";
import { users } from "@shared/schema";
import { hashPassword } from "./auth.js";

/**
 * Seeds sample user accounts for testing
 * IMPORTANT: These are demo accounts - change passwords in production!
 */
export async function seedSampleUsers() {
  // Check if users already exist
  const existingUsers = await db.select().from(users);

  if (existingUsers.length > 0) {
    console.log(`Database already has ${existingUsers.length} users. Skipping user seed.`);
    return;
  }

  console.log("Seeding sample user accounts...");

  // Sample user credentials
  const sampleUsers = [
    {
      email: "admin@retailtrove.com",
      password: "Admin123!",
      name: "Admin User",
      role: "admin",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      status: "active",
      isApproved: true,
    },
    {
      email: "vendor@retailtrove.com",
      password: "Vendor123!",
      name: "Vendor User",
      role: "vendor",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=vendor",
      status: "active",
      isApproved: true,
    },
    {
      email: "customer@retailtrove.com",
      password: "Customer123!",
      name: "John Doe",
      role: "customer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=customer",
      status: "active",
      isApproved: true,
    },
    {
      email: "demo@retailtrove.com",
      password: "Demo123!",
      name: "Demo User",
      role: "customer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      status: "active",
      isApproved: true,
    },
    {
      email: "janedoe@example.com",
      password: "Jane123!",
      name: "Jane Doe",
      role: "customer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=janedoe",
      status: "active",
      isApproved: true,
    },
  ];

  try {
    // Hash passwords and insert users
    for (const user of sampleUsers) {
      const passwordHash = hashPassword(user.password);

      await db.insert(users).values({
        email: user.email,
        passwordHash: passwordHash,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        status: user.status,
        isApproved: user.isApproved,
      });

      console.log(`✓ Created ${user.role} user: ${user.email}`);
    }

    console.log("\n✅ Sample users seeded successfully!");
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log("═".repeat(60));
    sampleUsers.forEach(user => {
      console.log(`\n${user.role.toUpperCase()}:`);
      console.log(`  Email:    ${user.email}`);
      console.log(`  Password: ${user.password}`);
    });
    console.log("\n═".repeat(60));
    console.log("⚠️  IMPORTANT: Change these passwords in production!\n");

  } catch (error) {
    console.error("Error seeding sample users:", error);
    throw error;
  }
}

/**
 * Export sample credentials for documentation
 */
export const SAMPLE_CREDENTIALS = {
  admin: {
    email: "admin@retailtrove.com",
    password: "Admin123!",
    role: "admin",
  },
  vendor: {
    email: "vendor@retailtrove.com",
    password: "Vendor123!",
    role: "vendor",
  },
  customer: {
    email: "customer@retailtrove.com",
    password: "Customer123!",
    role: "customer",
  },
  demo: {
    email: "demo@retailtrove.com",
    password: "Demo123!",
    role: "customer",
  },
  janedoe: {
    email: "janedoe@example.com",
    password: "Jane123!",
    role: "customer",
  },
};
