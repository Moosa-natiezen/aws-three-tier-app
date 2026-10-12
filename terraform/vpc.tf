# PRD §2 / Tech Stack §2 — Networking tier
# terraform-aws-modules/vpc/aws: public subnets for edge entry (NAT, ALB-less
# ingress), private subnets for Lambda ENIs (PRD §5.3: zero public IPs).

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  az_count = 2 # PRD §5.2 multi-AZ resilience
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)

  # 1 public + 1 private subnet per AZ:
  # dev  10.1.x.0/24 public, 10.1.(x+100).0/24 private (within 10.1.0.0/16)
  # prod 10.0.x.0/24 public, 10.0.(x+100).0/24 private (within 10.0.0.0/16)
  public_subnet_cidrs  = [for i in range(local.az_count) : cidrsubnet(local.vpc_cidr, 8, i)]
  private_subnet_cidrs = [for i in range(local.az_count) : cidrsubnet(local.vpc_cidr, 8, i + 100)]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.7"

  name = "${var.project_name}-${local.environment}"
  cidr = local.vpc_cidr

  azs             = local.azs
  public_subnets  = local.public_subnet_cidrs
  private_subnets = local.private_subnet_cidrs

  # Private compute egress to Neon (public SaaS) rides the NAT gateway.
  # dev: single NAT (cost); prod: one NAT per AZ (PRD §5.2 99.9% / multi-AZ).
  enable_nat_gateway     = true
  single_nat_gateway     = local.environment != "prod"
  one_nat_gateway_per_az = local.environment == "prod"

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "Tier"                   = "public"
    "kubernetes.io/role/elb" = "0" # reserved, no EKS in this project
  }

  private_subnet_tags = {
    "Tier"          = "private"
    "NetworkAccess" = "restricted" # PRD §5.3: private-subnet isolation
  }

  tags = local.common_tags
}
