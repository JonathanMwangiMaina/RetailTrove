// Preload script to load environment variables before any ES modules
import { config } from 'dotenv';
config({ override: true, debug: false });
