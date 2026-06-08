# Email Integration with Resend

This document describes the email functionality implemented in RetailTrove using Resend.

## Overview

RetailTrove uses **Resend** as the email service provider for sending transactional emails and newsletters. Resend was chosen for its:
- Developer-friendly API
- Generous free tier (3,000 emails/month)
- Simple integration
- Reliable delivery

## Setup

### 1. Environment Variable

Add your Resend API key to `.env`:

```env
RESEND_API_KEY=re_your_api_key_here
```

**Important**: Never commit your `.env` file to version control.

### 2. Dependencies

The Resend SDK is installed via npm:

```bash
npm install resend
```

## Implementation

### Email Service Module

Location: `server/email.ts`

This module provides two main functions:

#### 1. `sendWelcomeEmail(email: string)`

Sends a welcome email when a user subscribes to the newsletter.

**Features**:
- Professional HTML template with RetailTrove branding
- Mobile-responsive design
- Call-to-action button linking to shop
- Unsubscribe link in footer
- Privacy policy link

**Usage**:
```typescript
import { sendWelcomeEmail } from './email';

await sendWelcomeEmail('customer@example.com');
```

**Error Handling**: Fails silently (logs error but doesn't throw) to prevent subscription failure if email delivery fails.

#### 2. `sendNewsletterEmail(subscribers: string[], subject: string, content: string)`

Sends newsletters to multiple subscribers in batches.

**Features**:
- Batch processing (50 emails per batch)
- Parallel sending for performance
- Custom subject and HTML content

**Usage**:
```typescript
import { sendNewsletterEmail } from './email';

const subscribers = ['user1@example.com', 'user2@example.com'];
await sendNewsletterEmail(
  subscribers,
  'Monthly Newsletter - June 2026',
  htmlContent
);
```

## Integration with Newsletter Subscription

The newsletter subscription endpoint (`POST /api/newsletter/subscribe`) automatically sends a welcome email after successful subscription:

```typescript
const subscriber = await storage.createNewsletterSubscriber(result.data);

// Send welcome email asynchronously
sendWelcomeEmail(subscriber.email).catch(err => {
  console.error("Failed to send welcome email:", err);
});

res.status(201).json({ message: "Thank you for subscribing!" });
```

**Note**: Email sending is asynchronous and non-blocking. The API responds immediately after database insertion, and the email is sent in the background.

## Email Template Details

### Welcome Email

**From**: `RetailTrove <onboarding@resend.dev>`
**Subject**: `Welcome to RetailTrove Newsletter! 🎉`

**Content Includes**:
- Personalized greeting
- Benefits of subscription
- Shop now CTA button
- Company information
- Unsubscribe and privacy policy links

**Design**:
- Mobile-responsive
- Brand colors (blue gradient header, orange CTA)
- Professional typography
- Inline CSS for maximum compatibility

## Vercel Deployment

When deploying to Vercel, add the `RESEND_API_KEY` environment variable:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add key: `RESEND_API_KEY`
3. Value: Your Resend API key
4. Select all environments (Production, Preview, Development)
5. Click "Add"

## Resend Dashboard

Access your Resend dashboard at: https://resend.com/dashboard

**Features**:
- View sent emails
- Monitor delivery status
- Check email logs
- Manage API keys
- View usage statistics

## Free Tier Limits

Resend Free Tier:
- **3,000 emails/month**
- **100 emails/day**
- Perfect for starting out

If you exceed these limits, consider upgrading to a paid plan or implementing email queuing.

## Testing

### Local Testing

```bash
# Start the server
npm run dev

# Subscribe via curl
curl -X POST http://localhost:3000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check server logs for email sending confirmation
```

### Verification

1. Check Resend dashboard for sent emails
2. Check email inbox for welcome email
3. Check server logs for any errors

## Future Enhancements

Potential improvements for production:

1. **Email Templates**
   - Use React Email for template management
   - Create reusable components
   - Add more email types (order confirmation, password reset)

2. **Email Queue**
   - Implement job queue (Bull/BullMQ) for background processing
   - Retry failed emails
   - Rate limiting

3. **Analytics**
   - Track email open rates
   - Track click-through rates
   - A/B testing for subject lines

4. **Personalization**
   - Use subscriber name in emails
   - Segment-based newsletters
   - Product recommendations

5. **Unsubscribe Flow**
   - Dedicated unsubscribe page
   - Update newsletter_subscribers.status to "unsubscribed"
   - Confirmation email

## Troubleshooting

### Email Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check Logs**: Look for error messages in server logs
3. **Verify Email**: Ensure "from" email is verified in Resend dashboard
4. **Rate Limits**: Check if you've exceeded daily/monthly limits

### Email Going to Spam

1. **Verify Domain**: Use a verified custom domain instead of `onboarding@resend.dev`
2. **SPF/DKIM**: Configure DNS records in Resend dashboard
3. **Content**: Avoid spam trigger words
4. **Authentication**: Ensure proper email authentication

### Custom Domain Setup

To use a custom domain (e.g., `newsletter@retailtrove.com`):

1. Add domain in Resend dashboard
2. Configure DNS records (MX, TXT for SPF/DKIM)
3. Wait for verification
4. Update `from` field in `server/email.ts`

## Support

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: https://resend.com/support
- **API Reference**: https://resend.com/docs/api-reference

## Security

- ✅ API key stored in environment variable
- ✅ Never logged or exposed to client
- ✅ Rate limiting handled by Resend
- ✅ Email validation before sending
- ⚠️ Consider implementing additional rate limiting on subscription endpoint

## Summary

Email integration is now fully operational:
- ✅ Welcome emails sent on newsletter subscription
- ✅ Professional HTML templates
- ✅ Resend SDK integrated
- ✅ Environment variable configured
- ✅ Error handling implemented
- ✅ Ready for Vercel deployment

When you subscribe to the newsletter, you'll receive a beautifully formatted welcome email within seconds!
