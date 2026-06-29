/* eslint-disable no-useless-escape */
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { IAppStackConfig } from '../bin/infra';

export class InfraStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    config: IAppStackConfig,
    props?: cdk.StackProps,
  ) {
    super(scope, id, { ...props, crossRegionReferences: true });
    const {
      projectName,
      domainName,
      fullSubDomainNameApp,
      subDomainNameApp,
      userDeploerName,
    } = config;
    /**
     *
     *
     *
     * COMMON
     *
     *
     *
     */

    // Add tag for cost tracking
    cdk.Tags.of(this).add('AppManagerCFNStackKey', this.stackName);

    // Create S3 bucket for code
    const codeBucket = new s3.Bucket(this, `${projectName}CodeBucket`, {
      bucketName: `${projectName}-code-bucket-${this.account}`, // Make it globally unique
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Clean up when stack is deleted
    });
    // Deploy code as part of CDK stack
    new s3deploy.BucketDeployment(this, `${projectName}CodeDeployment`, {
      sources: [
        s3deploy.Source.asset('../', {
          exclude: [
            'node_modules',
            '.git',
            '.env',
            'infra',
            'dist',
            'test',
            'docker/postgres/data',
            'docker/postgres/data_tests',
            'docker/redis/data',
          ],
        }),
      ],
      destinationBucket: codeBucket,
    });

    // SSM Parameters
    const dbPasswordParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    const jwtSecretKeyParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    const jwtRefreshSecretKeyParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    const dbPasswordParameter = new ssm.StringParameter(
      this,
      `${projectName}DbPasswordParameter`,
      {
        parameterName: `/${projectName}/db-password`,
        stringValue: dbPasswordParameterValue,
        description: 'DB password',
      },
    );
    const jwtSecretKeyParameter = new ssm.StringParameter(
      this,
      `${projectName}JwtSecretKeyParameter`,
      {
        parameterName: `/${projectName}/jwt-secret-key`,
        stringValue: jwtSecretKeyParameterValue,
        description: 'JWT secret key',
      },
    );
    const jwtRefreshSecretKeyParameter = new ssm.StringParameter(
      this,
      `${projectName}JwtRefreshSecretKeyParameter`,
      {
        parameterName: `/${projectName}/jwt-refresh-secret-key`,
        stringValue: jwtRefreshSecretKeyParameterValue,
        description: 'JWT refresh secret key',
      },
    );
    /**
     *
     *
     *
     * NETWORKS
     *
     *
     *
     */

    // VPC
    const vpc = new ec2.Vpc(this, `${projectName}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    //Lookup the zone based on domain name
    const zone = route53.HostedZone.fromLookup(this, `${projectName}Zone`, {
      domainName: domainName,
    });

    // Create certificate in us-east-1 for CloudFront
    const certificateStack = new cdk.Stack(
      this,
      `${projectName}CertificateStack`,
      {
        env: {
          account: this.account,
          region: 'us-east-1', // Certificate must be in us-east-1 for CloudFront
        },
      },
    );

    // Create the certificate in the us-east-1 stack
    const certificate = new acm.Certificate(
      certificateStack,
      `${projectName}Certificate`,
      {
        domainName: fullSubDomainNameApp,
        validation: acm.CertificateValidation.fromDns(
          route53.HostedZone.fromLookup(
            certificateStack,
            `${projectName}ZoneForCert`,
            {
              domainName: domainName,
            },
          ),
        ),
      },
    );

    /**
     *
     *
     *
     * SECURITY
     *
     *
     *
     */

    const apiSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}ApiSecurityGroup`,
      {
        vpc,
        description: 'Serurity group for API',
        allowAllOutbound: true,
      },
    );

    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow traffic from any ipv4 to port 3000',
    );

    // TODO delete after debug
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access',
    );

    /**
     *
     *
     *
     * EC2
     *
     *
     *
     */
    // IAM Role for EC2 instance
    const ec2Role = new iam.Role(this, `${projectName}EC2Role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore',
        ),
      ],
    });

    // Allow EC2 to read SSM parameters
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          dbPasswordParameter.parameterArn,
          jwtSecretKeyParameter.parameterArn,
          jwtRefreshSecretKeyParameter.parameterArn,
        ],
      }),
    );

    codeBucket.grantRead(ec2Role);

    const userData = ec2.UserData.forLinux();
    const userDataVersion = 'v1'; // bump this whenever you want user data to re-run

    // Create a start script
    const commonScript = `#!/bin/bash
  set -ex
  echo "Starting services and application..."
  cd /var/www/app
  
  # Create .env file with all variables including sensitive ones
cat > .env << EOF
PORT=3000
DEBUG_PORT=9229
NODE_ENV=${config.targetNodeEnv}
SITE_ORIGIN=${config.siteOrigin}
DB_HOST=db
DB_PORT=5432
DB_DATABASE=${config.databaseName}
DB_USERNAME=${config.databaseUsername}
REDIS_PORT=6379
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800
BCRYPT_SALT_ROUNDS=8
DB_PASSWORD=\$(aws ssm get-parameter --name "/${projectName}/db-password" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
JWT_SECRET_KEY=\$(aws ssm get-parameter --name "/${projectName}/jwt-secret-key" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
JWT_REFRESH_SECRET_KEY=\$(aws ssm get-parameter --name "/${projectName}/jwt-refresh-secret-key" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
EOF

`;
    const startScript = `
${commonScript}
  docker-compose -f docker-compose-dev.yml up api-build
  docker-compose -f docker-compose-dev.yml up api-run db redis -d
  sleep 30
  docker-compose exec -T api-run npm run migration:run
  rm -f .env
`;

    const restartScript = `
${commonScript}
  docker-compose -f docker-compose-dev.yml run api-build
  docker-compose -f docker-compose-dev.yml restart api-run db redis
  sleep 30
  docker-compose exec -T api-run npm run migration:run
  rm -f .env
`;

    userData.addCommands(
      'set -ex',
      `echo "UserData version: ${userDataVersion}"`,
      'yum update -y',
      'yum install -y docker git unzip',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      'chmod 666 /var/run/docker.sock',

      // Install Docker Compose plugin (pinned version)
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'curl -SL https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      // Also create a symlink for backward compatibility
      'ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose',
      'docker-compose --version',

      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      'unzip -q awscliv2.zip',
      './aws/install',
      'mkdir -p /var/www/app',
      'chown ec2-user:ec2-user /var/www/app',
      'cd /var/www/app',
      `aws s3 sync s3://${codeBucket.bucketName}/ . --region ${this.region}`,
      'chown -R ec2-user:ec2-user /var/www/app',
      // Make and run the setup script
      `cat > /var/www/app/setup.sh << 'EOL'\n${startScript}\nEOL`,
      `cat > /var/www/app/restart.sh << 'EOL'\n${restartScript}\nEOL`,
      'chmod +x /var/www/app/setup.sh',
      'chmod +x /var/www/app/restart.sh',
      'cd /var/www/app && ./setup.sh',
    );

    const keyPair = new ec2.CfnKeyPair(this, `${projectName}KeyPair`, {
      keyName: `${projectName}-key`,
    });

    const ec2Instance = new ec2.Instance(this, `${projectName}EC2Instance`, {
      vpc,
      securityGroup: apiSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role: ec2Role,
      userData: userData,
      userDataCausesReplacement: true,
      instanceName: `${projectName}-instance-${userDataVersion}`,
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        `${projectName}KeyPairRef`,
        keyPair.keyName,
      ),
    });

    // Tag instance for easy SSM targeting
    cdk.Tags.of(ec2Instance).add('Name', `${projectName}-ec2`);

    /**
     *
     *
     *
     * FRONTEND PREPARING AND ROUTE53
     *
     *
     *
     */

    // S3 bucket for frontend
    const frontendBucket = new s3.Bucket(this, `${projectName}FrontendBucket`, {
      bucketName: `${projectName}-frontend-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
    });

    // add cloudfront distribution to handle https
    const distribution = new cloudfront.Distribution(
      this,
      `${projectName}Distribution`,
      {
        defaultBehavior: {
          // Frontend as default behavior
          origin: new origins.S3StaticWebsiteOrigin(frontendBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        additionalBehaviors: {
          '/api/*': {
            // API behavior
            origin: new origins.HttpOrigin(ec2Instance.instancePublicDnsName, {
              httpPort: 3000,
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            }),
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
        },

        domainNames: [fullSubDomainNameApp],
        certificate: certificate,
      },
    );

    new route53.ARecord(this, `${projectName}ARecord`, {
      zone: zone,
      recordName: subDomainNameApp,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution),
      ),
    });

    /**
     *
     *
     *
     * USER DEPLOYER
     *
     *
     *
     */

    // Add IAM user to deploy code
    const userDeploer = new iam.User(this, `${projectName}Deployer`, {
      userName: userDeploerName,
    });

    userDeploer.attachInlinePolicy(
      new iam.Policy(this, `${projectName}DeployerPolicy`, {
        policyName: `publish-to-${projectName}`,
        statements: [
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:ssm:${this.region}:${this.account}:parameter/${projectName}*`,
            ],
          }),

          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [
              `arn:aws:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}`,
              `arn:aws:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}/*`,
            ],
          }),

          // Allow publishing artifacts to the dedicated code bucket
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [codeBucket.bucketArn, `${codeBucket.bucketArn}/*`],
          }),

          // Allow publishing frontend artifacts to the dedicated frontend bucket
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [
              frontendBucket.bucketArn,
              `${frontendBucket.bucketArn}/*`,
            ],
          }),

          // Allow triggering SSM RunCommand to restart docker on the instance
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'ssm:SendCommand',
              'ssm:ListCommandInvocations',
              'ssm:ListCommands',
              'ssm:GetCommandInvocation',
            ],
            resources: ['*'],
          }),

          // EC2 permissions for EB environment management
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ec2:Describe*'],
            resources: ['*'],
          }),

          // CloudWatch Logs permissions
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:*'],
            resources: ['*'],
          }),

          // CloudFront permissions
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudfront:CreateInvalidation'],
            resources: ['*'],
          }),
        ],
      }),
    );

    /**
     *
     *
     *
     * OUTPUTS
     *
     *
     *
     */

    // Output the ec2 key pair ID (you'll need to get private key from AWS console)
    new cdk.CfnOutput(this, 'KeyPairId', {
      value: keyPair.getAtt('KeyPairId').toString(),
    });
    new cdk.CfnOutput(this, 'CodeBucketName', {
      value: codeBucket.bucketName,
      description: 'S3 bucket for code deployment',
    });

    // Output the EC2 instance ID
    new cdk.CfnOutput(this, 'EC2 InstanceId', {
      value: ec2Instance.instanceId,
      description: 'EC2 instance ID',
    });

    new cdk.CfnOutput(this, 'UserDeploerName', {
      value: userDeploerName,
      description: 'User deployer name',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend deployment',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
