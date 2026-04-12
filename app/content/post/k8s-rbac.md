---
title: "Kubernetes RBAC"
date: 2026-04-07
author: "Mark Taguiad"
tags: ["kubernetes", "rbac", "security"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-rbac-001.png"
dark="/images/devops/k8s-notes/k8s-rbac-dark-001.png"
alt="Architecture Diagram"
>}}

Role‑Based Access Control (RBAC) is a core part of Kubernetes security — it lets you grant precise permissions to users, groups, or service accounts so they can do only what they’re allowed. In this hands‑on guide, we’ll go step‑by‑step through:
- creating a Kubernetes user
- assigning permissions using RBAC
- testing permissions

Read more on this topic [here](https://kubernetes.io/docs/reference/access-authn-authz/rbac/).
# Table of Contents
{{< toc >}}

### Create Kubernetes User
Let's automate this process-in the perspective of an admin. Use the script to create user.
- create user
- option to assign user to group
- set user validity (hours/days)
- create kubeconfig file
#### Script
*create-user-k8s.sh*
```bash
#!/bin/bash
set -e

USER_NAME="$1"
GROUP="$2"
DURATION="$3"
UNIT="$4"

# Validate username
if [ -z "$USER_NAME" ]; then
    echo "Usage: $0 <username> <group or -> <duration> <unit (d/h)>"
    exit 1
fi

# Default values
GROUP=${GROUP:-"-"}
DURATION=${DURATION:-1}
UNIT=${UNIT:-d}

# Treat "-" as empty group
if [ "$GROUP" == "-" ]; then
    GROUP=""
fi

# Convert duration to seconds
if [[ "$UNIT" == "h" ]]; then
    EXPIRATION_SECONDS=$((DURATION * 60 * 60))
else
    EXPIRATION_SECONDS=$((DURATION * 24 * 60 * 60))
fi

CSR_NAME="${USER_NAME}-csr"
K8S_SERVER="https://192.168.254.201:6443"
KUBECONFIG_OUT="${USER_NAME}-kubeconfig.yaml"

# Path to admin kubeconfig (for approving CSR)
ADMIN_KUBECONFIG="${KUBECONFIG:-/home/mcbtaguiad/Documents/develop/kubeadm-ansible/k3s.yaml}"

# Creat User DIR
USER_DIR="./${USER_NAME}"
mkdir -p "${USER_DIR}"

# File paths
KEY_FILE="${USER_DIR}/${USER_NAME}.pem"
CSR_FILE="${USER_DIR}/${USER_NAME}.csr"
CRT_FILE="${USER_DIR}/${USER_NAME}.crt"
CSR_YAML="${USER_DIR}/${CSR_NAME}.yaml"
KUBECONFIG_FILE="${USER_DIR}/${KUBECONFIG_OUT}"

echo "Generating private key..."
openssl genrsa -out ${KEY_FILE} 2048

echo "Creating CSR..."
if [ -z "$GROUP" ]; then
  openssl req -new -key ${KEY_FILE} -out ${CSR_FILE} -subj "/CN=${USER_NAME}"
else
  openssl req -new -key ${KEY_FILE} -out ${CSR_FILE} -subj "/CN=${USER_NAME}/O=${GROUP}"
fi

echo "Encoding CSR..."
CSR_BASE64=$(base64 -w 0 ${CSR_FILE})

echo "Creating CSR YAML with expiration of ${EXPIRATION_SECONDS} seconds..."
cat <<EOF > ${CSR_YAML}
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: ${CSR_NAME}
spec:
  request: ${CSR_BASE64}
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: ${EXPIRATION_SECONDS}
  usages:
  - digital signature
  - key encipherment
  - client auth
EOF

echo "Applying CSR..."
kubectl --kubeconfig=${ADMIN_KUBECONFIG} apply -f ${CSR_YAML}

echo "Approving CSR..."
kubectl --kubeconfig=${ADMIN_KUBECONFIG} certificate approve ${CSR_NAME}

echo "Fetching signed certificate..."
kubectl --kubeconfig=${ADMIN_KUBECONFIG} get csr ${CSR_NAME} -o jsonpath='{.status.certificate}' | base64 -d > ${CRT_FILE}

echo "Encoding cert and key..."
CRT_BASE64=$(base64 -w 0 ${CRT_FILE})
KEY_BASE64=$(base64 -w 0 ${KEY_FILE})

echo "Extracting cluster CA..."
CLUSTER_NAME=$(kubectl --kubeconfig="${ADMIN_KUBECONFIG}" config view --raw -o jsonpath='{.contexts[0].context.cluster}')

CA_DATA=$(kubectl --kubeconfig="${ADMIN_KUBECONFIG}" config view --raw -o jsonpath="{.clusters[?(@.name=='$CLUSTER_NAME')].cluster.certificate-authority-data}")

if [ -z "$CA_DATA" ]; then
    CA_PATH=$(kubectl --kubeconfig="${ADMIN_KUBECONFIG}" config view --raw -o jsonpath="{.clusters[?(@.name=='$CLUSTER_NAME')].cluster.certificate-authority}")
    if [ ! -f "$CA_PATH" ]; then
        echo "Error: certificate-authority file '$CA_PATH' not found"
        exit 1
    fi
    CA_DATA=$(base64 -w 0 "$CA_PATH")
fi

echo "Creating kubeconfig..."
cat <<EOF > ${KUBECONFIG_FILE}
apiVersion: v1
kind: Config

clusters:
- name: k8s-cluster
  cluster:
    server: ${K8S_SERVER}
    certificate-authority-data: ${CA_DATA}

users:
- name: ${USER_NAME}
  user:
    client-certificate-data: ${CRT_BASE64}
    client-key-data: ${KEY_BASE64}

contexts:
- name: ${USER_NAME}-context
  context:
    cluster: k8s-cluster
    user: ${USER_NAME}

current-context: ${USER_NAME}-context
EOF

echo "Done!"
echo "All files for user '${USER_NAME}' are in: ${USER_DIR}"
echo "Kubeconfig: ${KUBECONFIG_FILE}"
```
#### Create User
Create user `jonathan` in group `admin`.
```bash
./create-user-k8s.sh jonathan admin 7 d
Generating private key...
Creating CSR...
Encoding CSR...
Creating CSR YAML with expiration of 604800 seconds...
Applying CSR...
certificatesigningrequest.certificates.k8s.io/jonathan-csr created
Approving CSR...
certificatesigningrequest.certificates.k8s.io/jonathan-csr approved
Fetching signed certificate...
Encoding cert and key...
Extracting cluster CA...
Creating kubeconfig...
Done!
All files for user 'jonathan' are in: ./jonathan
Kubeconfig: ./jonathan/jonathan-kubeconfig.yaml
```
#### Verify
Verify if user is created and approved. 
```bash
kubectl get csr
NAME           AGE     SIGNERNAME                            REQUESTOR      REQUESTEDDURATION   CONDITION
jonathan-csr   4m43s   kubernetes.io/kube-apiserver-client   system:admin   7d                  Approved,Issued
```
#### Test
Test `kubeconfig`.
```
export KUBECONFIG=./jonathan/jonathan-kubeconfig.yaml
kubectl get pods -A
Error from server (Forbidden): pods is forbidden: User "jonathan" cannot list resource "pods" in API group "" at the cluster scope
```
This confirms that user `jonathan` does not have a permission yet. Let's discuss and demonstrate in the following sections. 

#### Delete User
Manual delete user or wait till cert validity expires. 
```
kubectl delete csr jonathan-csr
```
### Roles & RoleBindings
If you want to bind the user to namespace only.
- Roles – Namespace‑scoped permission sets
- RoleBindings – Bind a Role to a user, group, or service account in a namespace

Let's grant permission user `jonathan` to namespace `demo-prod`, it can manage pods withing the namespace. 

*role.yaml*
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: demo-prod
  name: pod-admin
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
```
*rolebinding.yaml*
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-manager-binding
  namespace: demo-prod
subjects:
- kind: User
  name: jonathan
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-admin
  apiGroup: rbac.authorization.k8s.io
```
Apply manifest, make sure you are using admin account when applying this. 
```bash
kubectl create -f role.yaml 
role.rbac.authorization.k8s.io/pod-admin created

kubectl create -f rolebinding.yaml 
rolebinding.rbac.authorization.k8s.io/pod-manager-binding created
```
Verify if `jonathan` can list pods in namespace `demo-prod`.
```bash
kubectl --kubeconfig=jonathan-kubeconfig.yaml get pods -n demo-prod 
NAME                          READY   STATUS    RESTARTS        AGE
backend-v1-6d98ddbb6f-8d8mw   2/2     Running   1 (4h15m ago)   5d21h
backend-v2-654764d985-6vhqf   2/2     Running   1 (4h15m ago)   5d21h
frontend-6945d865bc-ssmbb     2/2     Running   1 (4h15m ago)   5d21h
monitor-v1-bdf9bd784-qnmtg    2/2     Running   1 (4h15m ago)   5d21h
monitor-v2-67fdbb578b-8lb44   2/2     Running   1 (4h15m ago)   5d21h
redis-7849668f57-sxck7        2/2     Running   1 (4h15m ago)   5d21h
```

Test if `jonathan` can access other namespace.
```bash
kubectl --kubeconfig=jonathan-kubeconfig.yaml get pods -n monitoring
Error from server (Forbidden): pods is forbidden: User "jonathan" cannot list resource "pods" in API group "" in the namespace "monitoring"
```

### Cluster Roles & Cluster Role Bindings
This is used for cluster level permissions.
- ClusterRoles – Permissions that apply cluster‑wide
- ClusterRoleBindings – Bind a ClusterRole to a subject across all namespaces

Now let's make user `jonathan` can access pods in all namespace.

*clusterrole.yaml*
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-admin
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
```
*clusterrolebinding.yaml*
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: pod-manager-binding
subjects:
- kind: User
  name: jonathan
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: pod-admin
  apiGroup: rbac.authorization.k8s.io
```

Apply manifest. 
```bash
kubectl create -f clusterole.yaml 
clusterrole.rbac.authorization.k8s.io/pod-admin created

kubectl create -f clusterolebinding.yaml 
clusterrolebinding.rbac.authorization.k8s.io/pod-manager-binding created
```

Verify if `jonathan` can now access other namespace.
```bash
kubectl --kubeconfig=jonathan-kubeconfig.yaml get pods -n monitoring 
NAME                                                        READY   STATUS    RESTARTS        AGE
alertmanager-kube-prometheus-stack-alertmanager-0           2/2     Running   2 (4h42m ago)   11d
kube-prometheus-stack-grafana-b9b5555c7-xsqml               3/3     Running   3 (4h42m ago)   11d
kube-prometheus-stack-kube-state-metrics-567d49447b-rvxzd   1/1     Running   1 (4h42m ago)   11d
kube-prometheus-stack-operator-5cdf745d5b-9gbnk             1/1     Running   1 (4h42m ago)   11d
kube-prometheus-stack-prometheus-node-exporter-dvz4r        1/1     Running   1 (4h42m ago)   11d
kube-prometheus-stack-prometheus-node-exporter-jfnxx        1/1     Running   1 (4h43m ago)   11d
kube-prometheus-stack-prometheus-node-exporter-sw8x4        1/1     Running   1 (4h42m ago)   11d
loki-0                                                      2/2     Running   2 (4h42m ago)   5d11h
loki-canary-2wn2l                                           1/1     Running   1 (4h42m ago)   5d11h
loki-canary-5j8wh                                           1/1     Running   1 (4h43m ago)   5d11h
loki-canary-kqjj4                                           1/1     Running   1 (4h42m ago)   5d11h
loki-chunks-cache-0                                         2/2     Running   2 (4h43m ago)   5d11h
loki-gateway-7dbfcfc68d-qjbs8                               1/1     Running   1 (4h42m ago)   5d11h
loki-results-cache-0                                        2/2     Running   2 (4h42m ago)   5d11h
prometheus-kube-prometheus-stack-prometheus-0               2/2     Running   4 (4h43m ago)   11d
```
