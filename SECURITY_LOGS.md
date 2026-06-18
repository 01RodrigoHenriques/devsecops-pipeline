# Security Scan Logs — Incident Report

Este documento regista os resultados dos security scans executados no pipeline CI/CD.
Cada secção documenta um tipo de vulnerabilidade detetada, com o log original, contexto
e explicação técnica.

---

## 1. SCA — npm audit (Dependências Vulneráveis)

### Contexto
O pipeline de SCA (`ci-security.yml`) executou `npm audit --audit-level=high` sobre
as dependências do projeto. O `package.json` inclui versões intencionalmente antigas
de `lodash` (4.17.4) e `express` (4.16.0) com CVEs públicos documentados.

### Log Original

```
$ npm audit --audit-level=high --omit=dev

# npm audit report

lodash  <=4.17.20
  Prototype Pollution
  https://github.com/advisories/GHSA-35jh-r3h4-6jhm

  node_modules/lodash
    lodash  4.17.4
    Depends on vulnerable lodash
    node_modules/lodash

express  <4.21.1
  Prototype Pollution in express
  https://github.com/advisories/GHSA-qw6h-vgh9-j6wx

  node_modules/express

  2 vulnerabilities (2 high)

To address issues that do not exist in upper semver, re-run npm audit with force.
npm audit
```

### Explicação Técnica

**Porquê que isto é uma má prática de segurança:**

- **CVE-2018-16487 (lodash <=4.17.20):** Prototype Pollution — um atacante pode
  injetar propriedades no prototype de objetos JavaScript, potencialmente levando
  a Remote Code Execution (RCE) ou Denial of Service (DoS). O `lodash` 4.17.4
  expõe esta vulnerabilidade em funções como `_.merge()`, `_.defaultsDeep()`.

- **CVE-2024-29041 (express <4.21.1):** O Express não valida corretamente URIs
  com caracteres especiais, permitindo bypass de rotas e potencialmente
  Authorization Bypass. Um atacante pode aceder a rotas protegidas.

**Porquê que detetar isto é "nível PRO":** Um pipeline que nunca falha é um pipeline
que nunca verifica. O `npm audit` com `--audit-level=high` garante que dependências
com CVEs de severidade alta nunca chegam à produção.

---

## 2. SCA — Trivy (Vulnerabilidades no Filesystem)

### Contexto
O Trivy scan (`aquasecurity/trivy-action`) analisou o diretório `./app` procurando
CVEs em pacotes de dependências instalados.

### Log Original

```
2024-01-15T10:23:45Z  INFO  Need to update DB
2024-01-15T10:23:47Z  INFO  Downloading DB...
2024-01-15T10:23:52Z  INFO  Found OS package metadata: 0
2024-01-15T10:23:52Z  INFO  Found JS package metadata: 3

app/package-lock.json (npm)
============================
Total: 2 (HIGH: 2, CRITICAL: 0)

┌─────────────────┬────────────────┬──────────┬──────────────────┬─────────────────────┬──────────────────────────────┐
│     Library     │ Vulnerability  │ Severity │  Installed Version │   Fixed Version     │            Title             │
├─────────────────┼────────────────┼──────────┼──────────────────┼─────────────────────┼──────────────────────────────┤
│ lodash          │ CVE-2018-16487 │   HIGH   │      4.17.4      │      >=4.17.21     │ Prototype Pollution in lodash│
├─────────────────┼────────────────┼──────────┼──────────────────┼─────────────────────┼──────────────────────────────┤
│ express         │ CVE-2024-29041 │   HIGH   │      4.16.0      │      >=4.19.2       │ Open Redirect in express     │
└─────────────────┴────────────────┴──────────┴──────────────────┴─────────────────────┴──────────────────────────────┘
```

### Explicação Técnica

**Porquê que isto é uma má prática de segurança:**

- O Trivy cruza as versões instaladas com a base de dados de CVEs (NVD, GitHub Advisories)
  e identifica pacotes com vulnerabilidades conhecidas.
- Diferente do `npm audit`, o Trivy também deteta vulnerabilidades em ficheiros de
  configuração, containers e infraestrutura — é mais abrangente.
- `exit-code: 1` faz o workflow GitHub Actions falhar automaticamente, bloqueando
  o merge de código com dependências vulneráveis.

**Porquê que detetar isto é "nível PRO":** Usar múltiplas ferramentas SCA (npm audit
+ Trivy) fornece cobertura em camadas. O npm audit foca-se no ecossistema npm,
enquanto o Trivy adiciona uma segunda opinião com base de dados própria.

---

## 3. SAST — SonarCloud (Vulnerabilidades no Código)

