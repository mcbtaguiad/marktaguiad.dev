---
title: "Building CI/CD Pipeline - A Not-So-Comprehensive Guide"
date: 2026-04-01
author: "Mark Taguiad"
tags: ["ci/cd", "pipeline", "devops"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/cicd/building-cicd-001.png"
dark="/images/devops/cicd/building-cicd-dark-001.png"
alt="Architecture Diagram"
>}}
{{< info >}}
This is just a personal notes, so some information here might need clarification and researching.
{{< /info >}}

# Table of Contents
{{< toc >}}
### Introductions
A CI/CD pipeline is an automated workflow that moves code from commit to production. It standardizes build, test, and deployment stages to improve release speed, reliability, and consistency.

CI/CD integrates development and operations through automation, reducing manual errors and enabling frequent, incremental delivery. 

### CI/CD Overview

#### Continuous Integration (CI)
- Frequent code merges into a shared repository  
- Automated builds and test execution  
- Early detection of integration issues  

#### Continuous Deliver y
-Ensures code is always in a deployable state  
- Deployment requires manual approval  

#### Continuous Deployment
- Fully automated release to production  
- Triggered after successful test validation  

### Pipeline Architecture

A typical CI/CD pipeline consists of sequential automated stages:

1. Source Control  
2. Build  
3. Test  
4. Artifact Storage  
5. Deployment  
6. Monitoring  

### Core Components

#### Source Code Management
- Git-based repositories (GitHub, GitLab, Bitbucket)  
- Branching strategies (trunk-based, GitFlow)  
- Pull request validation and access control  

#### Build System
- Dependency installation and compilation  
- Tools: Maven, Gradle, Webpack, Docker  

#### Automated Testing
- Unit tests  
- Integration tests  
- End-to-end tests  
- Security scanning  

#### Artifact Management
- Stores versioned build outputs  
- Examples: Nexus, Artifactory, Container Registry

#### Deployment Automation
- Environment promotion (dev → staging → prod)  
- Strategies: blue-green, canary, rolling updates, A/B Testing/Deployment

#### Observability
- Metrics, logs, and alerts  
- Tools: Prometheus, Grafana, ELK

### CI/CD Tools by Pipeline Stage

#### Source & CI (Build and Integration)

| Tool            | Description                                      |
|-----------------|--------------------------------------------------|
| Jenkins         | Open-source CI/CD server with plugin ecosystem.  |
| GitHub Actions  | Native CI/CD workflows inside GitHub.            |
| GitLab CI/CD    | Integrated pipelines using YAML configuration.   |
| CircleCI        | Cloud CI/CD with parallel job execution.         |
| Travis CI       | Lightweight CI/CD for open-source workflows.     |
| Azure DevOps    | Microsoft CI/CD platform with cloud services.    |


#### Build & Packaging (Artifacts and Containers)

| Tool     | Description                                      |
|----------|--------------------------------------------------|
| Docker   | Builds portable container images.                |


#### Deployment & Orchestration

| Tool        | Description                                      |
|-------------|--------------------------------------------------|
| Kubernetes  | Orchestrates and scales containers.              |
| Helm        | Manages Kubernetes deployments via charts.       |
| AWS CodePipeline | Automates deployments within AWS.           |


#### Infrastructure Provisioning (IaC)

| Tool        | Description                                      |
|-------------|--------------------------------------------------|
| Terraform   | Defines infrastructure using declarative config. |
| Ansible     | Automates provisioning and configuration tasks.  |

#### Testing & Security Tools

| Tool                    | Description                                      |
|-------------------------|--------------------------------------------------|
| JUnit, PyTest, Jest     | Unit testing frameworks for multiple languages.  |
| Selenium, Cypress       | End-to-end test automation tools.                |
| SonarQube               | Static analysis for code quality and security.   |
| Snyk, Dependabot        | Scans dependencies for vulnerabilities.          |
| Trivy                   | Container and filesystem vulnerability scanner.  |

#### Monitoring & Logging

