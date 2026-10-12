# Tech Stack §2 — Serverless Compute
# terraform-aws-modules/lambda/aws packages lambda/src, attaches the Step-4
# execution role, injects runtime env vars, and places ENIs in private subnets.

# PRD §5.3: egress only (to Neon via NAT + AWS APIs); no ingress rules.
resource "aws_security_group" "lambda" {
  name        = "${local.role_name_prefix}-lambda-sg"
  description = "Lambda egress: HTTPS (AWS APIs, Neon pooler via NAT) + DNS + Postgres"
  vpc_id      = module.vpc.vpc_id

  egress {
    description = "HTTPS to AWS APIs and Neon pooler"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "PostgreSQL to Neon (pooled endpoint)"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "DNS (VPC resolver)"
    from_port   = 53
    to_port     = 53
    protocol    = "both"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Component = "compute" }
}

# PRD §5.3: KMS encryption for environment secrets at rest.
resource "aws_kms_key" "lambda_env" {
  description             = "CMK for ${local.environment} Lambda environment (Neon URL, Better Auth secret)"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = { Component = "security" }
}

resource "aws_kms_alias" "lambda_env" {
  name          = "alias/${local.role_name_prefix}-lambda-env"
  target_key_id = aws_kms_key.lambda_env.key_id
}

module "api_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.0"

  function_name = "${local.role_name_prefix}-api"
  description   = "REST API backend (${local.environment}): Neon CRUD + Better Auth sessions"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 29 # under API Gateway HTTP API's 30s integration limit
  memory_size   = 512

  source_path   = "${path.module}/../lambda/src"
  architectures = ["arm64"] # graviton: better price/perf for REST handlers

  # --- Private subnet placement (PRD §5.3: zero public IP exposure) --------
  vpc_subnet_ids         = module.vpc.private_subnets
  vpc_security_group_ids = [aws_security_group.lambda.id]

  # --- Reuse Step-4 role (PRD §6.2) instead of creating a module role ------
  create_role                   = false
  lambda_role                   = aws_iam_role.lambda.arn
  attach_cloudwatch_logs_policy = false # already covered by PRD policy

  # --- Observability (NFR 5.4: centralized CloudWatch logging) -------------
  # Module auto-creates /aws/lambda/<function_name> (matches PRD 6.2 scope)
  cloudwatch_logs_retention_in_days = 30

  # --- Runtime environment (Tech Stack §4: secrets injected, never hardcoded)
  environment_variables = {
    NODE_ENV           = local.environment == "prod" ? "production" : "development"
    APP_ENV            = local.environment
    BETTER_AUTH_URL    = var.better_auth_url
    NEON_DATABASE_URL  = var.neon_database_url
    BETTER_AUTH_SECRET = var.better_auth_secret
  }

  kms_key_arn = aws_kms_key.lambda_env.arn # PRD §5.3 at-rest encryption

  tags = { Component = "compute" }
}
