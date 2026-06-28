# Task 12: AWS CDK Infrastructure & Deployment

**Status:** Not started
**Parent:** Task 12 — Deployment, CI/CD
**Estimated total:** ~22–30 hours

---

## Overview

Provision AWS infrastructure via AWS CDK for deploying the invoice-data app to a **single EC2 instance** running all services (Next.js app, worker, Postgres) inside Docker containers. An attached EBS volume provides persistence for database data and application files across instance restarts. HTTPS is configured from day one via CloudFront + ACM.

---

## Architecture Decision

### Simplified from rag-aiguide Reference

The rag-aiguide `infra-stack.ts` is the **closest reference** but has parts we don't need. Here's what we **keep** vs **strip**:

**KEEP (relevant):**
- S3 code bucket + `BucketDeployment` (code delivery to instance)
- SSM parameters for secrets (db password, JWT keys)
- CloudFront distribution with ACM certificate (HTTPS)
- Route53 ARecord → CloudFront (DNS resolution)
- EBS volume pattern (create/import, `CfnVolumeAttachment`)
- EC2 with user-data script
- ACM certificate in us-east-1 for CloudFront

**STRIP (redundant / project-specific):**
- VPC — use EC2 default VPC (single instance, no network isolation needed)
- ACM certificate validation (DNS via hosted zone) — still needed but simpler
- livekitApiSecretParameter, awsSecretAccessKeyParameter — video-meet specific
- Route53 alias record complexity — simplified for our use case

**KEPT (important, from rag-aiguide):**
- S3 frontend bucket + CloudFront (static assets served by CDN, API proxied to EC2)
- User deployer IAM user (needed for future GitHub Actions CI/CD)

### Final Architecture

```
User → CloudFront (HTTPS)
    ├─ *.poct-test.click/* → S3 frontend bucket (static assets)
    └─ /api/* → EC2 instance:3010 (API routes + SSR)
                          ↕ EBS (4 GB GP3)
                                /mnt/ebs/postgres_data
                                /mnt/ebs/invoice_data
```

**DNS:** `ingen.poct-test.click` → CloudFront ARecord via `poct-test.click` hosted zone

---

## Architecture Detail — Dual-Origin CloudFront

```
User → CloudFront (HTTPS)
    ├─ *.poct-test.click/* → S3 frontend bucket (static assets: JS, CSS, HTML)
    └─ /api/* → EC2 instance:3010 (Next.js API routes + SSR)
                          ↕ EBS (4 GB GP3)
                                /mnt/ebs/postgres_data
                                /mnt/ebs/invoice_data
```

**Build + deploy flow:**
1. App built locally (`next build`)
2. `dist/` assets uploaded to S3 frontend bucket (CDK `BucketDeployment`)
3. CloudFront serves static files from S3 (cached globally)
4. `/api/*` requests proxied to EC2 instance (port 3010, HTTP)

**Why S3 frontend?**
- Next.js produces static output (`next build` generates `.next/` bundle)
- CloudFront serves static files from S3 (CDN, fast, cached)
- API routes and SSR still run on EC2 (Node.js server)
- Minimal cost (S3 + CloudFront are free-tier friendly)
- Standard Next.js deployment pattern (used by rag-aiguide reference)

---

## Infrastructure Resources

| Resource | Detail |
|----------|--------|
| EC2 | t4g.medium, Amazon Linux 2023 |
| EBS | 4 GB GP3, `/dev/sdf`, retained on destroy |
| IAM | EC2 role: SSM read + bedrock:InvokeModel + S3 code bucket read |
| CloudFront | HTTPS distribution, ACM cert, 2 origins (S3 frontend + EC2 API) |
| ACM | Certificate for `ingen.poct-test.click`, validation via DNS |
| Route53 | ARecord → CloudFront for `ingen.poct-test.click` |
| SSM | /invoice-data/db-password, /invoice-data/jwt-secret-key, /invoice-data/admin-password |
| S3 code bucket | CDK deploys app source here → EC2 pulls via `aws s3 sync` |
| S3 frontend bucket | Static Next.js build output served by CloudFront |
| IAM deployer | User for future GitHub Actions CI/CD (cdk deploy, s3 push) |

