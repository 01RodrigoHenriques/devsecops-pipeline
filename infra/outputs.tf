output "bucket_name" {
  description = "Nome do bucket S3 criado"
  value       = aws_s3_bucket.demo_bucket.id
}

output "bucket_arn" {
  description = "ARN do bucket S3 criado"
  value       = aws_s3_bucket.demo_bucket.arn
}

output "aws_region" {
  description = "Região AWS utilizada"
  value       = var.aws_region
}
