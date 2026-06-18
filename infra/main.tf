terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Descomentar para usar backend remoto (S3 + DynamoDB)
  # backend "s3" {
  #   bucket         = "my-terraform-state-bucket"
  #   key            = "devsecops/terraform.tfstate"
  #   region         = "eu-west-1"
  #   dynamodb_table = "terraform-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
