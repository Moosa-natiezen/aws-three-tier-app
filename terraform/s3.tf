# PRD §2 / Tech Stack §2 — Presentation tier storage
# terraform-aws-modules/s3-bucket/aws: PRIVATE bucket (no public website
# endpoint — PRD §5.3 requires TLS, and S3 website endpoints are HTTP-only).
# The only reader is CloudFront via Origin Access Control.

module "frontend_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 5.0"

  bucket = "${var.project_name}-${local.environment}-frontend"

  # PRD §5.3: zero public exposure
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  control_object_ownership = true
  object_ownership         = "BucketOwnerEnforced" # ACLs disabled

  # Rollback capability for frontend deployments
  versioning = {
    enabled = true
  }

  tags = { Component = "frontend" }
}

# PRD §5.3: KMS encryption at rest for S3 storage (SSE-KMS + bucket keys)
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = module.frontend_bucket.s3_bucket_id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# OAC-only read access, pinned to THIS distribution's ARN
data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    sid     = "AllowCloudFrontServicePrincipalOAC"
    actions = ["s3:GetObject"]

    resources = ["${module.frontend_bucket.s3_bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = module.frontend_bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.frontend_bucket.json

  depends_on = [module.frontend_bucket]
}
