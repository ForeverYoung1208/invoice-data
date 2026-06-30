# Task 12: AWS CDK Infrastructure & Deployment

**Status:** In progress
**Parent:** Task 12 — Deployment, CI/CD
**Estimated total:** ~22–27 hours

---

## Overview

Provision AWS infrastructure via AWS CDK for deploying the invoice-data app to a **single EC2 instance** running all services (Next.js app, worker, Postgres) inside Docker containers. An attached EBS volume provides persistence for database data and application files across instance restarts. HTTPS is configured from day one via CloudFront + ACM.

**Current implementation note:** `infra/lib/infra-stack.ts` has been adapted from the reference project to use CloudFront with the EC2-hosted Next.js server as the single origin. The obsolete frontend S3 website bucket was removed. The stack now mounts a 4 GB encrypted GP3 EBS block device at `/var/www/app/docker`, and the remote Docker Compose files bind `./docker/postgres/data` and `./docker/app-files/data` from that mounted directory.

---

## Architecture Decision

### Simplified from rag-aiguide Reference (/home/ihor/study/rag-aiguide/rag-aiguide-api/infra)

The rag-aiguide `infra-stack.ts` is the **closest reference** but has parts we don't need. Here's what we **keep** vs **strip**:

**KEEP (relevant):**
- S3 code bucket + `BucketDeployment` (code delivery to instance)
- SSM parameters for secrets (db password, auth secret, admin password)
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

**ADAPTED (important, from rag-aiguide):**
- CloudFront + ACM for HTTPS, but with **EC2 as the single Next.js origin**
- S3 private code/artifact bucket for deployment delivery only
- User deployer IAM user (needed for future GitHub Actions CI/CD)

### Final Architecture

```
User → CloudFront (HTTPS)
    └─ ingen.poct-test.click/* → EC2 instance:3010 (Next.js app, API routes, SSR)
                                      ↕ EBS (4 GB GP3)
                                            /docker/postgres/data   ← postgres pg_data
                                            /docker/app-files/data  ← invoice uploads, outputs
```

**DNS:** `ingen.poct-test.click` → CloudFront ARecord via `poct-test.click` hosted zone

---

## Architecture Detail — Single-Origin CloudFront

```
User → CloudFront (HTTPS)
    └─ EC2 instance:3010 (Next.js server: pages, API routes, auth, downloads)
              ↕ EBS (4 GB GP3)
                    /docker/postgres/data   ← postgres pg_data
                    /docker/app-files/data  ← invoice uploads, outputs
```

**Build + deploy flow:**
1. App source/artifact uploaded to a private S3 code bucket by CDK `BucketDeployment`.
2. EC2 user-data syncs the artifact from S3.
3. EC2 builds/runs the serverful Next.js app with Docker Compose.
4. CloudFront terminates HTTPS and forwards requests to EC2 on port 3010.
5. Docker publishes `3010:3010` so CloudFront can reach the container through the EC2 public origin.

**Why single EC2 origin?**
- This app uses serverful Next.js (`next build` + `next start`), not static export.
- Next.js App Router pages, route handlers under `/api/*`, NextAuth, `src/proxy.ts`, task downloads, and dynamic dashboard pages all require the Node.js server.
- `next build` produces a `.next` server bundle, not a standalone `dist/` folder suitable for static S3 hosting.
- CloudFront can still cache safe framework assets such as `/_next/static/*` while forwarding application pages and APIs to the Next.js server.

**CloudFront caching behavior:**
- Default behavior `/*` → EC2 origin, HTTPS-only viewer policy, allowed methods `GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE`, cache disabled or managed `CachingDisabled`, origin request policy forwarding all cookies/query strings/headers needed by NextAuth.
- `/api/*` → EC2 origin, cache disabled, all methods allowed, all cookies/query strings forwarded. This covers task CRUD, uploads, downloads, processing triggers, auth callbacks, and health checks.
- `/_next/static/*` → EC2 origin, `GET/HEAD` only, long TTL caching enabled, compression enabled. These files are content-hashed by Next.js, so CDN caching is safe.
- Optional `/favicon.ico` and static public assets → EC2 origin, short or moderate TTL caching.
- Do not route normal pages (`/login`, `/dashboard`, `/dashboard/task/[id]`, `/api-docs`) to S3; they must reach the Next.js server.

**EBS mount on EC2:**
- EBS attached at `/dev/sdf`, mounted at `/docker`
- Docker bind mounts in `docker-compose.yml`:
  - `/docker/postgres/data` → `/var/lib/postgresql/data` (Postgres data)
  - `/docker/app-files/data` → `/data` (CSV uploads, generated invoices)

**Why not S3 frontend?**
- S3 static hosting works for static exports, but this app is not a static export.
- Splitting only `/api/*` to EC2 would break SSR/auth-protected pages because page requests are not under `/api/*`.
- Keeping a single EC2 origin is simpler and closer to how this educational project currently runs locally.

---

## Infrastructure Resources

