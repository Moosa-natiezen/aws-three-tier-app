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

# --- IAM (Step 4) -----------------------------------------------------------
output "lambda_role_name" {
  description = "IAM role assumed by all backend Lambda functions."
  value       = aws_iam_role.lambda.name
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role (with cross-env boundary attached)."
  value       = aws_iam_role.lambda.arn
}

output "lambda_execution_policy_arn" {
  description = "Managed execution policy matching PRD 6.2 exactly."
  value       = aws_iam_policy.lambda_execution.arn
}

# --- Lambda (Step 5) --------------------------------------------------------
output "lambda_function_name" {
  description = "Deployed API Lambda function name."
  value       = module.api_lambda.lambda_function_name
}

output "lambda_function_arn" {
  description = "Deployed API Lambda function ARN."
  value       = module.api_lambda.lambda_function_arn
}

output "lambda_security_group_id" {
  description = "Security group attached to the Lambda ENIs."
  value       = aws_security_group.lambda.id
}

output "lambda_env_kms_key_arn" {
  description = "CMK used to encrypt Lambda environment variables."
  value       = aws_kms_key.lambda_env.arn
}

# --- API Gateway (Step 6) ---------------------------------------------------
output "api_id" {
  description = "HTTP API (v2) ID."
  value       = module.apigw.api_id
}

output "api_endpoint" {
  description = "Default execute-api endpoint (no custom domain yet)."
  value       = module.apigw.api_endpoint
}

output "api_stage_invoke_url" {
  description = "Stage invoke URL — base URL the SPA calls (/{stage}/...)."
  value       = module.apigw.stage_invoke_url
}

output "apigw_access_log_group_name" {
  description = "CloudWatch log group receiving API Gateway stage access logs."
  value       = aws_cloudwatch_log_group.apigw.name
}