| Tool        | Description                                      |
|-------------|--------------------------------------------------|
| Prometheus  | Collects metrics and handles alerting.           |
| Grafana     | Displays metrics via dashboards.                 |
| ELK Stack   | Centralized logging (Elasticsearch, Logstash, Kibana). |
| Datadog     | Cloud-based monitoring and security analytics.   |

### Source Strategy / Version Control
#### Trunk-Based Development
- Commit directly to `main` or short-lived branches  
- Optimized for fast iteration  
- Works well with feature flags  
- Flow: commit → build → deploy  

#### GitFlow
- Structured branches: `main`, `develop`, `feature/*`, `release/*`, `hotfix/*`  
- Controlled release cycle  
- Flow: develop → CI build → merge to main → deploy  

#### GitHub Flow
- Single `main` branch + short-lived feature branches  
- PR-based workflow with code review  
- Flow: PR → test → merge → deploy  

#### Release Branching
- Maintains multiple active versions  
- Used for long-term support systems  
- Flow: stable branches + parallel feature development  

**Selection Factors:** team size, release frequency, stability requirements  


### Repository Hosting Platforms

#### GitHub
- Built-in CI/CD (GitHub Actions)  
- Strong collaboration (PRs, issues)  
- Integrated security tools  
- Best for: open-source, cloud-native teams  

#### GitLab
- All-in-one DevOps platform  
- Built-in CI/CD and security  
- Supports self-hosting  
- Best for: integrated workflows  

#### Bitbucket
- Integrates with Jira and Confluence  
- Built-in CI/CD (Pipelines)  
- Best for: Atlassian-based teams  

**Selection Factors:** integrations, hosting model, security needs  
### Code Review and Merge Automation

#### Pull Requests
- Enforce PR-based changes  
- Require approvals before merge  
- Run CI checks automatically  

#### CI Validation
- Execute tests and scans pre-merge  
- Block merge on failures  

### CI Configuration

This CI setup is triggered on merged pull requests to `main`. It validates code, builds images, scans for vulnerabilities, and prepares artifacts for deployment.

#### Automated Build Flow
Pipeline stages:
```bash
checkout → test → build → scan → deploy → validate → cleanup → promote
```

#### Core Steps

- **Checkout**  
  Pull latest repository state  

- **Dependency Setup**  
  Install runtime dependencies (Go, Python, Node)  

- **Testing & Validation**  
  - Go: unit tests + `govulncheck`  
  - Python: pytest, lint, format, security scan (`pip-audit`)  
  - React: test coverage + `npm audit`  

- **Build**  
  - Multi-service Docker builds (frontend, backend, monitor)  
  - Tagged using branch name and commit SHA  
  - Pushed to GitHub Container Registry 

#### Security & Dependency Checks

- Python: `pip-audit`  
- Node: `npm audit`  
- Go: `govulncheck`  
- Containers: `Trivy` (HIGH, CRITICAL only)  

**Rules:**
- Exit on critical vulnerabilities  
- Ignore unfixed issues  
- Enforce scanning before deployment  

#### Artifact Generation

#### Docker Images

- Built per service:
  - `frontend`
  - `backend`
  - `monitor`

- Tagged as:
  - branch name  
  - commit SHA  

- Stored in Container Registry:
```bash
ghcr.io/<repo>/<service>:<tag>
```

