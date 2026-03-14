# Terraform Module Template

Standard file structure for a reusable Terraform module. Copy and replace `<MODULE_NAME>`, `<RESOURCE_TYPE>`, and `<DESCRIPTION>` placeholders.

---

## File Structure

```
modules/<MODULE_NAME>/
├── main.tf          # Resources
├── variables.tf     # Inputs
├── outputs.tf       # Outputs
├── versions.tf      # Provider and Terraform version constraints
└── README.md        # Usage, inputs, outputs table
```

---

## versions.tf

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

---

## variables.tf

```hcl
variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production."
  }
}

variable "name" {
  description = "Base name for resources. Used in naming and tagging."
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}

# Add module-specific variables below.
# Pattern: description, type, optional default, optional validation.

variable "instance_count" {
  description = "Number of instances to provision."
  type        = number
  default     = 1
  validation {
    condition     = var.instance_count >= 1
    error_message = "instance_count must be at least 1."
  }
}
```

---

## main.tf

```hcl
locals {
  # Merge caller tags with mandatory module tags
  common_tags = merge(var.tags, {
    Environment = var.environment
    Module      = "<MODULE_NAME>"
    ManagedBy   = "terraform"
  })

  name_prefix = "${var.name}-${var.environment}"
}

resource "aws_<RESOURCE_TYPE>" "main" {
  # Use locals.name_prefix, never hardcode region or environment
  # Use data sources (aws_vpc, aws_subnets) instead of hardcoding IDs

  tags = local.common_tags
}
```

> **Rules:** No hardcoded regions (`us-east-1`). No hardcoded account IDs. Use `data` sources for VPCs, subnets, AMIs. Use `local.common_tags` on every resource — cost attribution and compliance depend on it.

---

## outputs.tf

```hcl
output "id" {
  description = "ID of the <RESOURCE_TYPE> resource."
  value       = aws_<RESOURCE_TYPE>.main.id
}

output "arn" {
  description = "ARN of the <RESOURCE_TYPE> resource."
  value       = aws_<RESOURCE_TYPE>.main.arn
}

# Mark sensitive outputs appropriately
output "connection_string" {
  description = "Connection string for downstream modules."
  value       = aws_<RESOURCE_TYPE>.main.endpoint
  sensitive   = true
}
```

---

## README.md (Module)

```markdown
# <MODULE_NAME>

<DESCRIPTION>

## Usage

```hcl
module "<MODULE_NAME>" {
  source = "../../modules/<MODULE_NAME>"

  name        = "my-app"
  environment = "production"
  tags        = { Team = "platform", CostCenter = "infra" }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| environment | Deployment environment | `string` | — | yes |
| name | Base name for resources | `string` | — | yes |
| tags | Additional tags | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| id | Resource ID |
| arn | Resource ARN |
```
