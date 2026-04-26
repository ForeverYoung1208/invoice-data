# Infrastructure (AWS CDK)

AWS CDK IaC scripts will live here.

## Planned resources

- EC2 instance (Amazon Linux, t3.small or similar)
- EBS volume (4 GB, mounted at `/mnt/ebs`)
- Security Group (ports 22, 80, 443)
- IAM Role for EC2 with Bedrock invoke permissions (`bedrock:InvokeModel`)
- Elastic IP (optional, for stable DNS)

## Docker volume mapping on EC2

After CDK provisions the instance, the EBS volume is mounted at `/mnt/ebs`.
Docker bind mounts in `docker-compose.yml` should point to:

```
./docker/invoice_data  →  /mnt/ebs/invoice_data
./docker/postgres_data →  /mnt/ebs/postgres_data
```

Either symlink or update `docker-compose.yml` paths on the instance.

## TODO

- [ ] CDK stack: EC2 + EBS + IAM + Security Group
- [ ] User data script: install Docker, clone repo, run `docker compose up -d`
- [ ] (Optional) ALB + ACM certificate for HTTPS
