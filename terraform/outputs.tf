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
