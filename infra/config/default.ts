/**
 * Infrastructure configuration for invoice-data
 */

export const config = {
  projectName: 'invoice-data',
  domainName: 'poc-test.click',
  fullSubDomainNameApp: 'ingen.poc-test.click',
  subDomainNameApp: 'ingen',
  instanceType: 't4g.medium',
  ebsSizeGb: 4,
  targetNodeEnv: 'production',
  databaseName: 'invoice',
  databaseUsername: 'invoice',
  // ACM cert must be in us-east-1 for CloudFront
  region: 'us-east-1',
  // Set after first deploy to preserve EBS data across stack updates
  dbVolumeId: '',
  userDataVersion: 'v1',
  // Auth settings for NextAuth behind CloudFront
  authUrl: 'https://ingen.poc-test.click',
  authTrustHost: 'true',
};

export type InfraConfig = typeof config;