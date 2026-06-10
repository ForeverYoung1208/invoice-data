import { z } from 'zod';
import { join } from 'path';

const envValidataionSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATA_DIR: z.string({
    message: 'DATA_DIR environment variable is not set',
  }),
});

export type ConfigData = {
  env: string;
  dataDir: string;
  templatePath: string;
  outputDir: string;
};

export class ConfigService {
  getConfig(env?: string): ConfigData {
    const envVars = envValidataionSchema.parse(process.env);
    const currentEnv = env || envVars.NODE_ENV;
    const dataDir = envVars.DATA_DIR;

    return {
      env: currentEnv,
      dataDir,
      templatePath: join(dataDir, 'invoice_template.csv'),
      outputDir: 'output',
    };
  }
}
