// Vercel Serverless Function Entry Point
// This wraps the Express app with serverless-http for Vercel's serverless runtime

import serverless from 'serverless-http';
import app from '../server/index.js';

// Wrap the Express app with serverless-http and export as the default handler
export default serverless(app);
