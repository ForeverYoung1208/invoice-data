# Task 12.A: Add Swap File for t3.small Instances

## Problem
EC2 t3.small instances have only 2GB RAM, which is insufficient for the application. When users click "New Task", memory usage spikes from ~568MB to ~1.6GB, causing OOM (Out of Memory) issues and freezing the instance.

## Solution
Add a swap file to the EC2 instance via CloudFormation user data to provide additional virtual memory.

### AWS Swap Size Best Practices
- For RAM ≤ 2GB: Swap = 2x RAM
- For RAM > 2GB: Swap = 1x RAM
- **For t3.small (2GB)**: Need ~4GB swap

## Implementation

### Modify: `infra/lib/infra-stack.ts`

Add the following to the user data script (in the commonScript section or userData.addCommands):

```bash
# Create 4GB swap file
fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Add to fstab for persistence across reboots
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

This should be added after the volume is mounted and before Docker is started.

### Testing
1. Deploy with t3.small instance type
2. Monitor memory with `free -h` 
3. Verify swap is active: `swapon --show`
4. Test "New Task" button to ensure no OOM

## Status
- [ ] Add swap file creation to infra-stack.ts user data
- [ ] Test deployment with t3.small
- [ ] Verify swap is working and instance doesn't freeze

## Notes
- Swap is slower than RAM but prevents complete system freeze
- Consider also making the instance type configurable for future flexibility
- **Additional issue**: Root volume is only 8GB with ~3GB free. Should increase EBS volume size (currently 8GB default in infra-stack) to at least 10GB to accommodate swap file + Docker images + application files