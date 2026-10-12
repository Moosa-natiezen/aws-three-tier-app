# aws-three-tier-app

Cloud-native three-tier web application on AWS, provisioned entirely with Terraform.

**Architecture:** React SPA (S3 + CloudFront) → API Gateway (v2) + Lambda in private VPC subnets → Neon PostgreSQL, with Better Auth for identity.

**Environments:** isolated VPCs — `dev` (10.1.0.0/16) and `prod` (10.0.0.0/16).

## Repository layout

```
├── terraform/      # IaC: VPC, IAM, Lambda, API Gateway, S3/CloudFront
│   └── environments/  # dev.tfvars, prod.tfvars
├── lambda/         # Backend function source (auth + CRUD)
├── frontend/       # React SPA
└── docs/           # PRD, Tech Stack, UI/UX design documents
```

## Ground rules

- No credentials in code — secrets injected via `.env` (local) and Terraform `sensitive` variables / runtime environment (deployed).
- Terraform state and `.env` files are git-ignored.
- Infrastructure changes are made one task at a time, with a semantic commit per completed step.
