variable "aws_region" {
  description = "Região AWS para o deploy dos recursos"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Nome do projeto, usado para tagear recursos"
  type        = string
  default     = "devsecops-demo"
}

variable "environment" {
  description = "Ambiente de deploy (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "bucket_name" {
  description = "Nome do bucket S3 (deve ser globalmente único)"
  type        = string
  default     = "devsecops-demo-bucket-2024"
}