| Resource | Detail |
|----------|--------|
| EC2 | t4g.medium, Amazon Linux 2023 |
| EBS | 4 GB GP3, `/dev/sdf`, retained on destroy |
| IAM | EC2 role: SSM read + bedrock:InvokeModel + S3 code bucket read |
| CloudFront | HTTPS distribution, ACM cert, single EC2 origin with targeted cache behaviors |
| ACM | Certificate for `ingen.poct-test.click`, validation via DNS |
| Route53 | ARecord → CloudFront for `ingen.poct-test.click` |
| SSM | /invoice-data/db-password, /invoice-data/auth-secret, /invoice-data/admin-password, /invoice-data/auth-url, /invoice-data/auth-trust-host |
| S3 code bucket | CDK deploys app source here → EC2 pulls via `aws s3 sync` |
| IAM deployer | User for future GitHub Actions CI/CD (cdk deploy, s3 push) |

---

## Implementation Breakdown

### 12.1. Initialize AWS CDK Project (unchanged)

**Description:** Create the CDK project scaffold in `infra/` using the official CDK CLI.

**Steps:**
1. Run `cdk init app --language typescript`
2. Install CDK dependencies: `aws-cdk-lib`, `constructs`, and the CDK CLI package `aws-cdk`
3. Create directory structure: `bin/` (stack bootstrap), `lib/` (stack code), `config/` (environment configs)
4. Add `config/default.ts` — single config (future: `prod.ts` if needed)
5. Update `package.json` with CDK scripts: `cdk:synth`, `cdk:deploy`, `cdk:destroy`

**Sub-tasks:**
- 12.1.1. `cdk init` scaffold — 0.5h
- 12.1.2. Directory structure + config files — 1h
- 12.1.3. Package.json scripts + tsconfig for infra — 0.5h

**Subtotal: 2h**

---

### 12.2. CDK Stack — S3 Code Bucket + SSM Secrets

**Description:** Private S3 bucket for code/artifact delivery + SSM parameters for secrets.

**Resources:**
- **S3 code bucket:** unique name, private bucket, `BlockPublicAccess.BLOCK_ALL`, encrypted at rest, SSL enforced. For this educational project it may use `DESTROY` + auto-delete; production should usually retain artifacts.
- **Code deployment:** `BucketDeployment` for source/artifact bucket. Exclude `node_modules`, `.git`, `.env`, `infra`, `docker/postgres/data`, `docker/app-files/data`, `.next/cache`, and test artifacts.
- No public-read ACLs and no S3 website hosting. CloudFront does not read app pages from S3 in this architecture.
- SSM parameters: db-password, auth-secret, admin-password, and production auth host/trust values.

**Docker Compose production mounts (on EC2):**
```
app service:
  volumes:
    - /docker/app-files/data:/data           # CSV uploads, generated outputs

db service:
  volumes:
    - /docker/postgres/data:/var/lib/postgresql/data  # Postgres data
```
- 12.2.1. Private S3 code bucket + BucketDeployment — 1h
- 12.2.2. SSM parameters (db password, auth secret, admin password, auth host settings) — 1h
- 12.2.3. Document deployment exclusions and bucket lifecycle/removal policy — 0.5h
- 12.2.4. IAM grant S3 read to EC2 role (code bucket) — 0.5h

**Subtotal: 3h**

---

### 12.3. CDK Stack — CloudFront + ACM + Route53

**Description:** HTTPS setup via CloudFront distribution with EC2 as the single Next.js origin.

**Resources:**
- ACM certificate for `ingen.poct-test.click` in us-east-1 (DNS validation via hosted zone)
- EC2 public origin on port 3010. Use a stable origin address: Elastic IP + DNS record, or ALB if introduced later.
- CloudFront behaviors:
  - Default `/*` → EC2, caching disabled/conservative, all auth-relevant cookies/query strings/headers forwarded
  - `/api/*` → EC2, caching disabled, all methods allowed, all cookies/query strings forwarded
  - `/_next/static/*` → EC2, long TTL caching enabled, `GET/HEAD` only, compression enabled
  - Optional `/favicon.ico` and public static files → EC2, short/moderate TTL
- Route53 ARecord for `ingen.poct-test.click` → CloudFront alias
- HostedZone lookup for `poct-test.click`

**Sub-tasks:**
- 12.3.1. HostedZone lookup (`poct-test.click`) — 0.5h
- 12.3.2. ACM certificate + DNS validation — 0.5h
- 12.3.3. CloudFront distribution (single EC2 origin + cache behaviors) — 2h
- 12.3.4. Route53 ARecord → CloudFront — 0.5h

**Subtotal: 3.5h**

---

### 12.4. CDK Stack — EC2 Instance + IAM

**Description:** EC2 instance with key pair, security group, IAM role, and user-data script.