#### Example CI
```yaml
name: istio-demo-cicd

on:
  pull_request:
    branches: [ "main" ]
    types: [ closed ]

env:
  REGISTRY: ghcr.io
  IMAGE_REPO: ${{ github.repository }}

jobs:
  checkout:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    outputs:
      repo-path: ${{ steps.repo-path.outputs.path }}
    steps:
      - name: Checkout repository
        id: repo-path
        uses: actions/checkout@v4

  # --- Go Tests ---
  backend-test:
    if: github.event.pull_request.merged == true
    needs: checkout
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: [1.26.1]
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: ${{ matrix.go-version }}

      # - name: Install dependencies
      #   working-directory: docker/backend
      #   run: go mod tidy

      - name: Run Go tests
        working-directory: docker/backend
        run: |
          go mod init github.com/mcbtaguiad/istio-demo/backend
          go mod tidy
          go test ./... -v

      - name: Run govulncheck
        working-directory: docker/backend
        run: |
          go mod tidy
          go mod download
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck ./...


  # --- Python Tests ---
  monitor-test:
    if: github.event.pull_request.merged == true
    needs: checkout
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.12.8]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          pip install flask pytest pylint black flake8 isort pytest-cov pip-audit

      - name: Run pytest
        working-directory: docker/monitor
        run: pytest . --cov=./

      - name: Lint with pylint
        working-directory: docker/monitor
        run: pylint app.py

      - name: Format check with black
        working-directory: docker/monitor
        run: black --check app.py

      - name: Import check with isort
        working-directory: docker/monitor
        run: isort --check-only app.py

      - name: Scan Python dependencies with pip-audit
        working-directory: docker/monitor
        run: pip-audit -r requirements.txt --strict

  # --- React Tests ---
  frontend-test:
    if: github.event.pull_request.merged == true
    needs: checkout
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: docker/frontend/package-lock.json

      - name: Install dependencies
        working-directory: docker/frontend
        run: npm ci

      - name: Run React tests
        working-directory: docker/frontend
        run: npm run test -- --coverage

      - name: Scan Node dependencies with npm audit
        working-directory: docker/frontend
        run: npm audit --audit-level=high

  # --- Docker Build & Push ---
  build:
    if: github.event.pull_request.merged == true
    needs: [backend-test, monitor-test, frontend-test]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        service: [frontend, backend, monitor]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GH_TOKEN }}

      - name: Set service-specific variables
        run: |
          case "${{ matrix.service }}" in
            frontend)
              echo "IMAGE_NAME=frontend" >> $GITHUB_ENV
              echo "CONTEXT=./docker/frontend" >> $GITHUB_ENV
              echo "PORT=8080" >> $GITHUB_ENV
              ;;
            backend)
              echo "IMAGE_NAME=backend" >> $GITHUB_ENV
              echo "CONTEXT=./docker/backend" >> $GITHUB_ENV
              echo "PORT=3000" >> $GITHUB_ENV
              ;;
            monitor)
              echo "IMAGE_NAME=monitor" >> $GITHUB_ENV
              echo "CONTEXT=./docker/monitor" >> $GITHUB_ENV
              echo "PORT=8000" >> $GITHUB_ENV
              ;;
          esac

      - name: Determine image tag
        id: tag
        run: |
          if [[ "${GITHUB_REF}" == refs/tags/* ]]; then
            echo "IMAGE_TAG=${GITHUB_REF#refs/tags/}" >> $GITHUB_ENV
          else
            echo "IMAGE_TAG=${GITHUB_REF_NAME}" >> $GITHUB_ENV
          fi

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ${{ env.CONTEXT }}
          file: ${{ env.CONTEXT }}/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          labels: |
            org.opencontainers.image.created=${{ github.run_started_at }}
            org.opencontainers.image.revision=${{ github.sha }}
            org.opencontainers.image.source=https://github.com/${{ github.repository }}
            org.opencontainers.image.title=istio-demo
            org.opencontainers.image.version=${{ env.IMAGE_TAG }}
          build-args: |
            ENVIRONMENT=${{ github.ref_name == 'main' && 'prod' || 'dev' }}

          cache-from: type=gha
          cache-to: type=gha,mode=max

  vulnerability-scan:
    if: github.event.pull_request.merged == true
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [frontend, backend, monitor]
    steps:
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GH_TOKEN }}
      - name: Scan Docker image with Trivy
        uses: aquasecurity/trivy-action@v0.35.0
        with:
          scan-type: image
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/${{ matrix.service }}:${{ github.ref_name }}
          exit-code: '1'
          severity: HIGH,CRITICAL
          format: table
          ignore-unfixed: true
```
### Continuous Deployment (CD)

This pipeline implements fully automated deployment after a PR is merged to `main`. It uses A/B deployments, smoke testing, and staged promotion to production.

#### Deployment Flow
```bash
build → scan → deploy-dev → smoke-test → cleanup → deploy-prod
```

