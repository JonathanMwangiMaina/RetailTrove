import { describe, it, expect } from "vitest";
import { insertUserSchema, insertProductSchema } from "../schema";

describe("insertUserSchema", () => {
  it("accepts valid user with password", () => {
    const result = insertUserSchema.safeParse({
      email: "test@example.com",
      password: "secret123",
      fullName: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = insertUserSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 6 chars", () => {
    const result = insertUserSchema.safeParse({
      email: "test@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("accepts user without password (passwordHash set later)", () => {
    const result = insertUserSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertProductSchema", () => {
  it("accepts valid product with numeric price", () => {
    const result = insertProductSchema.safeParse({
      name: "Widget",
      description: "A fine widget",
      price: 29.99,
      imageUrl: "https://example.com/widget.jpg",
      category: "Electronics",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid product with string price", () => {
    const result = insertProductSchema.safeParse({
      name: "Widget",
      description: "A fine widget",
      price: "29.99",
      imageUrl: "https://example.com/widget.jpg",
      category: "Electronics",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional stockQuantity", () => {
    const result = insertProductSchema.safeParse({
      name: "Widget",
      description: "A fine widget",
      price: 10,
      imageUrl: "https://example.com/widget.jpg",
      category: "Electronics",
      stockQuantity: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative stockQuantity", () => {
    const result = insertProductSchema.safeParse({
      name: "Widget",
      price: 10,
      stockQuantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it("omits id and createdAt", () => {
    const result = insertProductSchema.safeParse({
      name: "Widget",
      description: "A fine widget",
      price: 10,
      imageUrl: "https://example.com/widget.jpg",
      category: "Electronics",
      id: 99,
      createdAt: new Date(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });
});
