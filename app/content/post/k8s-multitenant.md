---
title: "Kubernetes Multi-Tenancy"
date: 2026-04-11
author: "Mark Taguiad"
tags: ["rbac", "multitenant", "kubernetes"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-multitenant-001.png"
dark="/images/devops/k8s-notes/k8s-multitenant-dark-001.png"
alt="Architecture Diagram"
>}}

Multi-tenancy in Kubernetes is the practice of running multiple users, teams, or customers (tenants) on a shared cluster while keeping them isolated, secure, and fairly resourced.

At first glance, it sounds simple—just create namespaces and you’re done. In reality, building a safe multi-tenant platform requires layering multiple controls together.

# Table of Contents
{{< toc >}}

### Overview
Let's assign team `web-dev` to namespace `web`. 

The following resources will be created:
- Access Control (RBAC)
- Resource Allocation
- Network Isolation
- Policy Enforcement


### User Creation
Check my previous [post](/post/k8s-rbac).

```bash
./create-user-k8s.sh web-dev web-dev 7 d
```

### Access Control
Let's use `ClusterRole` that will be reusable by multiple user/team.

*clusterrole.yaml*
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-clusterrole
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]

  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]

  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
```
You can fine tune this depending on your requirements:
- add secret policy
- add network policy
- add ingresses

```yaml
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
```

*rolebinging.yaml*
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: web-rolebinding
  namespace: web
subjects:
  - kind: User
    name: web-dev
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: tenant-clusterrole
  apiGroup: rbac.authorization.k8s.io
```
### Resource Allocation
Prevents tenant from exhausting cluster resources.

*resourcequota.yaml*
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: web-quota
  namespace: web
spec:
  hard:
    pods: "10"
    requests.cpu: "2"
    requests.memory: "2Gi"
    limits.cpu: "4"
    limits.memory: "4Gi"
    persistentvolumeclaims: "5"
```

In you applications limit your pods/container using resources request and limits.

*demo.yaml*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: redis
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: docker.io/bitnami/redis:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 6379
        resources:
          limits:
            memory: 500Mi
            cpu: 500m
          requests:
            memory: 250Mi
            cpu: 250m
        envFrom:
        - configMapRef:
            name: redis.environment
      restartPolicy: Always

```
| Concept      | Meaning               |
| ------------ | --------------------- |
| Request      | Minimum guaranteed    |
| Limit        | Maximum allowed       |
| Actual usage | Can vary between them |

### NetworkPolicy
*networkpolicy.yaml*

Default deny all ingress + egress.
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: web
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```
Allow traffic only within same namespace.
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: web
spec:
  podSelector: {}
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```
Allow outbound internet access (DNS + HTTP/HTTPS).
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-egress
  namespace: web
spec:
  podSelector: {}
  egress:
    - to:
        - namespaceSelector: {}  # allow cluster DNS
      ports:
        - protocol: UDP
          port: 53
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
  policyTypes:
    - Egress
```