### Automated Deployment

#### A/B Deployment Strategy

- Uses **commit SHAs**:
  - `SHA_OLD` → previous version (v1)
  - `SHA_NEW` → new version (v2)

- Services:
  - `backend-v1` / `backend-v2`
  - `monitor-v1` / `monitor-v2`
  - `frontend` (latest only)

#### Image Injection
```bash
kustomize edit set image backend-v1=<repo>/backend:$SHA_OLD
kustomize edit set image backend-v2=<repo>/backend:$SHA_NEW
```
#### Apply Deployment
```bash
kubectl apply -k kube/ab-testing/environments/demo-dev
```
#### Validation (Smoke Testing)
- Health Checks
    - Wait for all pods to be ready
    - Verify rollout status of all deployments

- Smoke Test Job
    - Runs Kubernetes job: smoke-test
    - Validates application behavior

- Failure Handling
    - If job fails:
        - Print logs
        - Exit pipeline
    - Blocks promotion to production

*smoke-test.sh*
```bash
#!/bin/sh
set -euo pipefail

# BASE_URL="http://192.168.254.220"
WEB_BASE_URL="${WEB_BASE_URL:?WEB_BASE_URL environment variable not set}"
API_BASE_URL="${API_BASE_URL:?API_BASE_URL environment variable not set}"

# Helper function for curl with status check
function curl_check() {
  local METHOD=$1
  local URL=$2
  local DATA=${3:-""}
  local AUTH=${4:-""}

  if [ -n "$DATA" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH" \
      -d "$DATA")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$URL" \
      -H "Authorization: Bearer $AUTH")
  fi

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
    echo "Request to $URL failed with status $HTTP_CODE"
    echo "Response body: $BODY"
    exit 1
  fi

  echo "$BODY"
}

# API Health
printf "\n======** API Health **======\n"
curl_check GET "$API_BASE_URL/api/health"
echo

# Frontend Health (/app)
printf "\n======** Frontend /app Health **======\n"
STATUS=$(curl -s -L -o /dev/null -w "%{http_code}" "$WEB_BASE_URL/app")
if [ "$STATUS" -ne 200 ]; then
  echo "Frontend /app failed with status $STATUS"
  exit 1
fi
echo "status: $STATUS"

# Frontend Health (/status)
printf "\n======** Frontend /status Health **======\n"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_BASE_URL/status")
if [ "$STATUS" -ne 200 ]; then
  echo "Frontend /status failed with status $STATUS"
  exit 1
fi
echo "status: $STATUS"

# Create dummy accounts
printf "\n======** Create User 'admin' **======\n"
curl_check POST "$API_BASE_URL/api/register" '{"username":"admin","password":"admin"}'
echo

printf "\n======** Create User 'jonathan' **======\n"
curl_check POST "$API_BASE_URL/api/register" '{"username":"jonathan","password":"123"}'
echo

# Get token for 'admin'
printf "\n======** Get Admin Token **======\n"
TOKEN=$(curl_check POST "$API_BASE_URL/api/login" '{"username":"admin","password":"admin"}' | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Failed to obtain JWT token"
  exit 1
fi
echo "Token: $TOKEN"

# List users
printf "\n======** List Users **======\n"
curl_check GET "$API_BASE_URL/api/users" "" "$TOKEN" | jq
echo

# Show version
printf "\n======** API Version **======\n"
curl_check GET "$API_BASE_URL/api/version" "" "$TOKEN" | jq
echo

# Update user password
printf "\n======** Update Password for 'jonathan' **======\n"
curl_check PUT "$API_BASE_URL/api/users/jonathan" '{"password":"456"}' "$TOKEN"
echo

# Delete user
printf "\n======** Delete User 'jonathan' **======\n"
curl_check DELETE "$API_BASE_URL/api/users/jonathan" "" "$TOKEN"
echo
```


### Cleanup
- Delete smoke test job
- Remove dev environment

### Production Deployment
Repeats A/B deployment strategy
    - Deploys to demo-prod
    - Uses same SHA-based versioning

