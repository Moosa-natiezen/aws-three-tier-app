# PRD §6.2 — IAM execution policies
# Dev roles must be prohibited from prod resources via boundary policies.

data "aws_caller_identity" "current" {}

locals {
  role_name_prefix = "${var.project_name}-${local.environment}"

  # The environment this deployment may NEVER touch (dev denies prod, and
  # prod's own roles would deny dev — PRD §6.1 cross-environment prohibition).
  forbidden_env = local.environment == "dev" ? "prod" : "dev"

  # Canonical resource naming (defined here, used by all later steps):
  #   S3 buckets : ${project_name}-${environment}-frontend
  #   Secrets    : ${project_name}-${environment}-*
  #   API stage  : ${environment}
}

# --- Lambda trust policy ----------------------------------------------------
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name                 = "${local.role_name_prefix}-lambda-role"
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume_role.json
  permissions_boundary = aws_iam_policy.lambda_boundary.arn

  tags = { Component = "compute" }
}

# --- Execution policy: verbatim from PRD §6.2 (Lambda Execution Role) -------
resource "aws_iam_policy" "lambda_execution" {
  name        = "${local.role_name_prefix}-lambda-exec"
  description = "Least-privilege execution policy for Lambda (PRD 6.2): CloudWatch logging + ENI management for private-subnet execution."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogging"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/*"
      },
      {
        Sid    = "VPCAccessExecution"
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
        ]
        Resource = "*"
      },
    ]
  })
}

# --- Cross-environment boundary (PRD §6.1/6.2) ------------------------------
resource "aws_iam_policy" "lambda_boundary" {
  name        = "${local.role_name_prefix}-lambda-boundary"
  description = "Permissions boundary: max permissions for ${local.environment} lambdas, with hard deny on ${local.forbidden_env} S3 buckets, API Gateway stages, and secrets."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Ceiling: baseline compute/logging rights (mirrors PRD 6.2 policy)
      {
        Sid    = "BoundaryBaseline"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
        ]
        Resource = ["*"]
      },
      # Ceiling: access to this environment's own S3 / secrets / own API stage
      {
        Sid    = "AllowOwnEnvironment"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "apigateway:GET",
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${local.environment}-*",
          "arn:aws:s3:::${var.project_name}-${local.environment}-*/*",
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}-${local.environment}-*",
          "arn:aws:apigateway:${var.aws_region}::/apis/*/stages/${local.environment}",
          "arn:aws:apigateway:${var.aws_region}::/restapis/*/stages/${local.environment}",
        ]
      },
      # Hard deny: cross-environment prohibition (applies to ALL roles wearing this boundary)
      {
        Sid    = "DenyForbiddenEnvironmentS3"
        Effect = "Deny"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:*",
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${local.forbidden_env}-*",
          "arn:aws:s3:::${var.project_name}-${local.forbidden_env}-*/*",
        ]
      },
      {
        Sid    = "DenyForbiddenEnvironmentApiGateway"
        Effect = "Deny"
        Action = [
          "apigateway:*",
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/apis/*/stages/${local.forbidden_env}",
          "arn:aws:apigateway:${var.aws_region}::/restapis/*/stages/${local.forbidden_env}",
        ]
      },
      {
        Sid    = "DenyForbiddenEnvironmentSecrets"
        Effect = "Deny"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:*",
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}-${local.forbidden_env}-*",
        ]
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_execution.arn
}
