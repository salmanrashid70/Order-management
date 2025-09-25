import { z } from 'zod';

/**
 * Environment variables schema validation
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8000'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/ecommerce'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

/**
 * Validate and export environment variables
 */
export const env = envSchema.parse(process.env);