---
title: "Homepage"
description: "A highly customizable dashboard for docker and kubernetes cluster"
featured_image: "/images/featured/home.png"
date: 2024-04-24
author: "Mark Taguiad"
tags: ["self-hosted", "docker", "k8s", "dashboard"]
---

<!-- ![Alt text](/images/homepage/homepage.png) -->
[![imagen](/images/homepage/homepage.png)](/images/homepage/homepage.png)
<!-- ![homepage](http://chevereto.marktaguiad.dev/images/2024/08/31/homepage.png) -->

Looking for flashy and dynamic dashboard to organized your websites and self-hosted application running on your cluster/server? Checkout [homepage](https://github.com/benphelps/homepage/tree/main)!

### Homepage Core Features
- Docker integration
- Kubernetes integration
- Service Integration
- Various widgets

### Experience with Homepage

It's easy to install and configure, with docker you may need to mount the config but with kubernetes it can be configured by using config maps. This has been my [dashboard](https://dashboard.marktaguiad.dev) for quite sometime now and every websites and application deployed is added. 

It has a quick integration using annonation in ingress, here is a sample. With this example, this application/website is added automatically to group `Links`.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tagsdev-hugo-ingress
  annotations:
    gethomepage.dev/description: "TagsDev | Mark Taguaid"
    gethomepage.dev/enabled: "true"
    gethomepage.dev/group: Links
    gethomepage.dev/icon: https://raw.githubusercontent.com/mcbtaguiad/web-tagsdev-hugo/main/app/static/images/fa-tags-nobg.png
    gethomepage.dev/name: TagsDev
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
      - marktaguiad.dev
    secretName: tagsdev-hugo-tls
  rules:
  - host: marktaguiad.dev
    http:
      paths:
      - path: /
        #pathType: ImplementationSpecific
        pathType: Prefix
        backend:
          service:
            name: web-tagsdev
            port:
              number: 8080
```

### Homepage with Docker
Installing it is easy! Just use docker-compose/podman-compose.
```yaml
version: "3.3"
services:
  homepage:
    image: ghcr.io/benphelps/homepage:latest
    container_name: homepage
    ports:
      - 3000:3000
    volumes:
      - /path/to/config:/app/config # Make sure your local config directory exists
      - /var/run/docker.sock:/var/run/docker.sock:ro # (optional) For docker integrations

```

### Homepage with Kubernetes
Use the unofficial helm chart: https://github.com/jameswynn/helm-charts/tree/main/charts/homepage

```sh
helm repo add jameswynn https://jameswynn.github.io/helm-charts
helm install my-release jameswynn/homepage
```

Or use my kube deploy files. 

deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: homepage
  namespace: web
  labels:
    app.kubernetes.io/name: homepage
spec:
  revisionHistoryLimit: 3
  replicas: 1
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app.kubernetes.io/name: homepage
  template:
    metadata:
      labels:
        app.kubernetes.io/name: homepage
    spec:
      serviceAccountName: homepage
      automountServiceAccountToken: true
      dnsPolicy: ClusterFirst
      enableServiceLinks: true
      containers:
      - name: homepage
        image: ghcr.io/gethomepage/homepage:latest
        imagePullPolicy: Always
        securityContext:
          privileged: true
        ports:
          - name: http
            containerPort: 3000
            protocol: TCP
        volumeMounts:
          - name: homepage-config
            mountPath: /app/config
          - name: logs
            mountPath: /app/config/logs
      volumes:
        - name: homepage-config
          configMap:
            name: homepage
        - name: logs
          emptyDir:
            {}
```
service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: homepage
  namespace: web
  labels:
    app.kubernetes.io/name: homepage
  annotations:
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: homepage
```

serviceaccount.yaml
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: homepage
  namespace: web
  labels:
    app.kubernetes.io/name: homepage
secrets:
  - name: homepage
```

clusterrole.yaml
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: homepage
  labels:
    app.kubernetes.io/name: homepage
rules:
  - apiGroups:
      - ""
    resources:
      - namespaces
      - pods
      - nodes
    verbs:
      - get
      - list
  - apiGroups:
      - extensions
      - networking.k8s.io
    resources:
      - ingresses
    verbs:
      - get
      - list
  - apiGroups:
      - metrics.k8s.io
    resources:
      - nodes
      - pods
    verbs:
      - get
      - list

```


clusterrolebinding.yaml
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: homepage
  labels:
    app.kubernetes.io/name: homepage
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: homepage
subjects:
  - kind: ServiceAccount
    name: homepage
    namespace: web
```
