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
import { IAppStackConfig, TARGET_ENV } from '../bin/infra';

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
      dockerComposeFileName,
      targetNodeEnv,
      appDir,
      appPort,
      ebsDeviceName,
      ebsVolumeSizeGIB,
    } = config;

    const isProd = targetNodeEnv === TARGET_ENV.PROD;
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
    const codeDeployment = new s3deploy.BucketDeployment(
      this,
      `${projectName}CodeDeployment`,
      {
        sources: [
          s3deploy.Source.asset('../', {
            exclude: [
              'node_modules',
              '.git',
              '.env',
              '.next',
              '.kiro',
              '.kilo',
              '.codex',
              '.devin',
              '.agents',
              '.pi',
              '.playwright-mcp',
              '.playwright-cli',
              '.vscode',
              'infra',
              'dist',
              'test',
              'test-results',
              'tests-playwright',
              'docker',
              'docker/postgres/data',
              'docker/app-files/data',
              'screenshots',
            ],
          }),
        ],
        destinationBucket: codeBucket,
      },
    );

    // SSM Parameters
    const dbPasswordParameter = new ssm.StringParameter(
      this,
      `${projectName}DbPasswordParameter`,
      {
        parameterName: `/${projectName}/db-password`,
        stringValue: config.databasePasswordParameterValue,
        description: 'DB password',
      },
    );
    const authSecretParameter = new ssm.StringParameter(
      this,
      `${projectName}AuthSecretParameter`,
      {
        parameterName: `/${projectName}/auth-secret`,
        stringValue: config.authSecretParameterValue,
        description: 'NextAuth AUTH_SECRET value',
      },
    );
    const adminPasswordParameter = new ssm.StringParameter(
      this,
      `${projectName}AdminPasswordParameter`,
      {
        parameterName: `/${projectName}/admin-password`,
        stringValue: config.adminPasswordParameterValue,
        description: 'Initial admin user password',
      },
    );
    const llmApiKeyParameter = new ssm.StringParameter(
      this,
      `${projectName}LlmApiKeyParameter`,
      {
        parameterName: `/${projectName}/llm-api-key`,
        stringValue: config.llmApiKeyParameterValue,
        description: 'LLM API key for OpenAI-compatible endpoint',
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

    const appSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}AppSecurityGroup`,
      {
        vpc,
        description: 'Security group for the Next.js application server',
        allowAllOutbound: true,
      },
    );

    appSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(appPort),
      `Allow CloudFront origin traffic to the Next.js server on port ${appPort}`,
    );

    // TODO delete after debug
    appSecurityGroup.addIngressRule(
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
          authSecretParameter.parameterArn,
          adminPasswordParameter.parameterArn,
          llmApiKeyParameter.parameterArn,
        ],
      }),
    );

    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
      }),
    );

    codeBucket.grantRead(ec2Role);

    const userData = ec2.UserData.forLinux();
    const userDataVersion = 'v2'; // bump this whenever you want user data to re-run

    // Create a start script
    const commonScript = `#!/bin/bash
  set -ex
  echo "Starting services and application..."
  cd ${appDir}
  
  # Create .env file with all variables including sensitive ones
cat > .env << EOF
PORT=${appPort}
DEBUG_PORT=9229
NODE_ENV=${config.targetNodeEnv}
TYPEORM_HOST=${config.databaseHost}
TYPEORM_PORT=${config.databasePort}
TYPEORM_DATABASE=${config.databaseName}
TYPEORM_USERNAME=${config.databaseUsername}
TYPEORM_PASSWORD=\$(aws ssm get-parameter --name "/${projectName}/db-password" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
DATABASE_URL=postgresql://${config.databaseUsername}:\$(aws ssm get-parameter --name "/${projectName}/db-password" --with-decryption --query "Parameter.Value" --output text --region ${this.region})@db:5432/${config.databaseName}
AUTH_SECRET=\$(aws ssm get-parameter --name "/${projectName}/auth-secret" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
AUTH_URL=https://${fullSubDomainNameApp}
AUTH_TRUST_HOST=true
ADMIN_USER=${config.adminUser}
ADMIN_PASSWORD=\$(aws ssm get-parameter --name "/${projectName}/admin-password" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
LLM_BASE_URL=${config.llmBaseUrl}
LLM_API_KEY=\$(aws ssm get-parameter --name "/${projectName}/llm-api-key" --with-decryption --query "Parameter.Value" --output text --region ${this.region})
LLM_MODEL=${config.llmModel}
POLL_INTERVAL_MS=${config.pollIntervalMs}
NEXT_ALLOWED_DEV_ORIGINS=localhost,127.0.0.1,${fullSubDomainNameApp}
EOF

`;
    const startScript = `
${commonScript}
  docker compose -f ${dockerComposeFileName} build
  docker compose -f ${dockerComposeFileName} up db -d
  docker compose -f ${dockerComposeFileName} run --rm app npm install
  ${isProd ? `docker compose -f ${dockerComposeFileName} run --rm app npm run build` : ''}
  sleep 20
  docker compose -f ${dockerComposeFileName} run --rm app npm run migration:run
  docker compose -f ${dockerComposeFileName} run --rm app npm run db:seed

  docker compose -f ${dockerComposeFileName} up app worker -d --force-recreate
`;

    const restartScript = `
${commonScript}
  docker compose -f ${dockerComposeFileName} build
  docker compose -f ${dockerComposeFileName} up db -d
  docker compose -f ${dockerComposeFileName} run --rm app npm install
  ${isProd ? `docker compose -f ${dockerComposeFileName} run --rm app npm run build` : ''}
  sleep 20
  docker compose -f ${dockerComposeFileName} run --rm app npm run migration:run
  docker compose -f ${dockerComposeFileName} run --rm app npm run db:seed

  docker compose -f ${dockerComposeFileName} up app worker -d --force-recreate
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
      `mkdir -p ${appDir}`,
      `chown -R ec2-user:ec2-user ${appDir}`,
      `DEVICE_PATH=$(readlink -f ${ebsDeviceName} || true)`,
      `if [ -z "$DEVICE_PATH" ]; then DEVICE_PATH=$(readlink -f /dev/xvdf || true); fi`,
      `if [ -z "$DEVICE_PATH" ]; then DEVICE_PATH=$(lsblk -ndo NAME,TYPE | awk '$2=="disk" && $1!="nvme0n1" {print "/dev/"$1; exit}'); fi`,
      'while [ -z "$DEVICE_PATH" ] || [ ! -b "$DEVICE_PATH" ]; do sleep 2; DEVICE_PATH=$(readlink -f /dev/xvdf || true); done',
      'if ! blkid "$DEVICE_PATH"; then mkfs -t ext4 "$DEVICE_PATH"; fi',
      `mkdir -p ${appDir}/docker`,
      'VOLUME_UUID=$(blkid -s UUID -o value "$DEVICE_PATH")',
      `grep -q "$VOLUME_UUID" /etc/fstab || echo "UUID=$VOLUME_UUID ${appDir}/docker ext4 defaults,nofail 0 2" >> /etc/fstab`,
      `mountpoint -q ${appDir}/docker || mount ${appDir}/docker`,

      '# Create swap file for t3.small instances (2GB RAM)',
      'if [ ! -f /swapfile ]; then',
      '  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096',
      '  chmod 600 /swapfile',
      '  mkswap /swapfile',
      '  swapon /swapfile',
      "  echo '/swapfile none swap sw 0 0' >> /etc/fstab",
      'fi',
      'swapon --show',

      `mkdir -p ${appDir}/docker/app-files/data ${appDir}/docker/postgres/data`,
      `chown -R ec2-user:ec2-user ${appDir}/docker`,
      `cd ${appDir}`,
      `aws s3 sync s3://${codeBucket.bucketName}/ . --region ${this.region}`,
      // Copy template files to data directory
      `mkdir -p ${appDir}/docker/app-files/data`,
      `cp -r ${appDir}/deploy/templates/* ${appDir}/docker/app-files/data/ 2>/dev/null || true`,
      `chown -R ec2-user:ec2-user ${appDir}`,
      // Make and run the setup script
      `cat > ${appDir}/setup.sh << 'EOL'\n${startScript}\nEOL`,
      `cat > ${appDir}/restart.sh << 'EOL'\n${restartScript}\nEOL`,
      `chmod +x ${appDir}/setup.sh`,
      `chmod +x ${appDir}/restart.sh`,
      `cd ${appDir} && ./setup.sh`,
    );

    const keyPair = new ec2.CfnKeyPair(this, `${projectName}KeyPair`, {
      keyName: `${projectName}-key`,
    });

    const ec2Instance = new ec2.Instance(this, `${projectName}EC2Instance`, {
      vpc,
      securityGroup: appSecurityGroup,
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
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(10, {
            deleteOnTermination: false,
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
        {
          deviceName: ebsDeviceName,
          volume: ec2.BlockDeviceVolume.ebs(ebsVolumeSizeGIB, {
            deleteOnTermination: false,
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        `${projectName}KeyPairRef`,
        keyPair.keyName,
      ),
    });

    // Make EC2 instance depend on code deployment to ensure files are uploaded before instance launches
    ec2Instance.node.addDependency(codeDeployment);

    // Tag instance for easy SSM targeting
    cdk.Tags.of(ec2Instance).add('Name', `${projectName}-ec2`);

    /**
     *
     *
     *
     * CLOUDFRONT AND ROUTE53
     *
     *
     *
     */

    // CloudFront terminates HTTPS and forwards requests to the Next.js server.
    const distribution = new cloudfront.Distribution(
      this,
      `${projectName}Distribution`,
      {
        defaultBehavior: {
          origin: new origins.HttpOrigin(ec2Instance.instancePublicDnsName, {
            httpPort: appPort,
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            connectionTimeout: cdk.Duration.seconds(10),
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
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

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'PersistentDockerDirectory', {
      value: `${appDir}/docker`,
      description:
        'Mounted 4GB EBS volume used for database and user files, plus 4GB swap file on root volume',
    });
  }
}
