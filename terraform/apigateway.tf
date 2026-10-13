# PRD §4.2 / Tech Stack §2 — Application tier edge
# terraform-aws-modules/apigateway-v2/aws (HTTP API, module v6):
#   GET/POST/PUT/DELETE routes -> Lambda proxy integrations (payload v2.0),
#   per-stage throttling, CloudWatch access logs, CORS for the SPA.
# NOTE (flagged in plan): HTTP APIs have no REST-style JSON request models;
# payload schema validation is enforced inside the Lambda layer (Step 9).

resource "aws_cloudwatch_log_group" "apigw" {
  # NFR §5.4: centralized stage access logging
  name              = "/aws/apigateway/${local.role_name_prefix}-api"
  retention_in_days = 30
}

module "apigw" {
  source  = "terraform-aws-modules/apigateway-v2/aws"
  version = "~> 6.0"

  name          = "${local.role_name_prefix}-api"
  description   = "HTTP API backend for ${local.environment} (PRD 4.2): routes to Lambda, throttled, logged."
  protocol_type = "HTTP"

  # SPA is a bearer-token client (not cookie), so wildcard origin is safe here;
  # tighten to the CloudFront origin in Step 12 if desired.
  cors_configuration = {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
    max_age       = 86400
  }

  # Stage name == environment name: the IAM boundary (Step 4) keys on
  # .../stages/${local.environment} for the cross-env prohibition.
  create_stage = true
  stage_name   = local.environment
  deploy_stage = true

  # NFR §5.4: structured access logs (PRD: API Gateway stage access logs)
  stage_access_log_settings = {
    create_log_group = false # Terraform owns the group (30-day retention)
    log_group_name   = aws_cloudwatch_log_group.apigw.name
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  # NFR §5.1: elastic burst headroom for 0 -> 1,000+ RPS spikes while
  # protecting Neon connection saturation; adjustable per environment.
  stage_default_route_settings = {
    throttling_burst_limit = 2000
    throttling_rate_limit  = 1000
  }

  # PRD §4.2: GET / POST / PUT / DELETE → stateless Lambda (proxy v2.0)
  routes = {
    # Better Auth surface (basePath /auth): sign-in, sign-up, sessions...
    "ANY /auth/{proxy+}" = {
      integration = {
        lambda_arn             = module.api_lambda.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
    "GET /health" = {
      integration = {
        lambda_arn             = module.api_lambda.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
    "GET /items" = {
      integration = {
        lambda_arn             = module.api_lambda.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
    "POST /items" = {
      integration = {
        lambda_arn             = module.api_lambda.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
    "PUT /items/{id}" = {
      integration = {
        lambda_arn             = module.api_lambda.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
    "DELETE /items/{id}" = {
      integration = {
        lambda_arn             = module.api_lambda.lambda_function_arn
        payload_format_version = "2.0"
      }
    }
  }

  tags = { Component = "api" }
}

# Module v6 does not create this: API Gateway must be allowed to invoke the
# function. Scoped to THIS API (all stages/routes) — never account-wide.
resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.api_lambda.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.apigw.api_execution_arn}/*"
}
