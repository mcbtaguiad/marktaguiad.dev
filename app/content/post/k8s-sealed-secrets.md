---
title: "Kubernetes Sealed Secrets"
date: 2026-04-19
author: "Mark Taguiad"
tags: ["kubernetes", "secrets", "git", "security", "sealed secret"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-sealed-secrets.png"
dark="/images/devops/k8s-notes/k8s-sealed-secrets-dark.png"
alt="Secret"
>}}
k8s-sealed-secrets.png
Managing secrets in Kubernetes is a bit tricky. Native `Secret` objects are only `base64-encoded`—not encrypted—making them unsafe for Git-based workflows. If you're doing GitOps (e.g., with Argo CD), committing raw secrets is not an option.

This is where [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) comes in.
# Table of Contents
{{< toc >}}

### Why Sealed Secret?
Sealed Secrets uses asymmetric encryption to solve one problem:

`How do you safely store secrets in Git?`

- Encrypt secrets outside the cluster (using a public key)
- Decrypt secrets inside the cluster only (using a private key)

### Install
#### Cluster
Check the [release](https://github.com/bitnami-labs/sealed-secrets/releases) page for the latest release.
```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.36.6/controller.yaml
```

#### Client
```bash
curl -OL "https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.36.6/kubeseal-0.36.6-linux-amd64.tar.gz"
tar -xvzf kubeseal-0.36.6-linux-amd64.tar.gz kubeseal
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

#### Certificate
Extrat public certificate.
```bash
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  > cert.pem
```

### Key
Make sure to backup the controller private key.
```bash
 kubectl get secret -n kube-system | grep secret
sealed-secrets-keyfzmnz      kubernetes.io/tls             2      47m
```

```bash
kubectl get secret -n kube-system sealed-secrets-keyfzmnz -o yaml > sealed-secrets-key.yaml
```

### Example
#### Default K8S Secrets
Let's create a sample secret for CouchDB deployment.
```bash
kubectl create secret generic db-secret \
  --from-literal=COUCHDB_USER=admin \
  --from-literal=COUCHDB_PASSWORD=averysecurepassword123 \
  --dry-run=client -o yaml > couchdb-secret.yaml
```

*couchdb-secret.yaml*
```yaml
apiVersion: v1
data:
  COUCHDB_PASSWORD: YXZlcnlzZWN1cmVwYXNzd29yZDEyMw==
  COUCHDB_USER: YWRtaW4=
kind: Secret
metadata:
  name: db-secret
```

This is not safe to commit to your git repo, since it can be decoded.
```bash
echo "YWRtaW4=" | base64 -d
admin

echo "YXZlcnlzZWN1cmVwYXNzd29yZDEyMw==" | base64 -d
averysecurepassword123
```
#### Sealed Secret
Now let's encrypt the secret. 
```bash
kubeseal --cert=cert.pem \
  --format=yaml < couchdb-secret.yaml > couchdb-secret-sealed.yaml
```

*couchdb-secret-sealed*
```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-secret
  namespace: default
spec:
  encryptedData:
    COUCHDB_PASSWORD: AgAgCCc+n5Ah+cnlcSGH/OIPspB9q+jn/KdNv77ltmhSHca6jq09Jy6fqV0g0Py7asvnPgHHniW6PKySqtUssUZkxi4lJ/AmnBOlkBuUGZlViUjTTk2dRf5oFFt/CP2sr8r9XAXKVDmAo9L4PVR9ZacbttaQOhe5Y/fHv7aS9ympBp2ZMkzwnQITl0X/jdiaiW6mgHCaQhfkLlChfW/dukWDfwpif2lBNL3eVoaCIAXKtPM4ndsRU3tJLg4hLVmFMJ5gvpJe1Qz+OF/lOXLAfAtIVd5Eze9BrxUw2apUoIO3xY4wMFDVdb5UdurusA3kXVIgqB69zgF+C72ECvfP+Ty5gg4HbtG10KPIUR0w40ElV/tWpRQEOtdyt4l65IUraWMqfcKn6vLKMlCEG7ppAKWXmq9tNtDO11yLGHK4Us8E3sUgtrVZtcdFMLGrFSoNYAXL7TPfCz30dtx3ZMC8466SuMwLd4Dm4nbqLjdKuBsbKyKsfCV4Psrz8yNpO7GFNjtRcVvYkhOFKCU0j/DByQABx1AzZMLw9YX4oLbErjTWge5UflciW/duwtIBOgi82YvNRm/XycS9m5YI+NSG3CMyB/hQ/WNozIWlLnDQayCdpJVSlhL+fq3POpiLo71ETvawCzvf10PWg48DM4rHM1Oe2B18ZVyvovOdDyQjKBZF6Stav5iddICht00tyvhC8MeCG35ZMNs2e9fB+GeQUOVz06dvq/0Q
    COUCHDB_USER: AgCOBRG5gh/ndLysWJ8z39RQdwe82u7VP4K/wPOAthylumi0LZSC9De2fz0v2zzadJ/3QYe0ammlQD7MnzOKgWDo6YOO8K/kSF6kOfgyoxv2rjiQeXeN+uFDh/5gE6ZHPfkIvqo55iAGcQDQ6V8HqiC1t7in35a51Ik5hHzMvEp6eJ1Dzv+D8FgRKMStUeMR4Zo/Qdo/zcMoKx0EPesrmw21f3BSsmlcyhtMAHcCY0QU4xlbecr5tHSUabG4RJIqDxIgfcc27g9XAJ/QtwHPTb4TslLoKkTXqPSC285h68sID2Iv7AXA06GlBr0WucQgUNQeo3my0kZvPjVbs7KD7Ji59RHnjLNnieRRt43whNLRUpgRnMJyS97KEgSiGljT6tXt5phBvXOsCxM7AyVKacfU8XZRmvHOtAinhu2z7qK6UFc8pTpQd+5UqsQaAKfo7ZTawM4B+4Ia2lhXHCrW7LqG5SMoJmVYcjhy/Mhp7VUliaBDMn1Yl6Q7Npn6PJ/At9Fek5IcgjHDI3b6As9/KYMO9+wyINca69bPdSRDCXgKZ8kRGNl03J8GKdJPtRIkIyxg/CrYbPf7LgdNptfJl2DN2FhMP2n1atyp2XjYA48bxwKKxjobcIQ40gLXqG5FXDgMbbeQDCJQkOlZvkWcEiIkVCnDucW1Y8tTk6pBofTMRMeAgIuzzJlNImy8mvgrfBi67vEUng==
  template:
    metadata:
      name: db-secret
      namespace: default
```

Apply it to the cluster, the sealed secrete controller will automatically detect and decode it.
```bash
kubectl create -f couchdb-secret-sealed.yaml
```
#### Git
Now this is now safe to store it to your git repository.
```bash
git add couchdb-secret-sealed.yaml
git commit -m 'db sealed secret'
git push
```
