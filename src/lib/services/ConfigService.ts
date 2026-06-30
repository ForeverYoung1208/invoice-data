import { z } from 'zod';
import { join } from 'path';
import { EEnvironments } from '../constants';

const envValidationSchema = z.object({
  NODE_ENV: z.enum(Object.values(EEnvironments)).default(EEnvironments.DEV),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),
  TYPEORM_HOST: z.string({ message: 'TYPEORM_HOST is required' }),
  TYPEORM_PORT: z
    .string({ message: 'TYPEORM_PORT is required' })
    .transform(Number),
  TYPEORM_DATABASE: z.string({ message: 'TYPEORM_DATABASE is required' }),
  TYPEORM_USERNAME: z.string({ message: 'TYPEORM_USERNAME is required' }),
  TYPEORM_PASSWORD: z.string({ message: 'TYPEORM_PASSWORD is required' }),
  AUTH_SECRET: z.string({ message: 'AUTH_SECRET is required' }),
  AUTH_URL: z.string({ message: 'AUTH_URL is required' }),
  AUTH_TRUST_HOST: z.coerce.boolean().default(false),
  NEXT_ALLOWED_DEV_ORIGINS: z.string({
    message: 'NEXT_ALLOWED_DEV_ORIGINS is required',
  }),
  LLM_BASE_URL: z.string({ message: 'LLM_BASE_URL is required' }),
  LLM_API_KEY: z.string({ message: 'LLM_API_KEY is required' }),
  LLM_MODEL: z.string({ message: 'LLM_MODEL is required' }),
});

export type ConfigData = {
  env: EEnvironments;
  dataDir: string;
  templatePath: string;
  outputDir: string;
  pollIntervalMs: number;
};

export class ConfigService {
  getConfig(env?: EEnvironments): ConfigData {
    const envVars = envValidationSchema.parse(process.env);
    const sensitiveVars = {
      TYPEORM_PASSWORD: '***' + envVars.TYPEORM_PASSWORD.slice(-4),
      AUTH_SECRET: '***' + envVars.AUTH_SECRET.slice(-4),
      LLM_API_KEY: '***' + envVars.LLM_API_KEY.slice(-4),
    };
    console.log('envVars', { ...envVars, ...sensitiveVars });
    const currentEnv = env || envVars.NODE_ENV;
    const dataDir = './docker/app-files/data';

    return {
      env: currentEnv,
      dataDir,
      templatePath: join(dataDir, 'invoice_template.csv'),
      outputDir: 'output',
      pollIntervalMs: envVars.POLL_INTERVAL_MS,
    };
  }
}
