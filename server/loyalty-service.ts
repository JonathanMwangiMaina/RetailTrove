import { storage } from "./storage.js";
import type { Order } from "../shared/schema.js";

export async function awardLoyaltyPointsForOrder(order: Order): Promise<void> {
  if (!order.userId) return;

  const user = await storage.getUserByAuthUserId(order.userId);
  if (!user) return;

  const total = Number(order.total) || 0;
  const points = Math.max(1, Math.floor(total));

  await storage.addLoyaltyPoints(
    user.id,
    points,
    `Points earned from order #${order.id}`,
    order.id,
  );
}