---

## Implementation Breakdown

### 12.1. Initialize AWS CDK Project (unchanged)

**Description:** Create the CDK project scaffold in `infra/` using the official CDK CLI.

**Steps:**
1. Run `cdk init apptemplate --template app --language javascript`
2. Install CDK dependencies: `aws-cdk`, `constructs`
3. Create directory structure: `bin/` (stack bootstrap), `lib/` (stack code), `config/` (environment configs)
4. Add `config/default.ts` — single config (future: `prod.ts` if needed)
5. Update `package.json` with CDK scripts: `cdk:synth`, `cdk:deploy`, `cdk:destroy`

**Sub-tasks:**
- 12.1.1. `cdk init` scaffold — 0.5h
- 12.1.2. Directory structure + config files — 1h
- 12.1.3. Package.json scripts + tsconfig for infra — 0.5h

**Subtotal: 2h**

---

### 12.2. CDK Stack — S3 Buckets + SSM Secrets

**Description:** S3 buckets for code delivery + frontend static assets + SSM parameters for secrets.

**Resources:**
- **S3 code bucket:** unique name, `DESTROY` removal policy, auto-delete. App source deployed here → EC2 pulls via `aws s3 sync`.
- **S3 frontend bucket:** unique name, `DESTROY` removal policy, auto-delete, public-read ACL, `websiteIndexDocument: 'index.html'`, `blockPublicAccess: BLOCK_ACLS_ONLY`. Next.js static build output deployed here → CloudFront serves from CDN.
- **Code deployment:** `BucketDeployment` for code bucket (excludes node_modules, .git, .env, infra, docker/postgres/data)
- **Frontend deployment:** `BucketDeployment` for frontend bucket (excludes node_modules, .git, .env, infra, docker, test, dist, .next/cache)
- SSM parameters: db-password, jwt-secret-key, admin-password (randomly generated)

**Sub-tasks:**
- 12.2.1. S3 code bucket + BucketDeployment — 1h
- 12.2.2. S3 frontend bucket + BucketDeployment — 1h
- 12.2.3. SSM parameters (db password, JWT key, admin password) — 1h
- 12.2.4. IAM grant S3 read to EC2 role (code bucket) — 0.5h
- 12.2.5. IAM grant CloudFront read to frontend bucket — 0.5h

**Subtotal: 5h**

---

### 12.3. CDK Stack — CloudFront + ACM + Route53 (updated to dual-origin)

**Description:** HTTPS setup via CloudFront distribution with dual origins (S3 frontend + EC2 API).

**Resources:**
- ACM certificate for `ingen.poct-test.click` in us-east-1 (DNS validation via hosted zone)
- CloudFront distribution with 2 origins:
  - **Origin 1 (default):** S3 frontend bucket (static assets — JS, CSS, HTML)
  - **Origin 2:** EC2 instance:3010 (API routes + SSR)
- CloudFront behaviors:
  - Default `*.poct-test.click/*` → S3 frontend (caching enabled)
  - `/api/*` → EC2 (caching disabled, all headers forwarded)
- Route53 ARecord for `ingen.poct-test.click` → CloudFront alias
- HostedZone lookup for `poct-test.click`

**Sub-tasks:**
- 12.3.1. HostedZone lookup (`poct-test.click`) — 0.5h
- 12.3.2. ACM certificate + DNS validation — 0.5h
- 12.3.3. CloudFront distribution (dual-origin: S3 + EC2) — 2h
- 12.3.4. Route53 ARecord → CloudFront — 0.5h

**Subtotal: 3.5h**

---

### 12.4. CDK Stack — EC2 Instance + IAM

**Description:** EC2 instance with key pair, security group, IAM role, and user-data script.

