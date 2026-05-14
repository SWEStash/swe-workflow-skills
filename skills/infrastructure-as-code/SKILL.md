---
name: infrastructure-as-code
description: "Write and review IaC with Terraform, CloudFormation, Pulumi, or CDK — modularity, security, state management. Triggers: Terraform, CloudFormation, Pulumi, infrastructure as code, IaC, provision, cloud resources, terraform module, state management, terraform plan, CDK, drift, remote state."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Infrastructure as Code

Write and review IaC that is modular, secure, and maintainable. Infrastructure should be treated with the same rigor as application code — versioned, tested, reviewed, and deployed through pipelines.

## Workflow

### Step 1: Understand the Infrastructure Need

Before writing any IaC:

- **What resources are needed?** Compute, storage, networking, databases, queues, CDN?
- **Which cloud provider?** AWS, GCP, Azure, or multi-cloud?
- **Which IaC tool?** Terraform (cloud-agnostic, declarative), CloudFormation (AWS-native), Pulumi (imperative, multi-language), CDK (AWS, TypeScript/Python)?
- **What environments?** Dev, staging, production? How do they differ (instance sizes, replicas)?
- **What exists already?** Importing existing resources? Greenfield?

### Step 2: Design the Module Structure

Organize IaC for reusability and clarity:

```
infrastructure/
├── modules/                 # Reusable modules
│   ├── networking/          # VPC, subnets, security groups
│   ├── database/            # RDS, ElastiCache
│   ├── compute/             # ECS, EKS, Lambda
│   └── monitoring/          # CloudWatch, alerting
├── environments/
│   ├── dev/
│   │   ├── main.tf          # Compose modules with dev params
│   │   └── terraform.tfvars
│   ├── staging/
│   └── production/
├── backend.tf               # State backend configuration
└── versions.tf              # Provider version constraints
```

Each module should be independently usable with well-defined inputs (variables) and outputs.

### Step 3: Write the Configuration

Follow these principles. Use [templates/terraform-module.md](templates/terraform-module.md) as a starting point for module structure, variables, outputs, and README format.

**Modularity**: Each module does one thing (networking, database, compute). Modules compose through outputs → inputs.

**Parameterization**: Use variables for anything that differs between environments. Never hardcode region, instance size, replica count, or credentials.

**State management**: Use remote state backends (S3 + DynamoDB for Terraform, etc.). Enable state locking. Never commit state files to git.

**Security by default**: Encrypt at rest, restrict security groups to minimum required ports, use IAM roles (not keys), enable logging.

**Tagging**: Every resource gets tags for cost allocation, ownership, and environment identification.

### Step 4: Review and Validate

Before applying:

- [ ] `terraform plan` shows only expected changes
- [ ] No hardcoded secrets or credentials
- [ ] Security groups follow least-privilege (no 0.0.0.0/0 ingress on sensitive ports)
- [ ] Encryption enabled for storage and databases
- [ ] State backend is remote with locking enabled
- [ ] All resources are tagged (environment, team, project)
- [ ] Modules have input validation (variable constraints)
- [ ] Outputs are defined for values downstream modules need

### Step 5: Plan Deployment

- IaC changes should go through the same PR review process as application code
- Use `plan` output as the PR artifact — reviewers should see what will change
- Apply through CI/CD pipeline, never from a developer's laptop
- Use workspace or directory-per-environment patterns to prevent accidental cross-environment changes

## Principles Applied

- **DRY**: Modules eliminate repeated resource definitions across environments.
- **KISS**: Start with simple resources, refactor into modules when patterns repeat.
- **YAGNI**: Don't create a module for a resource you define once. Modules earn their existence through reuse.
- **Functional Independence**: Each module manages its own resources with clean interfaces. No module reaches into another's state.
