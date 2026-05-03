---
title: "Kubernetes Monitoring & Logging"
date: 2026-03-21
author: "Mark Taguiad"
tags: ["k8s", "monitoring", "kubernetes", "prometheus", "alertmanager", "logging", "loki"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-mon-log-001.png"
dark="/images/devops/k8s-notes/k8s-mon-log-dark-001.png"
alt="Dash"
>}}

If you have used prometheus in your docker or podman environment then this is much easier to setup. Unlike in your docker/podman where you have to create the config and scrape config from scratch, in k8s some good helm repo are already available to use and do all that for you. Also Prometheus in Kubernetes has a dynamic service discovery, so any resources added to the cluster will autotmatically added and monitored. 

For logging let's integrate Loki, this is bundled with grafana. 

I won't go into much details about architecture, etc. It is better to deploy the monitoring and logging stack and you explore the dashboard. 
# Table of Contents
{{< toc >}}
### Deploy
#### Monitoring
Install via `Helm`.

This will install the default value of the helm chart.
- Prometheus
- Alertmanager
- Grafana
```bash
kubectl create ns monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring
```

To customized installation, extract helm values and edit to your liking. 
```bash
helm show values prometheus-community/kube-prometheus-stack > value.yaml
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -f value.yaml -n monitoring
```
This is a minimal manifest which enable Persisten Storage and add email alerting in alertmanager. There other options in `routes` availble, famous are [slack](https://grafana.com/blog/step-by-step-guide-to-setting-up-prometheus-alertmanager-with-slack-pagerduty-and-gmail/) and [discord](https://github.com/rogerrum/alertmanager-discord), please do check them. 

*value.yaml*
```yaml
alertmanager:
  enabled: true
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: rook-cephfs
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi

  config:
    global:
      resolve_timeout: 5m

    route:
      receiver: alert-emailer
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      routes::
        - receiver: alert-emailer
          group_wait: 2m
          continue: true

    receivers:
      - name: alert-emailer
        email_configs:
          - to: alerts@yourdomain.com
            send_resolved: true
            from: alerts@yourdomain.com
            smarthost: mail.yourdomain.com:587
            auth_username: alerts@yourdomain.com
            auth_identity: alerts@yourdomain.com
            auth_password: AveryStongPassword123!
            require_tls: true

prometheus:
  enabled: true
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: rook-cephfs
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi

grafana:
  enabled: true
  persistence:
    enabled: true
    storageClassName: rook-cephfs
    accessModes: ["ReadWriteOnce"]
    size: 5Gi
```
```bash
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack -f value.yaml -n monitoring
```

If installation succeed.
```bash
NAME: kube-prometheus-stack
LAST DEPLOYED: Mon Mar 23 21:10:53 2026
NAMESPACE: monitoring
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
kube-prometheus-stack has been installed. Check its status by running:
  kubectl --namespace monitoring get pods -l "release=kube-prometheus-stack"

Get Grafana 'admin' user password by running:

  kubectl --namespace monitoring get secrets kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo

Access Grafana local instance:

  export POD_NAME=$(kubectl --namespace monitoring get pod -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=kube-prometheus-stack" -oname)
  kubectl --namespace monitoring port-forward $POD_NAME 3000

Get your grafana admin user password by running:

  kubectl get secret --namespace monitoring -l app.kubernetes.io/component=admin-secret -o jsonpath="{.items[0].data.admin-password}" | base64 --decode ; echo


Visit https://github.com/prometheus-operator/kube-prometheus for instructions on how to create & configure Alertmanager and Prometheus instances using the Operator.
```

Get contents. 
```bash
kubectl get pods -n monitoring 
NAME                                                        READY   STATUS    RESTARTS   AGE
alertmanager-kube-prometheus-stack-alertmanager-0           2/2     Running   0          81s
kube-prometheus-stack-grafana-85cdd5d48d-5mdv9              3/3     Running   0          92s
kube-prometheus-stack-kube-state-metrics-567d49447b-g9l7x   1/1     Running   0          92s
kube-prometheus-stack-operator-5b6c67b7b-cbdkq              1/1     Running   0          92s
kube-prometheus-stack-prometheus-node-exporter-gxkbh        1/1     Running   0          92s
kube-prometheus-stack-prometheus-node-exporter-m7jms        1/1     Running   0          92s
kube-prometheus-stack-prometheus-node-exporter-ww2td        1/1     Running   0          92s
prometheus-kube-prometheus-stack-prometheus-0               2/2     Running   0          81s
```
In production environment make sure to add `Persistent Volume`. If no PVC is defined, Prometheus data would be deleted if pod are restarted .

### Logging
Usually Loki is deployed with Grafana, but for my dev environment I'll be using the same namespace and reusing the Grafana pod deployed earlier. 

Loki is more complicated to configure compared to prometheu stack, it will have to depend on what environment you are working on. 

For production environment make sure you are using either `High Availability Mode` or `Microservices Mode`, make sure you have Object Storage available to use. Since I'm using a small cluster we'll be using `SingleBinary Mode`. 

Here's a quck summary table comparing the modes. 

| Deployment Mode        | Scale                  | Storage Requirement      | Environment                    |
| ---------------------- | ---------------------- | ------------------------ | ------------------------------ |
| SingleBinary           | Small, 1 pod           | Local filesystem OK      | Dev/test, small clusters       |
| HA (High Availability) | Medium-large           | Object storage preferred | Production, critical workloads |
| Microservices          | Large, multi-component | Object storage required  | Large enterprise, multi-tenant |

Export the loki chart values to inspect the deployment options.
```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm show values grafana/loki  > values.yaml
```

This is a minimal install using `SingleBinary Mode`.

*value.yaml*
```yaml
deploymentMode: SingleBinary

loki:
  auth_enabled: false

  commonConfig:
    replication_factor: 1

  storage:
    type: filesystem

  schemaConfig:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: filesystem
        schema: v13
        index:
          prefix: index_
          period: 24h

singleBinary:
  replicas: 1

  persistence:
    enabled: true
    storageClass: rook-cephfs
    accessModes:
      - ReadWriteMany 
    size: 10Gi

# explicitly disable scalable components
write:
  replicas: 0
read:
  replicas: 0
backend:
  replicas: 0
```

Deploy.
```bash
helm upgrade --install loki grafana/loki -n monitoring -f value.yaml
```
### Expose Endpoint
#### Metallb
Using Metallb/Loadbalancer, edit service and change `ClusterIP` to `LoadBalancer`.
```bash
kubectl get svc -n  monitoring
NAME                                             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
alertmanager-operated                            ClusterIP   None            <none>        9093/TCP,9094/TCP,9094/UDP   5m27s
kube-prometheus-stack-alertmanager               ClusterIP   10.43.163.166   <none>        9093/TCP,8080/TCP            5m39s
kube-prometheus-stack-grafana                    ClusterIP   10.43.46.120    <none>        80/TCP                       5m39s
kube-prometheus-stack-kube-state-metrics         ClusterIP   10.43.224.131   <none>        8080/TCP                     5m39s
kube-prometheus-stack-operator                   ClusterIP   10.43.116.141   <none>        443/TCP                      5m39s
kube-prometheus-stack-prometheus                 ClusterIP   10.43.212.61    <none>        9090/TCP,8080/TCP            5m39s
kube-prometheus-stack-prometheus-node-exporter   ClusterIP   10.43.61.90     <none>        9100/TCP                     5m39s
prometheus-operated                              ClusterIP   None            <none>        9090/TCP                     5m27s
```
```bash
# Grafana
kubectl edit svc kube-prometheus-stack-grafana -n monitoring
service/kube-prometheus-stack-grafana edited

# Prometheus
kubectl edit svc kube-prometheus-stack-prometheus -n monitoring
service/kube-prometheus-stack-prometheus edited

# Alermanager
kubectl edit svc kube-prometheus-stack-alertmanager -n monitoring
service/kube-prometheus-stack-alertmanager edited
```
Verify endpoints.
```bash
kubectl get svc -n monitoring
NAME                                             TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)                         AGE
alertmanager-operated                            ClusterIP      None            <none>            9093/TCP,9094/TCP,9094/UDP      12m
kube-prometheus-stack-alertmanager               LoadBalancer   10.43.161.11    192.168.254.222   9093:30198/TCP,8080:31683/TCP   12m
kube-prometheus-stack-grafana                    LoadBalancer   10.43.74.225    192.168.254.220   80:32594/TCP                    12m
kube-prometheus-stack-kube-state-metrics         ClusterIP      10.43.209.174   <none>            8080/TCP                        12m
kube-prometheus-stack-operator                   ClusterIP      10.43.112.212   <none>            443/TCP                         12m
kube-prometheus-stack-prometheus                 LoadBalancer   10.43.30.133    192.168.254.221   9090:32616/TCP,8080:30470/TCP   12m
kube-prometheus-stack-prometheus-node-exporter   ClusterIP      10.43.52.148    <none>            9100/TCP                        12m
prometheus-operated                              ClusterIP      None            <none>            9090/TCP                        12m
```

Loki does not have a UI, it is dependent with Grafana. Make sure to add Loki in sources when you access Grafana. 

#### Ingress
Sample Ingress, this can also be enabled in the `value.yaml` file.

*ingress-grafana.yaml*
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls: 
  - hosts:
    - grafana.yourdomain.com
    secretName: grafana-tls
  rules:
  - host: grafana.yourdomain.com
    http:
      paths:
      - pathType: Prefix
        path: /
        backend:
          service:
            name: kube-prometheus-stack-grafana
            port:
              number: 80

```
*ingress-prometheus.yaml*
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - prometheus.yourdomain.com
    secretName: prometheus-tls
  rules:
  - host: prometheus.yourdomain.com
    http:
      paths:
      - pathType: Prefix
        path: /
        backend:
          service:
            name: kube-prometheus-stack-prometheus 
            port:
              number: 9090
```

*ingress-alertmanager.yaml*
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alermanager-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - alertmanager.yourdomain.com
    secretName: alertmanager-tls
  rules:
  - host: alertmanager.yourdomain.com
    http:
      paths:
      - pathType: Prefix
        path: /
        backend:
          service:
            name: kube-prometheus-stack-alertmanager 
            port:
              number: 9093
```
