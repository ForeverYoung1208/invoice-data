# Infrastructure (AWS CDK)

AWS CDK Infrastructure as Code for deploying the invoice-data app.

## Architecture

```
User → CloudFront (HTTPS) → EC2:3010 → Docker (Next.js + Worker + Postgres)
                                              ↕ EBS (/docker)
```

## AWS Resources Provisioned

| Resource | Purpose |
|----------|---------|
| EC2 t4g.medium | Compute instance running Docker |
| EBS 4GB GP3 | Persistent storage for Postgres + app data |
| Elastic IP | Stable IP for CloudFront origin |
| S3 Code Bucket | Artifact delivery to EC2 |
| CloudFront | HTTPS termination + CDN |
| ACM Certificate | SSL/TLS for ingen.poct-test.click |
| Route53 | DNS for ingen.poct-test.click |
| IAM Deployer User | Future CI/CD access |

## Files

- `bin/infra.ts` — CDK app entry point
- `lib/infra-stack.ts` — Main CDK stack
- `config/default.ts` — Configuration values
- `cdk.json` — CDK toolkit configuration

## Deploy

```bash
# Synthesize CloudFormation template
cdk synth

# Deploy to AWS
cdk deploy

# Show diff
cdk diff
```

## Post-Deploy Outputs

After deployment, the following CloudFormation outputs are available:
- `InstanceId` — EC2 instance ID
- `PublicIP` — EC2 public IP  
- `ElasticIP` — Elastic IP allocation ID
- `CodeBucketName` — S3 bucket for code delivery
- `DeployerUserName` — IAM user for CI/CD
- `DistributionDomainName` — CloudFront domain (e.g., d1234567890.cloudfront.net)
- `EBSVolumeId` — EBS volume ID (use as dbVolumeId for redeploys)

## EBS Mount Point

The EBS volume is mounted at `/docker` on the EC2 instance:
- `/docker/postgres/data` — Postgres data directory
- `/docker/app-files/data` — Application data (CSV uploads, generated invoices)

## Development Notes

- The user-data script automatically:
  1. Mounts EBS at /docker
  2. Installs Docker
  3. Syncs code from S3
  4. Builds the Next.js app
  5. Starts Docker Compose

- SSM Parameters created:
  - `/{projectName}/db-password`
  - `/{projectName}/auth-secret`
  - `/{projectName}/admin-password`
  - `/{projectName}/auth-url`
  - `/{projectName}/auth-trust-host`

- For redeployment, set `dbVolumeId` in config to preserve existing data.