#### Release Strategies
A/B Deployment (Implemented)
- Runs two versions simultaneously
- Enables comparison between old vs new
- Supports safe rollout

Canary (Optional Extension)
- Gradual traffic shifting (e.g., 90/10 → 50/50 → 100)
- Typically handled via service mesh (e.g., Istio)

#### Rollback Strategy
Fast Rollback
- Revert to previous SHA (SHA_OLD)
- Reapply manifests
```bash
kubectl rollout undo deployment/<service>
```
Characteristics
- Immutable image tags (SHA-based)
- No rebuild required
- Instant recovery

#### Safety Controls
Deployment only after:
- Tests pass 
- Vulnerability scans pass 
- Smoke-test pass

Pipeline fails on:
- Failed rollout
- Failed job
- Critical vulnerabilities

#### Example CD
```yaml
  deploy-dev:
    if: github.event.pull_request.merged == true
    needs: vulnerability-scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2   1

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4

      - name: Setup Kustomize
        run: |
          curl -s https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh | bash
          sudo mv kustomize /usr/local/bin/

      - name: Set kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" > $HOME/.kube/config

      # A/B SHAs (based on merged PR commits)
      - name: Determine A/B SHAs
        run: |
          SHA_NEW=$(git rev-parse HEAD)
          SHA_OLD=$(git rev-parse HEAD~1)

          echo "SHA_NEW=$SHA_NEW" >> $GITHUB_ENV
          echo "SHA_OLD=$SHA_OLD" >> $GITHUB_ENV

      # A/B image injection
      - name: Update images via kustomize (A/B)
        run: |
          cd kube/ab-testing/environments/demo-dev

          # Backend (A/B)
          kustomize edit set image backend-v1=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/backend:${{ env.SHA_OLD }}
          kustomize edit set image backend-v2=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/backend:${{ env.SHA_NEW }}

          # Monitor (A/B)
          kustomize edit set image monitor-v1=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/monitor:${{ env.SHA_OLD }}
          kustomize edit set image monitor-v2=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/monitor:${{ env.SHA_NEW }}

          # Frontend (latest only)
          kustomize edit set image frontend=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/frontend:${{ env.SHA_NEW }}

      - name: Deploy
        run: |
          kubectl apply -k kube/ab-testing/environments/demo-dev --insecure-skip-tls-verify=true

  smoke-test:
    if: github.event.pull_request.merged == true
    needs: deploy-dev
    runs-on: ubuntu-latest

    env:
      # APP_HOST: ${{ secrets.DEV_APP_HOST }}
      NAMESPACE: demo-dev
      JOB_NAME: smoke-test

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      # Setup kubectl (assumes kubeconfig stored as secret)
      - name: Set up kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" > $HOME/.kube/config

      # Wait for pods to be Ready
      - name: Wait for Kubernetes pods
        run: |
          echo "Waiting for pods in namespace $NAMESPACE..."

          kubectl wait --for=condition=ready pod \
            --all \
            -n $NAMESPACE \
            --timeout=120s \
            --insecure-skip-tls-verify=true

      - name: Verify rollout
        run: |
          kubectl rollout status deployment/frontend --insecure-skip-tls-verify=true -n $NAMESPACE
          kubectl rollout status deployment/backend-v1 --insecure-skip-tls-verify=true -n $NAMESPACE
          kubectl rollout status deployment/backend-v2 --insecure-skip-tls-verify=true -n $NAMESPACE
          kubectl rollout status deployment/monitor-v1 --insecure-skip-tls-verify=true -n $NAMESPACE
          kubectl rollout status deployment/monitor-v2 --insecure-skip-tls-verify=true -n $NAMESPACE
          kubectl rollout status deployment/redis --insecure-skip-tls-verify=true -n $NAMESPACE

      - name: Deploy smoke test job
        run: |
          kubectl create -k test/smoke-test/environments/demo-dev --insecure-skip-tls-verify=true

      - name: Wait for job completion
        run: |
          echo "Waiting for job to complete..."

          kubectl wait \
            --for=condition=complete \
            job/$JOB_NAME \
            -n $NAMESPACE \
            --timeout=180s \
            --insecure-skip-tls-verify=true

      - name: Check job status
        run: |
          FAILED=$(kubectl get job $JOB_NAME -n $NAMESPACE -o jsonpath='{.status.failed}' --insecure-skip-tls-verify=true)
          SUCCEEDED=$(kubectl get job $JOB_NAME -n $NAMESPACE -o jsonpath='{.status.succeeded}' --insecure-skip-tls-verify=true)

          echo "Succeeded: $SUCCEEDED"
          echo "Failed: $FAILED"

          if [ "$FAILED" != "" ] && [ "$FAILED" != "0" ]; then
            echo "Smoke test FAILED"
            kubectl logs job/$JOB_NAME -n $NAMESPACE --insecure-skip-tls-verify=true
            exit 1
          fi

          if [ "$SUCCEEDED" == "1" ]; then
            echo "Smoke test PASSED"
          else
            echo "Smoke test did not complete successfully"
            kubectl logs job/$JOB_NAME -n $NAMESPACE --insecure-skip-tls-verify=true
            exit 1
          fi

  cleanup:
    if: github.event.pull_request.merged == true
    needs: smoke-test
    runs-on: ubuntu-latest

    env:
      NAMESPACE: demo-dev

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      # Setup kubectl (assumes kubeconfig stored as secret)
      - name: Set up kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" > $HOME/.kube/config

      - name: Delete smoke test job
        run: |
          kubectl delete -k test/smoke-test/environments/demo-dev --insecure-skip-tls-verify=true

      - name: Delete demo-dev
        run: |
          kubectl delete -k kube/ab-testing/environments/demo-dev --insecure-skip-tls-verify=true


  deploy-prod:
    if: github.event.pull_request.merged == true
    needs: cleanup
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2   1

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4

      - name: Setup Kustomize
        run: |
          curl -s https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh | bash
          sudo mv kustomize /usr/local/bin/

      - name: Set kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" > $HOME/.kube/config

      # A/B SHAs (based on merged PR commits)
      - name: Determine A/B SHAs
        run: |
          SHA_NEW=$(git rev-parse HEAD)
          SHA_OLD=$(git rev-parse HEAD~1)

          echo "SHA_NEW=$SHA_NEW" >> $GITHUB_ENV
          echo "SHA_OLD=$SHA_OLD" >> $GITHUB_ENV

      # A/B image injection
      - name: Update images via kustomize (A/B)
        run: |
          cd kube/ab-testing/environments/demo-prod

          # Backend (A/B)
          kustomize edit set image backend-v1=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/backend:${{ env.SHA_OLD }}
          kustomize edit set image backend-v2=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/backend:${{ env.SHA_NEW }}

          # Monitor (A/B)
          kustomize edit set image monitor-v1=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/monitor:${{ env.SHA_OLD }}
          kustomize edit set image monitor-v2=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/monitor:${{ env.SHA_NEW }}

          # Frontend (latest only)
          kustomize edit set image frontend=${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/frontend:${{ env.SHA_NEW }}

      - name: Deploy
        run: |
          kubectl apply -k kube/ab-testing/environments/demo-prod --insecure-skip-tls-verify=true
```
### Observabilty and Monitoring
Post-deployment, ensure applications are observable via metrics, logs, and alerts.

#### Key Points
- Ensure services expose metrics endpoints (e.g. `/metrics`)
- Configure Prometheus to scrape all application and infrastructure targets
- Validate Grafana dashboards for:
  - request rate
  - error rate
  - latency )
  - resource usage (CPU, memory)

- Set up alerting rules (Prometheus Alertmanager):
  - high error rate
  - increased latency
  - pod restarts / crash loops
  - resource saturation

- Monitor deployment health:
  - compare old vs new versions (A/B)
  - detect anomalies after rollout

- Centralize logs (e.g. ELK stack, Loki or similar)
- Correlate logs with metrics for faster debugging

- Track Kubernetes health:
  - pod status
  - deployment rollout status
  - node health

- Define SLOs/SLIs:
  - availability
  - latency
  - error budget
