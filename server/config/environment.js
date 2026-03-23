import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/nexis_erp',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT, 10) || 30000,
};

// Validate required environment variables
const requiredVars = ['MONGO_URI', 'JWT_SECRET'];
const missingVars = requiredVars.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  console.warn(
    `Warning: Missing environment variables: ${missingVars.join(', ')}`
  );
}

export default environment;
