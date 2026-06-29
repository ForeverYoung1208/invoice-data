import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { config } from '../config';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props?.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
        region: config.region, // us-east-1 for ACM + CloudFront
      },
    });

    // ============================================================
    // 12.2 S3 Code Bucket + SSM Secrets
    // ============================================================

    // Private S3 bucket for code/artifact delivery to EC2
    const codeBucket = new s3.Bucket(this, 'CodeBucket', {
      bucketName: `${config.projectName}-code-${cdk.Aws.ACCOUNT_ID}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy code to S3 bucket
    new s3deploy.BucketDeployment(this, 'CodeDeployment', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '..', '..'), {
          exclude: [
            'node_modules',
            '.git',
            '.env*',
            'infra',
            'dist',
            'test',
            'tests',
            'docker/postgres/data',
            'docker/app-files/data',
            '.next/cache',
            '.next/server',
            '*.log',
            '.env.local',
            '.env.production',
          ],
        }),
      ],
      destinationBucket: codeBucket,
    });

    // Create VPC for EC2 (single public subnet)
    const vpc = new ec2.Vpc(this, 'MainVPC', {
      cidr: '10.0.0.0/24',
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 28,
        },
      ],
    });
    const availabilityZone = vpc.availabilityZones[0];

    // SSM Parameters for secrets
    const dbPasswordParam = new ssm.StringParameter(this, 'DbPassword', {
      parameterName: `/${config.projectName}/db-password`,
      stringValue: 'change-me-in-production',
      tier: ssm.ParameterTier.STANDARD,
    });

    const authSecretParam = new ssm.StringParameter(this, 'AuthSecret', {
      parameterName: `/${config.projectName}/auth-secret`,
      stringValue: 'change-me-in-production-auth-secret',
      tier: ssm.ParameterTier.STANDARD,
    });

    const adminPasswordParam = new ssm.StringParameter(this, 'AdminPassword', {
      parameterName: `/${config.projectName}/admin-password`,
      stringValue: 'change-me-admin',
      tier: ssm.ParameterTier.STANDARD,
    });

    const authUrlParam = new ssm.StringParameter(this, 'AuthUrl', {
      parameterName: `/${config.projectName}/auth-url`,
      stringValue: config.authUrl,
      tier: ssm.ParameterTier.STANDARD,
    });

    const authTrustHostParam = new ssm.StringParameter(this, 'AuthTrustHost', {
      parameterName: `/${config.projectName}/auth-trust-host`,
      stringValue: config.authTrustHost,
      tier: ssm.ParameterTier.STANDARD,
    });

    // ============================================================
    // 12.4 EC2 Instance + IAM
    // ============================================================

    // Get latest Amazon Linux 2023 AMI
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    });

    // EC2 IAM Role
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore',
        ),
      ],
    });

    // Add S3 read permissions for code bucket
    codeBucket.grantRead(ec2Role);

    // Add SSM parameter read permissions
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          dbPasswordParam.parameterArn,
          authSecretParam.parameterArn,
          adminPasswordParam.parameterArn,
          authUrlParam.parameterArn,
          authTrustHostParam.parameterArn,
        ],
      }),
    );

    // Security Group - allow SSH and port 3010 for CloudFront origin
    const sg = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    // SSH from anywhere (in production, restrict to admin IP)
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');

    // Port 3010 for Next.js app
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3010), 'Next.js app');

    // EC2 Instance
    const instance = new ec2.Instance(this, 'EC2Instance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: new ec2.InstanceType(config.instanceType),
      machineImage: ami,
      securityGroup: sg,
      role: ec2Role,
    });

    // Elastic IP for stable address
    const eip = new ec2.CfnEIP(this, 'ElasticIP', {
      domain: 'vpc',
      instanceId: instance.instanceId,
    });

    // User data script
    const userDataScript = `set -ex

# 1. Wait for EC2 to be ready
sleep 30

# 2. Mount EBS volume at /docker
DEVICE=$(lsblk -ndo NAME,TYPE | grep disk | head -1 | awk '{print "/dev/"$1}')
if ! blkid $DEVICE; then
  mkfs -t ext4 $DEVICE
fi
mkdir -p /docker
mount $DEVICE /docker
UUID=$(blkid -s UUID -o value $DEVICE)
grep -q "$UUID" /etc/fstab || echo "UUID=$UUID /docker ext4 defaults,nofail 0 2" >> /etc/fstab
mkdir -p /docker/postgres/data /docker/app-files/data
chown -R 999:999 /docker/postgres/data

# 3. Install Docker
dnf update -y
dnf install -y docker git curl unzip
service docker start
usermod -a -G docker ec2-user
systemctl enable docker

# 4. Install AWS CLI v2
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# 5. Create app directory and sync code from S3
mkdir -p /var/www/app
aws s3 sync s3://${codeBucket.bucketName} /var/www/app --delete

# 6. Install dependencies and build
cd /var/www/app
npm ci --legacy-peer-deps || npm install
npm run build

# 7. Create .env from SSM parameters
export AWS_DEFAULT_REGION=${config.region}
DB_PASSWORD=$(aws ssm get-parameter --name /${config.projectName}/db-password --with-decryption --query Parameter.Value --output text)
AUTH_SECRET=$(aws ssm get-parameter --name /${config.projectName}/auth-secret --with-decryption --query Parameter.Value --output text)
ADMIN_PASSWORD=$(aws ssm get-parameter --name /${config.projectName}/admin-password --with-decryption --query Parameter.Value --output text)
AUTH_URL=$(aws ssm get-parameter --name /${config.projectName}/auth-url --query Parameter.Value --output text)
AUTH_TRUST_HOST=$(aws ssm get-parameter --name /${config.projectName}/auth-trust-host --query Parameter.Value --output text)

cat > /var/www/app/.env << ENVEOF
NODE_ENV=production
PORT=3010
DATABASE_URL=postgresql://${config.databaseUsername}:$DB_PASSWORD@postgres:5432/${config.databaseName}
AUTH_SECRET=$AUTH_SECRET
AUTH_URL=$AUTH_URL
AUTH_TRUST_HOST=$AUTH_TRUST_HOST
ADMIN_USER=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
DATA_DIR=/data
ENVEOF

# 8. Start Docker Compose
cd /var/www/app
docker compose up -d --build

# 9. Clean up .env for security
rm -f /var/www/app/.env
`;

    instance.addUserData(userDataScript);

    // ============================================================
    // 12.6 EBS Volume
    // ============================================================

    const ebsVolume = new ec2.Volume(this, 'DataVolume', {
      size: cdk.Size.gibibytes(4),
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      availabilityZone,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encrypted: true,
    });

    // Attach EBS to EC2
    new ec2.CfnVolumeAttachment(this, 'EBSAttachment', {
      volumeId: ebsVolume.volumeId,
      device: '/dev/sdf',
      instanceId: instance.instanceId,
    });

    // ============================================================
    // 12.3 CloudFront + ACM + Route53 (using L1 Cfn constructs)
    // ============================================================

    // Look up hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: config.domainName,
    });

    // ACM Certificate (must be in us-east-1 for CloudFront)
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: config.fullSubDomainNameApp,
      subjectAlternativeNames: [`*.${config.domainName}`],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // CloudFront Distribution using L1 Cfn construct
    // Note: For production, you may want to customize cache behaviors
    const distribution = new cloudfront.CfnDistribution(this, 'Distribution', {
      distributionConfig: {
        enabled: true,
        comment: `CloudFront for ${config.fullSubDomainNameApp}`,
        defaultRootObject: '/',
        priceClass: 'PriceClass_All',
        aliases: [config.fullSubDomainNameApp],
        viewerCertificate: {
          acmCertificateArn: certificate.certificateArn,
          sslSupportMethod: 'sni-only',
          minimumProtocolVersion: 'TLSv1.2_2021',
        },
        origins: [
          {
            id: 'EC2Origin',
            domainName: `${eip.attrPublicIp}.ec2.${config.region}.amazonaws.com`,
            customOriginConfig: {
              httpPort: 80,
              httpsPort: 443,
              originProtocolPolicy: 'http-only',
              originSslProtocols: ['TLSv1.2'],
            },
          },
        ],
        defaultCacheBehavior: {
          targetOriginId: 'EC2Origin',
          viewerProtocolPolicy: 'redirect-to-https',
          allowedMethods: [
            'GET',
            'HEAD',
            'OPTIONS',
            'PUT',
            'POST',
            'PATCH',
            'DELETE',
          ],
          cachedMethods: ['GET', 'HEAD'],
          compress: true,
          forwardedValues: {
            queryString: true,
            cookies: {
              forward: 'all',
            },
            headers: ['*'],
          },
        },
        cacheBehaviors: [
          {
            pathPattern: '/_next/static/*',
            targetOriginId: 'EC2Origin',
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD'],
            cachedMethods: ['GET', 'HEAD'],
            compress: true,
            defaultTtl: cdk.Duration.days(30).toSeconds(),
            maxTtl: cdk.Duration.days(30).toSeconds(),
            minTtl: cdk.Duration.days(1).toSeconds(),
            forwardedValues: {
              queryString: false,
              cookies: { forward: 'none' },
              headers: ['Accept', 'Host', 'User-Agent'],
            },
          },
        ],
      },
    });

    // Route53 CNAME pointing to CloudFront distribution
    new route53.CnameRecord(this, 'AppCnameRecord', {
      zone: hostedZone,
      recordName: config.fullSubDomainNameApp,
      domainName: distribution.attrDomainName,
    });

    // ============================================================
    // 12.5 IAM Deployer User (for future CI/CD)
    // ============================================================

    const deployerUser = new iam.User(this, 'DeployerUser', {
      userName: `${config.projectName}-deployer`,
    });

    // Inline policy for deployer permissions
    deployerUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParameterHistory',
        ],
        resources: [
          dbPasswordParam.parameterArn,
          authSecretParam.parameterArn,
          adminPasswordParam.parameterArn,
          authUrlParam.parameterArn,
          authTrustHostParam.parameterArn,
        ],
      }),
    );

    deployerUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['s3:*'],
        resources: [codeBucket.arnForObjects('*'), codeBucket.bucketArn],
      }),
    );

    deployerUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['logs:*'],
        resources: ['*'],
      }),
    );

    deployerUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetDistribution',
          'cloudfront:ListDistributions',
        ],
        resources: ['*'],
      }),
    );

    deployerUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ec2:Describe*'],
        resources: ['*'],
      }),
    );

    deployerUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'ssm:SendCommand',
          'ssm:ListCommands',
          'ssm:ListCommandInvocations',
          'ssm:GetCommandInvocation',
        ],
        resources: ['*'],
      }),
    );

    // ============================================================
    // Outputs
    // ============================================================

    new CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'EC2 Instance ID',
      exportName: 'InstanceId',
    });

    new CfnOutput(this, 'PublicIP', {
      value: instance.instancePublicIp,
      description: 'EC2 Public IP',
      exportName: 'PublicIP',
    });

    new CfnOutput(this, 'ElasticIPAllocation', {
      value: eip.ref,
      description: 'Elastic IP Allocation ID',
      exportName: 'ElasticIP',
    });

    new CfnOutput(this, 'CodeBucketName', {
      value: codeBucket.bucketName,
      description: 'S3 Code Bucket Name',
      exportName: 'CodeBucketName',
    });

    new CfnOutput(this, 'DeployerUserName', {
      value: deployerUser.userName,
      description: 'IAM Deployer User Name (create access key manually)',
      exportName: 'DeployerUserName',
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: distribution.attrDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: 'DistributionDomainName',
    });

    // Volume ID for import on redeploy
    new CfnOutput(this, 'EBSVolumeId', {
      value: ebsVolume.volumeId,
      description: 'EBS Volume ID (use as dbVolumeId for redeploys)',
      exportName: 'EBSVolumeId',
    });
  }
}