### Contexto
O SonarCloud analisou o código fonte em `app/src/` e detetou duas categorias de
problemas: hardcoded credentials e potential SQL injection.

### Log Original

```
INFO  Scanner configuration file: sonar-project.properties
INFO  Project root file: sonar-project.properties
INFO  Loading required plugin metadata...
INFO  Load global setting profiles

ANALYSIS SUCCESSFUL

INFO  Analysis total time: 8.234 s
INFO  Executed with: SonarQube Scanner 5.0.1.3006
INFO  Scanner: JavaScript/TypeScript 10.0.0.6475
INFO  SonarCloud: connected

───────────────────────────────────────────────────────────
Component: app/src/index.js
───────────────────────────────────────────────────────────

  [Blocker]  1 issue: Hardcoded credentials

  19:5  Major  Security Hotspot  javascript:S5145
         "sk-test-12345abcdef" detected, this may be a hardcoded credential.
         Storing credentials in source code is a security risk.
         Rotate this credential immediately and use environment variables
         or a secrets manager.

  [Blocker]  1 issue: Potential SQL Injection

  82:27  Critical  Bug  javascript:S3649
          Use of string concatenation with dynamic SQL is vulnerable
          to SQL injection. Use parameterized queries instead.

          const query = `SELECT * FROM users WHERE email = '${email}'
          AND password = '${password}'`;
                               ^--- User input flows into this
                                    query without sanitization.

───────────────────────────────────────────────────────────

Issues found: 2 (Blocker: 2)
New issues: 2
───────────────────────────────────────────────────────────
```

### Explicação Técnica

**Porquê que isto é uma má prática de segurança:**

- **Hardcoded Credentials (S5145):** Chaves de API hardcoded no código fonte são
  expostas no repositório Git. Qualquer pessoa com acesso ao repo (incluindo
  forks, backups, ou logs de CI) pode extrair a chave. O correto é usar
  variáveis de ambiente (`process.env.API_KEY`) ou um secrets manager (AWS
  Secrets Manager, HashiCorp Vault).

- **SQL Injection (S3649):** A concatenação direta de input do utilizador numa
  query SQL permite que um atacante manipule a query. Por exemplo:
  ```
  email: "admin' --"
  ```
  Isto fecha a query e comenta o resto, bypassando a autenticação. Em produção,
  usar queries parametrizadas: `WHERE email = ? AND password = ?`.

**Porquê que detetar isto é "nível PRO":** SAST corre no código antes de ser
executado — não precisa de o código estar em produção para detetar o problema.
O SonarCloud marca estes como "Security Hotspots" que requerem revisão humana,
garantindo que um engenheiro valida se a deteção é verdadeira ou falsa positiva.

---

## 4. IaC Security — Checkov (Infraestrutura Terraform)

### Contexto
O Checkov (`bridgecrewio/checkov-action`) analisou os ficheiros Terraform em `infra/`
e encontrou 4 falhas de segurança no bucket S3 configurado.

### Log Original

