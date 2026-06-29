#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { execSync } from 'child_process';

export interface IAppStackConfig {
  databaseName: string;
  domainName: string;
  projectName: string;
  subDomainNameApp: string;
  fullSubDomainNameApp: string;
  userDeploerName: string;
  databaseUsername: string;
  targetNodeEnv: string;
  siteOrigin: string;
}

const app = new cdk.App();

const targetEnv = app.node.tryGetContext('targetEnv');

let config: IAppStackConfig;

switch (targetEnv) {
  case 'dev':
    config = require('../config.dev').config;
    break;
  case 'stage':
    config = require('../config.stage').config;
    break;
  case 'prod':
    config = require('../config.prod').config;
    break;
  default:
    throw new Error(
      'target targetEnv is not defined; use `npx cdk deploy --all --context targetEnv=dev` , where targetEnv= dev | stage | prod. NOTE!!! flag `--all` is needed because additionoal stack will be deployed to region us-east-1 (it is needed for certificate to work with CloudFront).',
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
