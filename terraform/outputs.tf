output "environment" {
  description = "Active environment (dev|prod)."
  value       = local.environment
}

output "aws_region" {
  description = "Region all resources are provisioned into."
  value       = var.aws_region
}

output "vpc_cidr" {
  description = "CIDR block for this environment's VPC (PRD §6.1)."
  value       = local.vpc_cidr
}

# --- VPC (Step 3) -----------------------------------------------------------
output "vpc_id" {
  description = "ID of the environment's VPC."
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "Actual CIDR block of the VPC."
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs (edge / NAT layer)."
  value       = module.vpc.public_subnets
}

output "private_subnet_ids" {
  description = "Private subnet IDs — target for Lambda ENI attachment (PRD 5.3)."
  value       = module.vpc.private_subnets
}

output "availability_zones" {
  description = "AZs the environment spans (multi-AZ per PRD 5.2)."
  value       = module.vpc.azs
}