**Resources:**
- EC2: `t4g.medium`, Amazon Linux 2023, public subnet
- Key pair: Auto-generated via `CfnKeyPair`
- Security group: ports 22 (SSH), 3010 (app), 80/443 (optional, CloudFront handles)
- IAM role: `ec2.amazonaws.com` with:
  - `AmazonSSMManagedInstanceCore` managed policy
  - `ssm:GetParameter`, `ssm:GetParameters` for SSM secrets
  - `bedrock:InvokeModel` for Bedrock access
  - S3 read on code bucket

**User-data script (bash):**
```bash
#!/bin/bash
set -ex

# 1. Mount EBS
# 2. Install Docker + Docker Compose plugin
# 3. Start + enable Docker
# 4. Install AWS CLI
# 5. Create /var/www/app, sync code from S3
# 6. Install dependencies (npm ci)
# 7. Create .env from SSM parameters
# 8. Build + start docker-compose
# 9. Clean up .env
```

**Sub-tasks:**
- 12.4.1. EC2 instance construct (t4g.medium, key pair) — 1.5h
- 12.4.2. IAM role + policies — 1h
- 12.4.3. Security group (port 3010 + SSH) — 0.5h
- 12.4.4. User-data script (install Docker, compose, AWS CLI, git) — 2h
- 12.4.5. User-data script (.env from SSM, docker-compose up, migrations) — 1.5h

**Subtotal: 6.5h**

---

### 12.5. CDK Stack — IAM Deployer User (for future CI/CD)

**Description:** IAM user for GitHub Actions CI/CD pipeline. This user will later be used by GitHub Actions to run `cdk deploy` and push artifacts to S3 buckets.

**Resources:**
- IAM user: `invoice-data-deployer`
- Inline policy with permissions:
  - `ssm:GetParameter` — read secrets from SSM
  - `s3:*` on code bucket + frontend bucket + CDK bucket
  - `s3:ListBucket` — discover buckets
  - `logs:*` — CloudWatch logs
  - `cloudfront:CreateInvalidation` — invalidate CDN cache
  - `ec2:Describe*` — EC2 management
  - `ssm:SendCommand`, `ssm:ListCommands`, `ssm:ListCommandInvocations`, `ssm:GetCommandInvocation` — SSM RunCommand for SSM managed instance

**Sub-tasks:**
- 12.5.1. IAM deployer user + inline policy — 1h
- 12.5.2. Output credentials (user name, access key) via CfnOutput — 0.5h

**Subtotal: 1.5h**

---

### 12.6. CDK Stack — EBS Volume

**Description:** EBS volume with first-deploy/create and redeploy/import logic.

**Resources:**
- EBS volume: `GP3`, 4 GB, `RETAIN` removal policy, device `/dev/sdf`
- `CfnVolumeAttachment` → EC2
- Import logic: if `dbVolumeId` provided in config → import; else create new

**User-data mount script (from video-meet reference):**
```bash
# mount-ebs.sh
DEVICE=/dev/nvme1n1   # verify on Amazon Linux 2023 (may be /dev/nvme2n1)
if ! blkid $DEVICE; then
  mkfs -t ext4 $DEVICE
fi
mkdir -p /mnt/ebs/{invoice_data,postgres_data}
mount $DEVICE /mnt/ebs
UUID=$(blkid -s UUID -o value $DEVICE)
grep -q "$UUID" /etc/fstab || \
  echo "UUID=$UUID /mnt/ebs ext4 defaults,nofail 0 2" >> /etc/fstab
chown -R 999:999 /mnt/ebs/postgres_data
```

**Sub-tasks:**
- 12.6.1. EBS volume construct (create/import logic) — 1.5h
- 12.6.2. Volume attachment construct — 0.5h
- 12.6.3. Mount script in user-data — 1h
- 12.6.4. First-deploy verification + documentation — 1h

**Subtotal: 4h**

---

### 12.7. Docker Compose Updates for EC2

**Description:** Update `docker-compose.yml` for production EBS mounts.

**Changes needed:**
- Replace local volume paths → `/mnt/ebs/postgres_data` and `/mnt/ebs/invoice_data`
- Add production `.env` variable overrides
- Add `restart: always` for all services
- Add health checks for Postgres
- Remove `ports` mapping (CloudFront handles access)
- Ensure `NODE_ENV=production` in prod env

