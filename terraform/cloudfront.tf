# UI/UX §4 — CDN delivery: hashed assets get long immutable caching,
# index.html is no-cache, and BOTH 403/404 map to /index.html so React
# Router deep links work on a static host.

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.role_name_prefix}-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# AWS-managed CachingOptimized (TTL up to 1 year) for content-hashed bundles.
# Stable AWS-owned policy ID (provider 6.x removed the managed-policy data
# source); see AWS managed cache policies reference.
locals {
  caching_optimized_managed_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}

# UI/UX §4: index.html must never be cached (fresh deploy → fresh entry doc)
resource "aws_cloudfront_cache_policy" "no_cache" {
  name        = "${local.role_name_prefix}-spa-no-cache"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  http_version        = "http2and3" # TLS 1.3-capable clients negotiate h3

  origin {
    domain_name              = module.frontend_bucket.s3_bucket_bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # Default: hashed assets (immutable filenames make stale caches safe)
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = local.caching_optimized_managed_policy_id
  }

  # Entry document: always revalidate (UI/UX §4 invalidation target)
  ordered_cache_behavior {
    path_pattern           = "/index.html"
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.no_cache.id
  }

  # SPA routing (UI/UX §4): OAC buckets 403 on missing keys — serve the app.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0 # never cache the fallback (paired with no-cache index)
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # Strongest CloudFloor floor available: allows TLS 1.2.1/1.3 negotiation
    # (PRD §5.3 targets 1.3; CloudFront has no TLS-1.3-only minimum)
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Component = "frontend" }
}
