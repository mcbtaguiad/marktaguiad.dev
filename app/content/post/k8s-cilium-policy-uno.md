---
title: "Cilium Network Policy: Kubernetes NetworkPolicy"
date: 2026-04-26
author: "Mark Taguiad"
tags: ["kubernetes", "networking", "cni", "ebpf", "cilium", "policy", "networkpolicy"]
UseHugoToc: true
weight: 2
---
When people first start working with Cilium policies, the easiest way to understand them is to group them into two simple ideas:

1. Who can talk to what?
2. What they’re allowed to do once connected?

That mental model maps directly to how Cilium builds policy enforcement—from basic workload isolation all the way up to application-aware HTTP filtering.

If you already think in terms of namespace rules and Layer 7 rules like HTTP GET/POST like we did in [Istio](/post/k8s-istio-uno/), you’re already on the right track. Cilium simply expands that model into something much more powerful and much more granular.

# Table of Contents
{{< toc >}}

### Kubernetes NetworkPolicy
This is the standard Kubernetes-native policy object. That means you can write standard Kubernetes `NetworkPolicy` objects and still have them enforced by Cilium, without changing the API.

It provides basic network controls such as:
- ingress and egress rules
- pod selectors
- namespace selectors
- port restrictions

This is useful for simple traffic control such as allowing one namespace to reach another or limiting traffic to specific ports.

However, native Kubernetes NetworkPolicy is limited to Layer 3 and Layer 4. It does not understand application-layer protocols like HTTP, DNS, or gRPC, and it does not support Cilium-specific features like FQDN filtering or deny rules.

### Example
Let's use the `echo` pod in this [post](/post/k8s-cilium-uno/).
#### Policy
This example allows only pods in the `universe` namespace to access pods labeled `app=echo` in the `echo` namespace on TCP port `80`.

*allow-universe-to-echo.yaml*
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-universe-to-echo
  namespace: echo
spec:
  podSelector:
    matchLabels:
      app: echo

  policyTypes:
    - Ingress

  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: universe
      ports:
        - protocol: TCP
          port: 80
```
Apply policy in `echo` namespace.
```bash
kubectl apply -f allow-universe-to-echo.yaml
```
#### App
And deploy `curl` app in both `universe` and `galaxy` namespace.
```bash
kubectl run curl \
  --image=curlimages/curl:latest \
  --restart=Never \
  --labels="app=curl" \
  -n universe \
  --command -- sleep infinity
```
```bash
kubectl run curl \
  --image=curlimages/curl:latest \
  --restart=Never \
  --labels="app=curl" \
  -n galaxy \
  --command -- sleep infinity
```
#### Verify
Verify, notice that `curl` pod in `galaxy` namespace cannot reach `echo` pod in `echo` namespace.
```bash
kubectl exec -it curl -n universe -- sh
~ $ curl -m 5 -s -o /dev/null -w "%{http_code}\n" echo.echo.svc.cluster.local
200

kubectl exec -it curl -n galaxy -- sh
~ $ curl -m 5 -s -o /dev/null -w "%{http_code}\n" echo.echo.svc.cluster.local
000
```
### Hubble
We can also confirm this in Cilium using `hubble`.
```bash
kubectl exec -it cilium-k6cb4 -n kube-system -- hubble observe
Apr 27 11:26:11.993: universe/curl:33156 (ID:93339) -> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) policy-verdict:none TRAFFIC_DIRECTION_UNKNOWN ALLOWED (TCP Flags: SYN)
Apr 27 11:26:11.993: universe/curl:33156 (ID:93339) -> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: SYN)
Apr 27 11:26:11.993: universe/curl:33156 (ID:93339) <- echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: SYN, ACK)
Apr 27 11:26:11.993: universe/curl:33156 (ID:93339) -> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: ACK)
Apr 27 11:26:11.993: universe/curl:33156 (ID:93339) -> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: ACK, PSH)
Apr 27 11:26:11.993: universe/curl:33156 (ID:93339) <- echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: ACK, PSH)
Apr 27 11:26:11.994: universe/curl:33156 (ID:93339) -> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Apr 27 11:26:11.994: universe/curl:33156 (ID:93339) <- echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Apr 27 11:26:11.995: universe/curl:33156 (ID:93339) -> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) to-endpoint FORWARDED (TCP Flags: ACK)
```

```bash
kubectl exec -it cilium-k6cb4 -n kube-system -- hubble observe
Apr 27 11:27:13.848: galaxy/curl:55360 (ID:102210) <> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) policy-verdict:none TRAFFIC_DIRECTION_UNKNOWN DENIED (TCP Flags: SYN)
Apr 27 11:27:13.848: galaxy/curl:55360 (ID:102210) <> echo/echo-5dc8fd6498-kfvj6:80 (ID:71969) Policy denied DROPPED (TCP Flags: SYN)
```
Notice the `ID` tag on each pod, to make debugging and observability easier we can extract it using command below.
```bash
kubectl get cep curl -n universe -o jsonpath='{.status.identity.id}'
93339

kubectl get cep curl -n galaxy -o jsonpath='{.status.identity.id}'
102210
```

Now we can use `hubble` like this.
```bash
kubectl exec -it cilium-k6cb4 -n kube-system -- hubble observe 93339
kubectl exec -it cilium-k6cb4 -n kube-system -- hubble observe 102210
```

#### UI
You can also observe this in the `Hubble UI`. Port-forward the service or attach it to an IP pool.
```bash
kubectl port-forward svc/hubble-ui 8080:80 -n kube-system
```
{{< theme-image
light="/images/devops/k8s-notes/cilium/cilium-policy1-001.png"
dark="/images/devops/k8s-notes/cilium/cilium-policy1-dark-001.png"
alt="Hubble UI"
>}}
