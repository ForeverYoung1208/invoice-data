#!/bin/bash
set -e

source "$(dirname "$0")/.instance-data-prod"

INSTANCE_ID="${1:-$INSTANCE_ID}"
KEY_ID="${2:-$KEY_ID}"

if [ ! -f ./.ssh/key-prod.pem ]; then
  aws ssm get-parameter --name "/ec2/keypair/$KEY_ID" --with-decryption --query "Parameter.Value" --output text --region eu-central-1 > ./.ssh/key-prod.pem
  chmod 400 ./.ssh/key-prod.pem
else
  echo "Key file ./.ssh/key-prod.pem already exists, try to use it. If it is outdated, delete it manually"
fi

INSTANCE_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region eu-central-1 --query "Reservations[0].Instances[0].PublicIpAddress" --output text)

echo "Connecting to $INSTANCE_IP"
ssh -i ./.ssh/key-prod.pem ec2-user@$INSTANCE_IP
