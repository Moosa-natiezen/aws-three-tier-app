locals {
  environment = var.environment

  # PRD §6.1 — environment isolation
  vpc_cidr = local.environment == "prod" ? "10.0.0.0/16" : "10.1.0.0/16"

  common_tags = {
    Project     = var.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    Repository  = "aws-three-tier-app"
  }
}
