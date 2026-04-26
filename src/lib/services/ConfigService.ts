export interface IConfigData {
  env: string;
}

export class ConfigService {
  getConfig(env?: string): IConfigData {
    if (!env) env = process.env.NODE_ENV || 'development';
    const config: IConfigData = {
      env,
    };
    return config;
  }
}
