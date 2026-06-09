// Vercel Serverless Function Entry Point
// This imports and exports the Express app for Vercel's serverless runtime

import app from '../server/index.js';

// Export the Express app as the default handler for Vercel
export default app;
