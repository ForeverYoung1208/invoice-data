import { z } from 'zod';
import { join } from 'path';
import { EEnvironments } from '../constants';

const envValidationSchema = z.object({
  NODE_ENV: z.enum(Object.values(EEnvironments)).default(EEnvironments.DEV),
  DATA_DIR: z.string({
    message: 'DATA_DIR environment variable is not set',
  }),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),
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
    console.log('envVars', envVars);
    const currentEnv = env || envVars.NODE_ENV;
    const dataDir = envVars.DATA_DIR;

    return {
      env: currentEnv,
      dataDir,
      templatePath: join(dataDir, 'invoice_template.csv'),
      outputDir: 'output',
      pollIntervalMs: envVars.POLL_INTERVAL_MS,
    };
  }
}
