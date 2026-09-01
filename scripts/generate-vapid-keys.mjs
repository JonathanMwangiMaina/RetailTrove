#!/usr/bin/env node
/**
 * @file scripts/generate-vapid-keys.mjs
 * @description Generate VAPID keys for Web Push notifications.
 * Run with: node scripts/generate-vapid-keys.mjs
 */

import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("\nAdd these to your .env file:");
console.log("VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("VAPID_SUBJECT=mailto:admin@retailtrove.local");