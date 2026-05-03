---
title: "Breaking Away from Traditional CI/CD: Introducing GitOps with ArgoCD"
date: 2026-04-17
author: "Mark Taguiad"
tags: ["ci/cd", "argocd", "pipeline", "github actions", "kustomize"]
UseHugoToc: true
weight: 2
---
{{< info >}}
Read on related blog first; [Building CI/CD Pipeline - A Not-So-Comprehensive Guide](/post/building-cicd).
{{< /info >}}
{{< theme-image
light="/images/devops/cicd/ci-argocd.png"
dark="/images/devops/cicd/ci-argocd-dark.png"
alt="Architecture Diagram"
>}}
Traditional CI/CD pipelines tightly couple build, test, and deployment into a single workflow. Once a change passes tests, the pipeline pushes directly to the target environment. While simple, this model limits visibility, auditability, and control over deployments.

This approach shifts deployment responsibility away from the CI pipeline into a dedicated GitOps repository, where the desired state of the system lives. Deployment is no longer “pushed” — it is pulled and reconciled by ArgoCD.

Repos:
- [mcbtaguiad/istio-demo](https://github.com/mcbtaguiad/istio-demo.git) 
- [mcbtaguiad/gitops-demo](https://github.com/mcbtaguiad/gitops-demo.git)
# Table of Contents
{{< toc >}}
### Prerequisite
- Kubernetes Cluster
- Istio installed
- Argocd installed
- Github repo - cicd running on github actions

### Architecture Overview
- App Repository
    - Contains source code + CI pipelines
- GitOps Repository
    - Contains Kubernetes manifests (Kustomize overlays for dev and prod)
- ArgoCD
    - Watches GitOps repo and syncs cluster state

### Repo
#### Code/App Repo
Check this previous [post](/post/k8s-istio-uno).
#### GitOps Repo
Manifest are deployed in ArgoCD using `kustomize`.
```
istio-demo
└── ab-testing
    ├── backend
    │   ├── base
    │   │   ├── deployment.yaml
    │   │   ├── kustomization.yaml
    │   │   └── service.yaml
    │   ├── common
    │   │   ├── kustomization.yaml
    │   │   ├── serviceaccount.yaml
    │   │   └── service.yaml
    │   └── overlays
    │       ├── v1
    │       │   ├── deployment-patch.yaml
    │       │   ├── kustomization.yaml
    │       │   ├── name-patch.json
    │       │   └── service-patch.yaml
    │       └── v2
    │           ├── deployment-patch.yaml
    │           ├── kustomization.yaml
    │           ├── name-patch.json
    │           └── service-patch.yaml
    ├── environments
    │   ├── demo-dev
    │   │   ├── demo-app-gateway-patch.yaml
    │   │   ├── frontend-authpolicy-patch.yaml
    │   │   ├── kustomization.yaml
    │   │   ├── monitor-authpolicy-patch.yaml
    │   │   └── namespace.yaml
    │   └── demo-prod
    │       ├── demo-app-gateway-patch.yaml
    │       ├── frontend-authpolicy-patch.yaml
    │       ├── kustomization.yaml
    │       ├── monitor-authpolicy-patch.yaml
    │       └── namespace.yaml
    ├── frontend
    │   └── base
    │       ├── deployment.yaml
    │       ├── kustomization.yaml
    │       ├── serviceaccount.yaml
    │       └── service.yaml
    ├── istio
    │   └── base
    │       ├── destinationrule.yaml
    │       ├── gateway.yaml
    │       ├── kustomization.yaml
    │       ├── mtls.yaml
    │       ├── rbac-readwrite-frontend-to-backend.yaml
    │       ├── rbac-readwrite-monitor-to-backend.yaml
    │       └── virtualservice.yaml
    ├── monitor
    │   ├── base
    │   │   ├── deployment.yaml
    │   │   ├── kustomization.yaml
    │   │   └── service.yaml
    │   ├── common
    │   │   ├── kustomization.yaml
    │   │   ├── serviceaccount.yaml
    │   │   └── service.yaml
    │   └── overlays
    │       ├── v1
    │       │   ├── deployment-patch.yaml
    │       │   ├── kustomization.yaml
    │       │   └── service-patch.yaml
    │       └── v2
    │           ├── deployment-patch.yaml
    │           ├── kustomization.yaml
    │           └── service-patch.yaml
    ├── redis
    │   └── base
    │       ├── deployment.yaml
    │       ├── kustomization.yaml
    │       ├── serviceaccount.yaml
    │       └── service.yaml
    └── smoke-test
        └── base
            ├── configs
            │   └── smoke-test.sh
            ├── job.yaml
            ├── kustomization.yaml
            ├── rbac-smoketest-to-backend.yaml
            └── serviceaccount.yaml

26 directories, 56 files
```
### ArgoCD Setup
#### Project
Create a dedicated project, don't deploy on `default` project. For this demo I created `istio-demo` project.

Create from the argoCD UI or manifest.

*istio-project.yaml*
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: istio-demo
  namespace: argocd
spec:
  sourceRepos:
    - https://github.com/mcbtaguiad/gitops-demo.git

  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc

  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
```

#### Applications
Create `dev` and `prod` application in argocd. 

*istio-demo-dev.yaml*
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-demo-dev
spec:
  destination:
    namespace: demo-dev
    server: https://kubernetes.default.svc
  source:
    path: istio-demo/ab-testing/environments/demo-dev
    repoURL: https://github.com/mcbtaguiad/gitops-demo.git
    targetRevision: main
  sources: []
  project: istio-demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    retry:
      limit: 5
      backoff:
        duration: 5s
        maxDuration: 3m0s
        factor: 2
    syncOptions:
      - CreateNamespace=true
      - ApplyOutOfSyncOnly=true
      - RespectIgnoreDifferences=true
```
*istio-demo-prod.yaml*
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-demo-prod
spec:
  destination:
    namespace: demo-prod
    server: https://kubernetes.default.svc
  source:
    path: istio-demo/ab-testing/environments/demo-prod
    repoURL: https://github.com/mcbtaguiad/gitops-demo.git
    targetRevision: main
  sources: []
  project: istio-demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    retry:
      limit: 5
      backoff:
        duration: 5s
        maxDuration: 3m0s
        factor: 2
    syncOptions:
      - CreateNamespace=true
      - ApplyOutOfSyncOnly=true
      - RespectIgnoreDifferences=true
```

### Phase 1: Code Quality CI
Triggered on every push to any branch, this pipeline enforces quality before merge.
- code quality check
- vulnerabilty scans
- lint check

#### Pipeline
*code-quality.yaml*
```yaml
name: code-quality-check

on:
  push:
    branches: [ "**" ]

jobs:
  checkout:
    if: github.event_name == 'push' && github.event.head_commit.message != null && !startsWith(github.event.head_commit.message, 'Merge pull request')
    runs-on: ubuntu-latest
    outputs:
      repo-path: ${{ steps.repo-path.outputs.path }}
    steps:
      - name: Checkout repository
        id: repo-path
        uses: actions/checkout@v4

  # --- Go Tests ---
  backend-test:
    if: github.event_name == 'push' && github.event.head_commit.message != null && !startsWith(github.event.head_commit.message, 'Merge pull request')
    needs: checkout
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: [1.26.2]
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
    if: github.event_name == 'push' && github.event.head_commit.message != null && !startsWith(github.event.head_commit.message, 'Merge pull request')
    needs: checkout
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.13]
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
    if: github.event_name == 'push' && github.event.head_commit.message != null && !startsWith(github.event.head_commit.message, 'Merge pull request')
    needs: checkout
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v5
        with:
          node-version: 25
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
```

### Phase 2: Main CI/CD Pipeline
Triggered on merge to main.
#### Build & Push Images
- Multi-service matrix build (frontend, backend, monitor)
- Tagged with:
    - branch/tag name
    - immutable git sha
- Pushed to GitHub Container Registry
#### Vulnerability Scanning
- uses Trivy
- fails pipeline on:
    - HIGH or CRITICAL vulnerabilities
#### Deploy to DEV
Instead of kubectl apply, the pipeline:
- clones the GitOps repo
- updates image tags in Kustomize overlays
- Commits & pushes changes
```
backend-v1 -> old SHA
backend-v2 -> new SHA
```
This enables:
- A/B testing
- Progressive rollout

ArgoCD detects the change and syncs automatically.
#### Smoke Testing
After ArgoCD sync:
- wait for all pods to be Ready
- verify rollout status of all deployments
- run a Kubernetes Job-based smoke test

Fail if:
- job fails
- logs indicate issues

This ensures deployment correctness, not just build succes.
#### Promote to PROD
Production is not auto-deployed.

Instead:
- create a promotion branch in GitOps repo
- update prod overlays with new image SHA
- open a Pull Request. 

This would require a manual trigger and review on the PR first.
- if PR is approved, argocd sync and rebuild PROD environment.

#### Pipeline
*ci-argocd.yaml*
```yaml
name: istio-demo-ci-argocd

on:
  pull_request:
    branches: [ "main" ]
    types: [ closed ]

env:
  REGISTRY: ghcr.io
  IMAGE_REPO: ${{ github.repository }}
  GITOPS_REPO: mcbtaguiad/gitops-demo

jobs:
  checkout:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        id: repo-path
        uses: actions/checkout@v4

  get-sha:
    runs-on: ubuntu-latest
    outputs:
      sha_new: ${{ steps.sha.outputs.sha_new }}
      sha_old: ${{ steps.sha.outputs.sha_old }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - id: sha
        run: |
          echo "sha_new=$(git rev-parse HEAD)" >> $GITHUB_OUTPUT
          echo "sha_old=$(git rev-parse HEAD~1)" >> $GITHUB_OUTPUT

  # --- Docker Build & Push ---
  build:
    if: github.event.pull_request.merged == true
    needs: [checkout, get-sha]
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
    needs: [build, get-sha]
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
          # image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/${{ matrix.service }}:${{ github.ref_name }}
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_REPO }}/${{ matrix.service }}:${{ github.sha }}
          exit-code: '1'
          severity: HIGH,CRITICAL
          format: table
          ignore-unfixed: true

  deploy-dev:
    if: github.event.pull_request.merged == true
    needs: [vulnerability-scan, get-sha]
    runs-on: ubuntu-latest

    env:
      SHA_NEW: ${{ needs.get-sha.outputs.sha_new }}
      SHA_OLD: ${{ needs.get-sha.outputs.sha_old }}

    steps:
      - name: Clone GitOps repo
        run: |
          git clone -b main https://x-access-token:${{ secrets.GH_TOKEN }}@github.com/${{ env.GITOPS_REPO }}.git
          cd gitops-demo

          git config user.name "github-actions"
          git config user.email "actions@github.com"

      - name: Update DEV images (A/B)
        run: |
          cd gitops-demo/istio-demo/ab-testing/environments/demo-dev 

          yq -i '
          (.patches[] | select(.target.name == "backend-v1") | .patch) |=
            sub("backend:.*"; "backend:" + env(SHA_OLD)) |

          (.patches[] | select(.target.name == "backend-v2") | .patch) |=
            sub("backend:.*"; "backend:" + env(SHA_NEW)) |

          (.patches[] | select(.target.name == "monitor-v1") | .patch) |=
            sub("monitor:.*"; "monitor:" + env(SHA_OLD)) |

          (.patches[] | select(.target.name == "monitor-v2") | .patch) |=
            sub("monitor:.*"; "monitor:" + env(SHA_NEW))
          ' kustomization.yaml

      - name: Commit & push DEV
        run: |
          cd gitops-demo
          git add .
          git commit -m "dev: deploy ${{ env.SHA_NEW }}"
          git push

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

      - name: Delete smoke test job
        run: |
          kubectl delete -k test/smoke-test/environments/demo-dev --insecure-skip-tls-verify=true

  deploy-prod:
    if: github.event.pull_request.merged == true
    needs: [smoke-test, get-sha]
    runs-on: ubuntu-latest

    env:
      SHA_NEW: ${{ needs.get-sha.outputs.sha_new }}
      SHA_OLD: ${{ needs.get-sha.outputs.sha_old }}

    steps:
      - name: Clone GitOps repo
        run: |
          git clone -b main https://x-access-token:${{ secrets.GH_TOKEN }}@github.com/${{ env.GITOPS_REPO }}.git
          cd gitops-demo

          git config user.name "github-actions"
          git config user.email "actions@github.com"

      - name: Create promotion branch
        run: |
          cd gitops-demo
          BRANCH=promote-${{ env.SHA_NEW }}

          git checkout -b $BRANCH

      - name: Update PROD images (A/B)
        run: |
          cd gitops-demo/istio-demo/ab-testing/environments/demo-prod

          yq -i '
          (.patches[] | select(.target.name == "backend-v1") | .patch) |=
            sub("backend:.*"; "backend:" + env(SHA_OLD)) |

          (.patches[] | select(.target.name == "backend-v2") | .patch) |=
            sub("backend:.*"; "backend:" + env(SHA_NEW)) |

          (.patches[] | select(.target.name == "monitor-v1") | .patch) |=
            sub("monitor:.*"; "monitor:" + env(SHA_OLD)) |

          (.patches[] | select(.target.name == "monitor-v2") | .patch) |=
            sub("monitor:.*"; "monitor:" + env(SHA_NEW))
          ' kustomization.yaml

      - name: Commit & push DEV
        run: |
          cd gitops-demo
          BRANCH=promote-${{ env.SHA_NEW }}

          git add .
          git commit -m "prod: deploy ${{ env.SHA_NEW }}"
          git push origin $BRANCH

      - name: Create PR
        run: |
          BRANCH=promote-${{ env.SHA_NEW }}

          gh pr create \
            --repo ${{ env.GITOPS_REPO }} \
            --base main \
            --head $BRANCH \
            --title "Promote to prod: ${{ env.SHA_NEW }}" \
            --body "Automated promotion from dev to prod"
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
```


{{< imageviewer folder="/images/devops/cicd/argocd" >}}
