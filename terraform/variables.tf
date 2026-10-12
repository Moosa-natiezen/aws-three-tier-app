variable "project_name" {
  description = "Globally unique-ish resource name prefix."
  type        = string
  default     = "three-tier-app"
}

variable "environment" {
  description = "Deployment environment (PRD §6.1): isolated VPC, buckets, and API endpoints."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be \"dev\" or \"prod\"."
  }
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "eu-west-1"
}

# --- Secrets: never hardcoded (PRD §6.2 / Tech Stack §4) --------------------
# Injected at plan/apply time via TF_VAR_<name> env vars or a git-ignored
# *.tfvars file (terraform.tfvars is already in .gitignore).

variable "neon_database_url" {
  description = "Neon PostgreSQL pooled connection string. Inject via TF_VAR_neon_database_url."
  type        = string
  sensitive   = true
  default     = ""
}

variable "better_auth_secret" {
  description = "Better Auth signing secret. Inject via TF_VAR_better_auth_secret."
  type        = string
  sensitive   = true
  default     = ""
}

variable "better_auth_url" {
  description = "Public app origin used by Better Auth (e.g. https://app.example.com)."
  type        = string
  default     = ""
}
