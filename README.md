# DevSecOps Pipeline - Projeto de Portfólio

Pipeline CI/CD com segurança automatizada integrada. O objetivo é **impedir que código vulnerável chegue à cloud**, detetando problemas de segurança em cada fase do ciclo de vida do desenvolvimento.

---

## Objetivo

Demonstrar como integrar ferramentas de segurança automatizada num pipeline CI/CD real, cobrindo:

- **SCA** (Software Composition Analysis) — vulnerabilidades em dependências
- **SAST** (Static Application Security Testing) — vulnerabilidades no código fonte
- **IaC Security** — vulnerabilidades na infraestrutura como código

### Stack

| Ferramenta | Tipo | O que deteta |
|-----------|------|--------------|
| **npm audit** | SCA | Pacotes com CVEs conhecidos |
| **Trivy** | SCA/Container | CVEs em dependências e configurações inseguras |
| **SonarCloud** | SAST | SQL Injection, hardcoded secrets, code smells |
| **Checkov** | IaC Security | Configurações AWS inseguras no Terraform |
| **GitHub Actions** | CI/CD | Orquestração de todo o pipeline |

---

## Fluxo do Pipeline (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PUSH / PULL REQUEST                          │
│                              to main                                │
└─────────────────────┬──────────────────────┬───────────────────────┘
                      │                      │
                      ▼                      ▼
        ┌─────────────────────┐  ┌─────────────────────────────┐
        │  ci-security.yml   │  │    iac-security.yml         │
        │                     │  │                             │
        │  (corre sempre)     │  │  (corre só se /infra mudar) │
        └──────┬──────┬──────┘  └──────────────┬──────────────┘
               │      │                        │
               ▼      ▼                        ▼
     ┌──────────┐  ┌───────────┐     ┌───────────────────┐
     │ SCA Scan │  │ SAST Scan │     │ Checkov Scan      │
     │          │  │           │     │                   │
     │ npm audit│  │ SonarCloud│     │ bridgecrewio/     │
     │ Trivy    │  │           │     │ checkov-action    │
     └────┬─────┘  └─────┬─────┘     └────────┬──────────┘
          │              │                     │
          ▼              ▼                     ▼
     ┌─────────┐   ┌──────────┐        ┌──────────────┐
     │ FAIL se │   │ FAIL se  │        │ FAIL se      │
     │ HIGH ou │   │ finding  │        │ HIGH/CRITICAL│
     │ CRITICAL│   │ detetado │        │ findings     │
     └─────────┘   └──────────┘        └──────────────┘
```

---

## Como Correr Localmente

### 1. Instalar dependências da app

```bash
cd app
npm install
```

### 2. SCA Scan — npm audit

```bash
cd app
npm audit --audit-level=high
```

### 3. SCA Scan — Trivy

```bash
# Instalar Trivy: https://trivy.dev/latest/getting-started/installation/
trivy fs --severity HIGH,CRITICAL --exit-code 1 .
```

### 4. IaC Security — Checkov

```bash
# Instalar Checkov: https://www.checkov.io/1.Welcome/Quick%20Start.html
pip install checkov
checkov -d infra --framework terraform --check CKV_AWS_2,CKV_AWS_19,CKV_AWS_20,CKV_AWS_21
```

### 5. SAST — SonarCloud (local)

```bash
# Descarregar sonar-scanner: https://docs.sonarcloud.io/enriching/analysis/sonarscanner/
sonar-scanner \
  -Dsonar.projectKey=SEU_PROJECT_KEY \
  -Dsonar.organization=SEU_ORG \
  -Dsonar.sources=app/src \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.token=SEU_SONAR_TOKEN
```

---

## Configuração de Secrets no GitHub

O pipeline precisa dos seguintes secrets configurados no repositório:

1. Ir a **Settings > Secrets and variables > Actions** no GitHub
2. Clicar em **New repository secret** para cada um:

| Secret | Descrição | Como obter |
|--------|-----------|------------|
| `SONAR_TOKEN` | Token de autenticação SonarCloud | Criar em https://sonarcloud.io > My Account > Security > Generate Token |
| `AWS_ACCESS_KEY_ID` | Chave de acesso AWS (para deployments futuros) | AWS IAM > Security Credentials |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta AWS | AWS IAM > Security Credentials |

### Configurar o SonarCloud

1. Criar conta em https://sonarcloud.io
2. Importar o repositório GitHub
3. Copiar a `organization` e `projectKey` do painel
4. Substituir no ficheiro `sonar-project.properties`:
   ```properties
   sonar.organization=O_TEU_USERNAME
   sonar.projectKey=O_TEU_PROJECT_KEY
   ```

---

## Resultados Esperados

### Antes de Corrigir (Pipeline Falha)

```
[SCREENSHOT AQUI - SCA Scan falhando com npm audit/Trivy]
```

```
[SCREENSHOT AQUI - SAST Scan falhando com SonarCloud]
```

```
[SCREENSHOT AQUI - Checkov falhando com findings]
```

### Depois de Corrigir (Pipeline Passa)

```
[SCREENSHOT AQUI - SCA Scan passando]
```

```
[SCREENSHOT AQUI - SAST Scan passando]
```

```
[SCREENSHOT AQUI - Checkov passando]
```

---

## Vulnerabilidades Intencionais

Este projeto contém vulnerabilidades **propositalmente introduzidas** para demonstração:

### No Código (app/src/index.js)

| Vulnerabilidade | Tipo | Ferramenta que deteta |
|----------------|------|----------------------|
| API key hardcoded (`sk-test-12345abcdef`) | Hardcoded Secret | SonarCloud (SAST) |
| Query SQL concatenada por string | SQL Injection | SonarCloud (SAST) |

### Nas Dependências (app/package.json)

| Pacote | Versão | CVEs |
|--------|--------|------|
| `lodash` | 4.17.4 | CVE-2018-16487, CVE-2019-10744, entre outras |
| `express` | 4.16.0 | CVE-2024-29041, CVE-2024-43796 |

### Na Infraestrutura (infra/s3.tf)

| Falha | Regra Checkov | Descrição |
|-------|---------------|-----------|
| ACL pública | CKV_AWS_2 | Bucket com `acl = "public-read"` |
| Sem versionamento | CKV_AWS_21 | `versioning_configuration.status = "Suspended"` |
| Sem encriptação | CKV_AWS_19 | Sem `aws_s3_bucket_server_side_encryption_configuration` |
| Sem bloqueio de acesso público | CKV_AWS_20 | Sem `aws_s3_bucket_public_access_block` |

---

## Estrutura do Projeto

```
devsecops-pipeline/
├── .github/workflows/
│   ├── ci-security.yml        # SCA + SAST pipeline
│   └── iac-security.yml       # IaC security pipeline
├── app/
│   ├── package.json            # Dependências (com CVEs intencionais)
│   ├── src/
│   │   └── index.js            # Express API (com vulnerabilidades intencionais)
│   └── .gitignore
├── infra/
│   ├── main.tf                 # Provider AWS + backend
│   ├── s3.tf                   # Bucket S3 (com falhas de segurança)
│   ├── variables.tf            # Variáveis Terraform
│   └── outputs.tf              # Outputs Terraform
├── sonar-project.properties    # Configuração SonarCloud
└── README.md                   # Este ficheiro
```

## Licença

MIT