**Resources:**
- EC2: `t4g.medium`, Amazon Linux 2023, public subnet
- Stable public origin address for CloudFront: Elastic IP attached to EC2, or a DNS record pointing to that Elastic IP
- Key pair: Auto-generated via `CfnKeyPair`
- Security group: ports 22 (SSH, preferably restricted to admin IP), 3010 (CloudFront origin access; for this POC can be public, later restrict by managed CloudFront prefix list if practical)
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
# 7. Create .env from SSM parameters, including production auth/proxy variables
# 8. Build + start docker-compose
# 9. Clean up .env
```

**Sub-tasks:**
- 12.4.1. EC2 instance construct (t4g.medium, key pair) — 1.5h
- 12.4.2. IAM role + policies — 1h
- 12.4.3. Elastic IP/stable origin + security group (port 3010 + SSH) — 1h
- 12.4.4. User-data script (install Docker, compose, AWS CLI, git) — 2h
- 12.4.5. User-data script (.env from SSM, docker-compose up, migrations) — 1.5h

**Subtotal: 7h**

---

### 12.5. CDK Stack — IAM Deployer User (for future CI/CD)

**Description:** IAM user for a future GitHub Actions CI/CD pipeline. This user can later be replaced by GitHub Actions OIDC role assumption, which avoids long-lived access keys.

**Resources:**
- IAM user: `invoice-data-deployer`
- Inline policy with permissions:
  - `ssm:GetParameter` — read secrets from SSM
  - `s3:*` on code bucket + CDK bootstrap bucket
  - `s3:ListBucket` — discover buckets
  - `logs:*` — CloudWatch logs
  - `cloudfront:CreateInvalidation` — invalidate CDN cache
  - `ec2:Describe*` — EC2 management
  - `ssm:SendCommand`, `ssm:ListCommands`, `ssm:ListCommandInvocations`, `ssm:GetCommandInvocation` — SSM RunCommand for SSM managed instance

**Sub-tasks:**
- 12.5.1. IAM deployer user + inline policy — 1h
- 12.5.2. Output user name and document access-key creation; do not output secret access keys through CloudFormation outputs — 0.5h

**Subtotal: 1.5h**

---

### 12.6. CDK Stack — EBS Volume

**Description:** EBS volume with first-deploy/create and redeploy/import logic.

**Resources:**
- EBS volume: `GP3`, 4 GB, `RETAIN` removal policy, device `/dev/sdf`
- `CfnVolumeAttachment` → EC2
- Import logic: if `dbVolumeId` provided in config → import; else create new

**User-data mount script (adapted for /docker mount):**
```bash
# mount-ebs.sh
DEVICE=/dev/nvme1n1   # verify on Amazon Linux 2023 (may be /dev/nvme2n1)
if ! blkid $DEVICE; then
  mkfs -t ext4 $DEVICE
fi
mkdir -p /docker
mount $DEVICE /docker
UUID=$(blkid -s UUID -o value $DEVICE)
grep -q "$UUID" /etc/fstab || \
  echo "UUID=$UUID /docker ext4 defaults,nofail 0 2" >> /etc/fstab
mkdir -p /docker/postgres/data /docker/app-files/data
chown -R 999:999 /docker/postgres/data   # postgres user UID
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
- Replace local volume paths → `/docker/postgres/data` and `/docker/app-files/data`
- Add production `.env` variable overrides:
  - `NODE_ENV=production`
  - `PORT=3010`
  - `DATABASE_URL=postgresql://...@postgres:5432/...`
  - `AUTH_SECRET` from SSM
  - `AUTH_URL=https://ingen.poct-test.click`
  - `AUTH_TRUST_HOST=true` so NextAuth accepts the CloudFront-forwarded host/proto in production
  - `ADMIN_USER`, `ADMIN_PASSWORD`
  - `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
  - `DATA_DIR=/data`
- Add `restart: always` for all services
- Add health checks for Postgres
- Keep app `ports` mapping `3010:3010`; CloudFront still needs a reachable EC2 origin port
- Remove or restrict Postgres host port `5432`; containers can communicate over the Compose network without exposing Postgres publicly
- Ensure `NODE_ENV=production` in prod env

**Sub-tasks:**
- 12.7.1. Update postgres volume path — 0.5h
- 12.7.2. Add app-files mount — 0.5h
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
| 12.2. S3 code bucket + SSM secrets | 3h |
| 12.3. CloudFront + ACM + Route53 | 3.5h |
| 12.4. EC2 + IAM + user-data | 7h |
| 12.5. IAM deployer user (CI/CD) | 1.5h |
| 12.6. EBS volume + mount | 4h |
| 12.7. Docker Compose updates | 2.5h |
| 12.8. Deployment verification | 3.5h |
| **Total** | **~24h** |

**Range:** 22–27h (includes buffer for AWS quirks, DNS propagation, CloudFront cache delays, first-boot debugging, S3 bucket name conflicts)

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
  authUrl: 'https://ingen.poct-test.click',
  authTrustHost: 'true',
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
| CloudFront origin | **Single EC2 origin** on port 3010 |
| CloudFront caching | Cache `/_next/static/*`; disable/constrain caching for app pages and `/api/*` |
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
