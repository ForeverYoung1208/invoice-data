import { IAppStackConfig, TARGET_ENV } from './bin/infra';

if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required');
}
if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required');
}
if (!process.env.DATABASE_PASSWORD) {
  throw new Error('DATABASE_PASSWORD environment variable is required');
}
if (!process.env.LLM_API_KEY) {
  throw new Error('LLM_API_KEY environment variable is required');
}
if (!process.env.LLM_BASE_URL) {
  throw new Error('LLM_BASE_URL environment variable is required');
}
if (!process.env.LLM_MODEL) {
  throw new Error('LLM_MODEL environment variable is required');
}

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
const projectShortName = 'ingen';

// define postfix for environment resources to specify
const suffix = '-dev';
const projectName = projectShortName + suffix;

// define your registered domain (you must have one at Route53)
const domainName = 'poc-test.click';

// subdomain for app (will be created, and route .../api will be used to serve api )
const subDomainNameApp = `${projectName}`;
const fullSubDomainNameApp = `${subDomainNameApp}.${domainName}`;

// user for deployment using CI/CD (will be created)
const userDeploerName = `${projectName}-deployer`;

// database
const databaseName = projectShortName + suffix.replace('-', ''); // DatabaseName must begin with a letter and contain only alphanumeric characters
const databaseUsername = 'invoice';
const databaseHost = 'db';
const databasePort = 5432;

// app
const targetNodeEnv = TARGET_ENV.DEV;
const dockerComposeFileName = 'docker-compose.dev.yml';
const adminUser = 'admin';
const adminPasswordParameterValue = process.env.ADMIN_PASSWORD;
const authSecretParameterValue = process.env.AUTH_SECRET;
const databasePasswordParameterValue = process.env.DATABASE_PASSWORD;
const pollIntervalMs = 5000;
const appDir = '/var/www/app';
const appPort = 3010;
const ebsDeviceName = '/dev/sdf';
const ebsVolumeSizeGIB = 4;

// llm
const llmBaseUrl = process.env.LLM_BASE_URL;
const llmApiKeyParameterValue = process.env.LLM_API_KEY;
const llmModel = process.env.LLM_MODEL;

console.info('using development config...');

export const config: IAppStackConfig = {
  adminUser,
  adminPasswordParameterValue,
  authSecretParameterValue,
  databaseName,
  databasePasswordParameterValue,
  domainName,
  projectName,
  subDomainNameApp,
  fullSubDomainNameApp,
  userDeploerName,
  databaseUsername,
  databaseHost,
  databasePort,
  targetNodeEnv,
  dockerComposeFileName,
  llmBaseUrl,
  llmApiKeyParameterValue,
  llmModel,
  pollIntervalMs,
  appDir,
  appPort,
  ebsDeviceName,
  ebsVolumeSizeGIB,
};