**Sub-tasks:**
- 12.7.1. Update postgres volume path — 0.5h
- 12.7.2. Add invoice_data mount — 0.5h
- 12.7.3. Adjust environment variables for production — 0.5h
- 12.7.4. Add restart policies + health checks — 0.5h
- 12.7.5. Verify docker-compose validates (dry-run) — 0.5h

**Subtotal: 2.5h**

---

### 12.8. Deployment Verification

**Description:** Full deployment run, verify services, test data persistence.

**Sub-tasks:**
- 12.8.1. Bootstrap CDK (`cdk bootstrap`) — 0.5h
- 12.8.2. Deploy stack (`cdk deploy`) — 0.5h
- 12.8.3. SSH into instance, verify Docker containers running — 0.5h
- 12.8.4. Verify EBS mounted, Postgres data persistent — 0.5h
- 12.8.5. Verify HTTPS works (`https://ingen.poct-test.click`) — 0.5h
- 12.8.6. Verify app login works, health check passes — 0.5h
- 12.8.7. Document: SSH key retrieval, instance access, next steps — 0.5h

**Subtotal: 3.5h**

---

## Total Estimate

| Sub-task | Hours |
|----------|-------|
| 12.1. CDK project init | 2h |
| 12.2. S3 code buckets + SSM secrets | 5h |
| 12.3. CloudFront + ACM + Route53 | 3.5h |
| 12.4. EC2 + IAM + user-data | 6.5h |
| 12.5. IAM deployer user (CI/CD) | 1.5h |
| 12.6. EBS volume + mount | 4h |
| 12.7. Docker Compose updates | 2.5h |
| 12.8. Deployment verification | 3.5h |
| **Total** | **~27h** |

**Range:** 22–30h (includes buffer for AWS quirks, DNS propagation, CloudFront cache delays, first-boot debugging, S3 bucket name conflicts)

---

## Configuration

### `config/default.ts`

```typescript
export const config = {
  projectName: 'invoice-data',
  domainName: 'poct-test.click',
  fullSubDomainNameApp: 'ingen.poct-test.click',
  subDomainNameApp: 'ingen',
  instanceType: 't4g.medium',
  ebsSizeGb: 4,
  targetNodeEnv: 'production',
  databaseName: 'invoice',
  databaseUsername: 'invoice',
  region: 'us-east-1', // ACM cert must be us-east-1
  dbVolumeId: '', // set after first deploy
  userDataVersion: 'v1',
};
```

---

## Key Decisions (Confirmed by User)

| Decision | Value |
|----------|-------|
| EC2 instance | **t4g.medium** |
| EBS size | **4 GB GP3** (increase later if needed) |
| Code delivery | **S3 bucket** (CDK BucketDeployment) |
| SSH key | **Auto-generated** by CDK (key pair ID output) |
| HTTPS | **Yes, from start** — CloudFront + ACM |
| Hosted zone | `poct-test.click` |
| Subdomain | `ingen.poct-test.click` |
| Reference | rag-aiguide `infra-stack.ts` (stripped of VPC, video, Redis parts) |
| EBS pattern source | video-meet `infra-stack.ts` |

---

## Post-Implementation Notes (not in scope)

- CI/CD pipeline (GitHub Actions → `cdk deploy`) — future
- Monitoring (CloudWatch, alarms) — future
- EBS snapshots / backup strategy — future
- Scaling (horizontal) — not needed for single instance
- WAF on CloudFront — future
- Rate limiting — future

---

## Files to Create/Modify

### New files:
- `infra/package.json`
- `infra/tsconfig.json`
- `infra/cdk.json` (CDK config)
- `infra/bin/infra.ts` (stack bootstrap)
- `infra/lib/infra-stack.ts` (main CDK stack)
- `infra/config/index.ts` (config loader)
- `infra/config/default.ts` (default config)
- `infra/.env` (CDK environment: AWS region, profile)
- `infra/README.md` (deployment instructions)

### Modified files:
- `docker-compose.yml` (EBS bind mounts, production env, restart policies)
- `.env.example` (production vars reference)
