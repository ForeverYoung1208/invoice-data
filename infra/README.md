# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

If you want to deploy stage or prod environment, please make a copy of config.dev.ts and rename it to config.stage.ts or config.prod.ts and update it with your values, and use relevant --context targetEnv=dev|stage|prod flag.


# Deploy to AWS

We need to deploy two stacks - one for sertificate and one for main stack.
Sertificate stack is deployed in us-east-1 region, because it is required for Cloudfront distribution.
Main stack is deployed in the region you specified at your current aws cli configuration.

## Bootstrap Command:

```bash
# Bootstrap us-east-1 for certificate to use with Cloudfront distribution
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/us-east-1 --context targetEnv=dev

# Bootstrap your main region (if not done)
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$(aws configure get region) --context targetEnv=dev
```

The bootstrap is a one-time setup per region and creates minimal, low-cost infrastructure that CDK needs to operate.

## Deploy

```bash
$ npx cdk deploy --all --context targetEnv=dev
```

OR if you want to cancel rollback if something went wrong (for debug purposes):

```bash
$ npx cdk deploy --all --context targetEnv=dev --no-rollback
```

## troubleshooting

### 1.  get ssh access key

```bash
aws ssm get-parameter --name "/ec2/keypair/key-07eedf646ad34d126" --with-decryption --query "Parameter.Value" --output text --region eu-central-1 > ~/.ssh/simplenestjs-dev-key.pem
```

Set proper permissions:

```bash
chmod 400 ~/.ssh/simplenestjs-dev-key.pem
```

### 2. Get the instance's public IP:

```bash
INSTANCE_IP=$(aws ec2 describe-instances --instance-ids i-05783b1bc9b341f7d --region eu-central-1 --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
echo $INSTANCE_IP
```

### 3. SSH into the instance:

```bash
ssh -i ~/.ssh/simplenestjs-dev-key.pem ec2-user@$INSTANCE_IP
```

# CI/CD on GitHub

## 1. add sectrets

gather these secrets from your aws console (create access key for user ionicapp-userdeployer)

AWS_ACCESS_KEY_ID=... (access key form console)
AWS_SECRET_ACCESS_KEY=... (secret key form console)

## 2. add variables

gather these variables from cdk output or aws cli

CODE_BUCKET=... (cdk output: ionicapp-devStack.CodeBucketName)
EC2_INSTANCE_ID=... (cdk output: ionicapp-devStack.InstanceId)
AWS_REGION=... (aws cli command: aws configure get region)
