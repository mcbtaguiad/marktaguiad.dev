---
title: "Cilium Network Policy: CiliumNetworkPolicy"
date: 2026-04-28
author: "Mark Taguiad"
tags: ["kubernetes", "networking", "cni", "ebpf", "cilium", "policy", "networkpolicy"]
UseHugoToc: true
weight: 2
---
`CiliumNetworkPolicy` (CNP) is the most commonly used policy type in Cilium.

It is namespace-scoped, meaning the policy applies only within the namespace where it is created.

This is the policy most teams use for real-world application security because it enables zero-trust controls at Layer 3, Layer 4, and Layer 7.

If Kubernetes NetworkPolicy is a basic firewall, CiliumNetworkPolicy is the full application-aware policy engine.

What discussed and showed here is similar with `CiliumClusterwideNetworkPolicy`, the only difference it the policy is cluster wide. Read more on that topic and how to combine these policies.

# Table of Contents
{{< toc >}}

### Policies by Use Case
#### Layer 3, Layer 4, and Layer 7 Filtering
Cilium can enforce policy across multiple layers of the network stack.
- Layer 3 - source/destination identity (who can talk)
- Layer 4 - ports and protocols (how they talk)
- Layer 7 - application semantics like HTTP methods, paths, and gRPC

Example: **Allow only HTTP GET /health**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-healthcheck-only
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: api

  ingress:
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: frontend
            app: frontend
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/health"
```

#### Ingress and Egress Controls
Cilium supports both inbound and outbound traffic policy.
- ingress controls who can reach a workload
- egress controls where a workload can go

Example: **Allow ingress from frontend**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-ingress
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: api

  ingress:
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: frontend
```
Example: **Allow egress to external API**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-api
  namespace: demo
spec:
  endpointSelector:
    matchLabels:
      app: demo

  egress:
    - toFQDNs:
        - matchName: api.marktaguiad.dev
```

#### Pod and Namespace Selectors
Cilium can also select workloads using pod labels and namespace identity.

Example: **Allow frontend namespace to reach backend pods**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: backend

  ingress:
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: frontend
            app: frontend
```

#### CIDR-Based Rules
Cilium can allow or deny traffic using raw IP ranges.

Useful for:
- external services
- legacy systems
- VMs outside Kubernetes
- blocking known IP ranges

Example: **Allow access from other subnets**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-other-subnet
  namespace: demo
spec:
  endpointSelector: {}

  ingress:
    - fromCIDR:
        - 10.10.0.0/16
```

#### Built-in Entities
Cilium includes built-in identity groups called entities.

Common ones include:
- world - traffic outside the cluster
- cluster - anything inside the cluster
- host - the local node
- remote-node - other Kubernetes nodes
- kube-apiserver - Kubernetes API server

Example: **Allow only cluster-internal traffic**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: internal-only
  namespace: apps
spec:
  endpointSelector: {}

  ingress:
    - fromEntities:
        - cluster
```

Example: **Allow Traffic to Kubernetes API Server**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-kube-api
  namespace: demo
spec:
  endpointSelector: {}

  egress:
    - toEntities:
        - kube-apiserver
```

#### DNS-Aware Filtering
Cilium can inspect DNS traffic and allow only specific DNS queries.

This is useful when workloads should resolve only approved domains.

Example: **Allow DNS lookups only for api.marktaguiad.dev**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-specific-dns-query
  namespace: frontend
spec:
  endpointSelector:
    matchLabels:
      app: frontend

  egress:
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s:k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
          rules:
            dns:
              - matchName: api.marktaguiad.dev
```
#### FQDN-Based Egress
Cilium can enforce egress policy using domain names.

Example: **Allow outbound HTTPS to marktaguaid.dev only**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-stripe
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: backend

  egress:
    - toFQDNs:
        - matchName: marktaguiad.dev
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```
#### Explicit Deny Policies
Unlike native Kubernetes NetworkPolicy, Cilium supports explicit deny rules.

These are useful for hard blocks even when broader allow rules exist.

Example: **Deny all ingress and egress traffic**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
  namespace: demo
spec:
  endpointSelector: {}
  ingress: []
  egress: []
```

### Example
Check this repo for full example.

Repo: [mcbtaguiad/cilium-demo](https://github.com/mcbtaguiad/cilium-demo.git)

#### Deploy
```bash
cd  cilium-demo/networkpolicy
kubectl apply -k demo/environments/demo
```

This will create four deployments.
- frontend   /app
- backend   /api
- monitor   /status
- redis
```bash
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
backend       backend-759b4ffd4-8ghcq                    1/1     Running   0          4h19m
database      redis-7849668f57-8rckb                     1/1     Running   0          4h19m
frontend      frontend-6945d865bc-l7hsh                  1/1     Running   0          4h19m
monitor       monitor-566cf69cf9-vvndd                   1/1     Running   0          4h19m
```
A gateway is created and will attach to LoadBalancer IP  `192.168.254.230`. 
```bash
NAMESPACE     NAME                            TYPE           CLUSTER-IP       EXTERNAL-IP       PORT(S)                  AGE
gateway       cilium-gateway-cilium-gateway   LoadBalancer   10.108.196.155   192.168.254.230   80:32207/TCP             4h19m
```

#### Frontend Policy
Policy limits frontend to be reachable only through the Cilium Gateway on port 80.

Allowed:
- client → Gateway → frontend

Blocked:
- pod → frontend
- direct cluster access → frontend
- frontend → anywhere
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
spec:
  endpointSelector: {}
  ingress: []
  egress: []
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-only-gateway
spec:
  endpointSelector:
    matchLabels:
      app: frontend

  ingress:
    - fromEntities:
        - ingress

      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
```

#### Backend Policy
Backend is reachable only through the Gateway, only on port 3000, and only for the listed API endpoints.

Allowed:
- Gateway → backend /api/* (only listed routes/methods)

Blocked:
- pod → backend
- direct cluster access → backend
- any unlisted API path or HTTP method
- backend → anywhere (egress still denied)

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
spec:
  endpointSelector: {}
  ingress: []
  egress: []
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-gateway-to-backend
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: backend

  ingress:
    - fromEntities:
        - ingress

      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/api"
              - method: "POST"
                path: "/api/register"
              - method: "POST"
                path: "/api/login"
              - method: "GET"
                path: "/api/profile"
              - method: "GET"
                path: "/api/version"
              - method: "GET"
                path: "/api/users"
              - method: "PUT"
                path: "/api/users"
              - method: "DELETE"
                path: "/api/users"
```
#### Monitor Policy
Monitor is reachable only through the Gateway on port 8000.

Allowed:
- client → Gateway → monitor
Blocked:
- pod → monitor
- direct cluster access → monitor
- monitor → anywhere (egress still denied)

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
spec:
  endpointSelector: {}
  ingress: []
  egress: []
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: monitor-only-gateway
spec:
  endpointSelector:
    matchLabels:
      app: monitor

  ingress:
    - fromEntities:
        - ingress

      toPorts:
        - ports:
            - port: "8000"
              protocol: TCP
```
#### Database Policy
Redis accepts connections only from backend pods.

Allowed:
- backend → redis
Blocked:
- frontend → redis
- monitor → redis
- direct cluster access → redis
- any other pod → redis


```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
spec:
  endpointSelector: {}
  ingress: []
  egress: []
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: backend-to-database
spec:
  endpointSelector:
    matchLabels:
      app: redis

  ingress:
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: backend
            app: backend
```