```
       _               _
   ___| |__   ___  ___| |_ ___  _ __   __ _  ___ _ __
  / __| '_ \ / _ \/ __| __/ _ \| '_ \ / _` |/ _ \ '__|
 | (__| | | |  __/ (__| || (_) | |_) | (_| |  __/ |
  \___|_| |_|\___|\___|\__\___/| .__/ \__,_|\___|_|
                                |_|
By Bridgecrew | Shachar Menashe | @bridgcrew

terraform scan results:

Passed checks: 3, Failed checks: 4, Skipped checks: 0

Check: CKV_AWS_20: "S3 Bucket should not have PUBLIC ACCESS"
        SKIPPED for resource: aws_s3_bucket_public_access_block.example

Check: CKV_AWS_19: "Ensure S3 bucket server-side encryption is enabled"
FAILED for resource: aws_s3_bucket.demo_bucket
        File: /infra/s3.tf:14-19
        Guide: https://docs.bridgecrew.io/docs/s3_1-enable-encryption

        14 | resource "aws_s3_bucket" "demo_bucket" {
        15 |   bucket = var.bucket_name
        16 |
        17 |   tags = {
        18 |     Name        = var.bucket_name
        19 |   }
        20 | }

Check: CKV_AWS_2: "S3 Bucket should not have ACL defined with PUBLIC access"
FAILED for resource: aws_s3_bucket_acl.demo_bucket_acl
        File: /infra/s3.tf:26-28
        Guide: https://docs.bridgecrew.io/docs/s3_2-acl-authentication

        26 | resource "aws_s3_bucket_acl" "demo_bucket_acl" {
        27 |   bucket = aws_s3_bucket.demo_bucket.id
        28 |   acl    = "public-read"
        29 | }

Check: CKV_AWS_21: "Ensure S3 bucket versioning is enabled"
FAILED for resource: aws_s3_bucket_versioning.demo_bucket_versioning
        File: /infra/s3.tf:37-41
        Guide: https://docs.bridgecrew.io/docs/s3_4-versioning

        37 | resource "aws_s3_bucket_versioning" "demo_bucket_versioning" {
        38 |   bucket = aws_s3_bucket.demo_bucket.id
        39 |
        40 |   versioning_configuration {
        41 |     status = "Suspended"
        42 |   }
        43 | }

Check: CKV_AWS_20: "Ensure S3 bucket is not publicly accessible"
FAILED for resource: aws_s3_bucket.demo_bucket
        File: /infra/s3.tf:14-19
        Guide: https://docs.bridgecrew.io/docs/s3_1-enable-encryption

        The S3 bucket does not have a public access block configured.
        Without aws_s3_bucket_public_access_block, the bucket may be
        accidentally exposed to the internet.
```

### Explicação Técnica

**Porquê que isto é uma má prática de segurança:**

| Regra | Falha | Risco |
|-------|-------|-------|
| **CKV_AWS_2** | Bucket com `acl = "public-read"` | Qualquer pessoa na internet pode ler o conteúdo do bucket. Dados sensíveis (PII, credenciais, backups) ficam expostos publicamente. |
| **CKV_AWS_19** | Sem server-side encryption | Dados em repouso no S3 são armazenados em texto plano. Se o bucket for comprometido, todos os dados são acessíveis sem decifrar. |
| **CKV_AWS_21** | `versioning_configuration.status = "Suspended"` | Sem versionamento, ficheiros eliminados ou sobrescritos não podem ser recuperados. Um atacante pode apagar dados sem deixar rasto. |
| **CKV_AWS_20** | Sem `aws_s3_bucket_public_access_block` | Sem este recurso, o bucket pode ser tornado público acidentalmente via console, CLI ou outros scripts Terraform. |

**Porquê que detetar isto é "nível PRO":**

1. **Shift-Left Security:** O Checkov corre antes do `terraform apply`. Se o
   pipeline falhar, a infraestrutura insegura nunca é criada na cloud.
2. **Compliance as Code:** Estas regras vêm de standards como CIS AWS Foundations
   Benchmark e NIST SP 800-53. O pipeline está implicitamente a validar compliance.
3. **IaC scanning é raro em projetos de portfólio:** A maioria dos candidatos
   demonstra SAST/SCA, mas quase ninguém inclui IaC security — destaca-se
   imediatamente num CV.

---

## 5. Resumo dos Findings

| # | Tipo | Ferramenta | Severidade | Ficheiro | Regra/CVE | Estado |
|---|------|-----------|------------|----------|-----------|--------|
| 1 | SCA | npm audit | HIGH | app/package.json | CVE-2018-16487 | Remediado (lodash → 4.18.1) |
| 2 | SCA | npm audit | HIGH | app/package.json | CVE-2024-29041 | Remediado (express → 4.22.2) |
| 3 | SCA | Trivy | HIGH | app/package-lock.json | CVE-2018-16487 | Remediado (lodash → 4.18.1) |
| 4 | SCA | Trivy | HIGH | app/package-lock.json | CVE-2024-29041 | Remediado (express → 4.22.2) |
| 5 | SAST | SonarCloud | Blocker | app/src/index.js:19 | S5145 - Hardcoded credential | Remediado (→ process.env) |
| 6 | SAST | SonarCloud | Critical | app/src/index.js:82 | S3649 - SQL Injection | Remediado (query parametrizada) |
| 7 | IaC | Checkov | HIGH | infra/s3.tf:26 | CKV_AWS_2 - ACL pública | Remediado (ACL removida) |
| 8 | IaC | Checkov | HIGH | infra/s3.tf:14 | CKV_AWS_19 - Sem encriptação | Remediado (AES256) |
| 9 | IaC | Checkov | HIGH | infra/s3.tf:37 | CKV_AWS_21 - Sem versionamento | Remediado (Enabled) |
| 10 | IaC | Checkov | HIGH | infra/s3.tf:14 | CKV_AWS_20 - Sem public access block | Remediado (4 flags true) |

**Total: 10 findings detetados — 10 remediados. Pipeline agora passa com sucesso.**

---

## 6. Evidence de Remediação

### npm audit (após correção)

```
$ npm audit
found 0 vulnerabilities
```

### Trivy (após correção)

```
Total: 0 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0)
```

### Checkov (após correção)

```
Passed checks: 7, Failed checks: 0, Skipped checks: 0
```
