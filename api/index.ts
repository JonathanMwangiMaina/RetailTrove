// Vercel Serverless Function Entry Point
// This wraps the Express app with serverless-http for Vercel's serverless runtime
import express from 'express';
import {registerRoutes} from '../server/routes.js';

const app = express();

//Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Register API routes
registerRoutes(app);

// Export Express instance directly for Vercel Serverless Function runtime
export default app;
