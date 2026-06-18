# ============================================================
# BUCKET S3 COM FALHAS DE SEGURANÇA PROPOSITAIS
# Estas falhas são detetadas pelo Checkov como code smells
# de infraestrutura (IaC Security).
# ============================================================

resource "aws_s3_bucket" "demo_bucket" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Description = "Bucket de demonstração para pipeline DevSecOps"
  }
}

# ============================================================
# FALHA 1: ACL Pública
# ============================================================
# Vai falhar CKV_AWS_2: "S3 Bucket should not have ACL defined"
# Usar "public-read" expõe o conteúdo do bucket publicamente.
# A prática correta é não definir ACL e usar políticas de acesso.
resource "aws_s3_bucket_acl" "demo_bucket_acl" {
  bucket = aws_s3_bucket.demo_bucket.id
  acl    = "public-read"
}

# ============================================================
# FALHA 2: Sem Versionamento
# ============================================================
# Vai falhar CKV_AWS_21: "Ensure S3 bucket versioning is enabled"
# Sem versionamento, ficheiros eliminados ou sobrescritos não
# podem ser recuperados. Essencial para recuperação de desastres.
resource "aws_s3_bucket_versioning" "demo_bucket_versioning" {
  bucket = aws_s3_bucket.demo_bucket.id

  versioning_configuration {
    status = "Suspended"
  }
}

# ============================================================
# FALHA 3: Sem Encriptação Server-Side
# ============================================================
# Vai falhar CKV_AWS_19: "Ensure S3 bucket server-side encryption is enabled"
# Sem encriptação, dados em repouso ficam em texto plano no S3.
# Deve-se configurar SSE com KMS ou AES256.
# NOTA: Este recurso intencionalmente NÃO configura o encryption.
# Se for descomentar, deve usar aws_s3_bucket_server_side_encryption_configuration.

# ============================================================
# FALHA 4: Sem Bloqueio de Acesso Público
# ============================================================
# Vai falhar CKV_AWS_20: "Ensure S3 bucket is not publicly accessible"
# Sem aws_s3_bucket_public_access_block (ou com tudo a false),
# o bucket pode ser exposto publicamente acidentalmente.
# Deve bloquear todo acesso público com aws_s3_bucket_public_access_block.
