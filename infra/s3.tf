# ============================================================
# BUCKET S3 — VERSÃO CORRIGIDA (Passa no Checkov)
# ============================================================
# Todas as 4 falhas de segurança foram corrigidas:
#   - CKV_AWS_2:  Removida ACL pública
#   - CKV_AWS_19: Adicionada encriptação server-side (AES256)
#   - CKV_AWS_20: Adicionado bloqueio de acesso público
#   - CKV_AWS_21: Versionamento ativado
# ============================================================

resource "aws_s3_bucket" "demo_bucket" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Description = "Bucket de demonstração para pipeline DevSecOps"
  }
}

# CORREÇÃO CKV_AWS_21: Versionamento ativado (era "Suspended")
resource "aws_s3_bucket_versioning" "demo_bucket_versioning" {
  bucket = aws_s3_bucket.demo_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CORREÇÃO CKV_AWS_19: Encriptação server-side com AES256
resource "aws_s3_bucket_server_side_encryption_configuration" "demo_bucket_encryption" {
  bucket = aws_s3_bucket.demo_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# CORREÇÃO CKV_AWS_20: Bloqueio total de acesso público
resource "aws_s3_bucket_public_access_block" "demo_bucket_public_access" {
  bucket = aws_s3_bucket.demo_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORREÇÃO CKV_AWS_2: Sem ACL pública (removido aws_s3_bucket_acl)
# O bucket usa por padrão "private" quando não se define ACL explícita.
