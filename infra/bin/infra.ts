#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export enum TARGET_ENV {
  DEV = 'development',
  STAGE = 'staging',
  PROD = 'production',
}

export interface IAppStackConfig {
  adminUser: string;
  adminPasswordParameterValue: string;
  authSecretParameterValue: string;
  databaseName: string;
  databaseHost: string;
  databasePort: number;
  databasePasswordParameterValue: string;
  domainName: string;
  projectName: string;
  subDomainNameApp: string;
  fullSubDomainNameApp: string;
  userDeploerName: string;
  databaseUsername: string;
  targetNodeEnv: TARGET_ENV;
  dockerComposeFileName: string;
  llmBaseUrl: string;
  llmApiKeyParameterValue: string;
  llmModel: string;
  pollIntervalMs: number;
  appDir: string;
  appPort: number;
  ebsDeviceName: string;
  ebsVolumeSizeGIB: number;
}

function loadInfraEnv(): void {
  const envFilePath = resolve(__dirname, '../.env');

  if (!existsSync(envFilePath)) {
    return;
  }

  const fileContent = readFileSync(envFilePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    process.env[key] ??= value;
  }
}

loadInfraEnv();

const app = new cdk.App();

const targetEnv = app.node.tryGetContext('targetEnv');

let config: IAppStackConfig;

switch (targetEnv) {
  case TARGET_ENV.DEV:
    config = require('../config.dev').config;
    break;
  case TARGET_ENV.STAGE:
    config = require('../config.stage').config;
    break;
  case TARGET_ENV.PROD:
    config = require('../config.prod').config;
    break;
  default:
    throw new Error(
      `target targetEnv is not defined; use 'npx cdk deploy --all --context targetEnv=${TARGET_ENV.DEV}' , where targetEnv= ${TARGET_ENV.DEV} | ${TARGET_ENV.STAGE} | ${TARGET_ENV.PROD}. NOTE!!! flag '--all' is needed because additionoal stack will be deployed to region us-east-1 (it is needed for certificate to work with CloudFront).`,
    );
}
// Build the application before deployment
console.log('Building application...');
try {
  execSync('npm run build', { cwd: '../', stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed!');
  console.error(error);
  process.exit(1);
}

new InfraStack(app, `${config.projectName}Stack`, config, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true,
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
