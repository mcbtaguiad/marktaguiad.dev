---
title: "Chevereto - Install Notes"
date: 2024-05-22
author: "Mark Taguiad"
tags: ["image-hosting", "k8s", "self-hosted", "docker"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

# Chevereto - Install Notes

Moved and hosted all media used by my website [here](https://chevereto.tagsdev.xyz/). 

Issues or error encountered using chevereto official docker image. Using nfs-csi, might not encounter this issue in using different CSI.

1. Permission error accessing /var/www/html/
```bash
# kube exec to the pod
$ chown -R www-data:www-data /var/www/html
```
2. Cannot create folder /var/www/html/images/_assets/ 
```bash
# kube exec to the pod
$ mkdir -p /var/www/html/images/_assets/
$ chown -R www-data:www-data /var/www/html/images/
```


config.yaml
```yaml
apiVersion: v1
data:
  CHEVERETO_DB_HOST: db_host
  CHEVERETO_DB_USER: root
  CHEVERETO_DB_PASS: verystrongpassword
  CHEVERETO_DB_PORT: '3306'
  CHEVERETO_DB_NAME: chevereto
  CHEVERETO_HOSTNAME: chevereto.tagsdev.xyz
  CHEVERETO_HOSTNAME_PATH: /
  CHEVERETO_HTTPS: '0'
  CHEVERETO_ASSET_STORAGE_TYPE: local
  CHEVERETO_ASSET_STORAGE_URL: http://chevereto.tagsdev.xyz/images/_assets/
  CHEVERETO_ASSET_STORAGE_BUCKET: /var/www/html/images/_assets/
  CHEVERETO_MAX_POST_SIZE: 2G
  CHEVERETO_MAX_UPLOAD_SIZE: 2G
kind: ConfigMap
metadata:
  creationTimestamp: null
  labels:
    app: chevereto
  name: chevereto-config
```

deploy.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: chevereto
  name: chevereto
spec:
  replicas: 1
  selector:
    matchLabels:
      app: chevereto
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: chevereto
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: kubernetes.io/os
                    operator: In
                    values:
                      - linux
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 15
              preference:
                matchExpressions:
                  - key: core
                    operator: In
                    values:
                      - "4"
            - weight: 10
              preference:
                matchExpressions:
                  - key: core
                    operator: In
                    values:
                      - "3"
            # - weight: 10
            #   preference:
            #     matchExpressions:
            #     - key: kubernetes.io/role
            #       operator: In
            #       values:
            #       - 'worker'
            - weight: 5
              preference:
                matchExpressions:
                  - key: disk
                    operator: In
                    values:
                      - "ssd"
      containers:
        - image: chevereto/chevereto:4.1.4
          name: chevereto
          ports:
            - containerPort: 80
          resources: {}
          volumeMounts:
            - mountPath: /var/www/html/images/
              subPath: data
              name: chevereto-data
          envFrom:
            - configMapRef:
                name: chevereto-config
      initContainers:
        - name: volume-permission
          image: ghcr.io/chevereto/chevereto:4.1.4
          command:
            - sh
            - -c
            - "mkdir -p /var/www/html/images/_assets/ && chown -R www-data:www-data /var/www/html/images/"
          volumeMounts:
            - name: chevereto-data
              subPath: data
              mountPath: /var/www/html/images/
          securityContext:
            runAsUser: 0

      restartPolicy: Always
      volumes:
        - name: chevereto-data
          persistentVolumeClaim:
            claimName: chevereto-pvc
status: {}

```

service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: chevereto
  name: chevereto
spec:
  ports:
    - name: "80"
      port: 80
      targetPort: 80
  selector:
    app: chevereto
status:
  loadBalancer: {}
```


ingress.yaml
```yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chevereto-ingress
  annotations:
    # kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: 1000m
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - chevereto.tagsdev.xyz
    secretName: chevereto-tls
  rules:
  - host: chevereto.tagsdev.xyz
    http:
      paths:
      - pathType: Prefix
        path: /
        backend:
          service:
            name: chevereto
            port:
              number: 80
```

