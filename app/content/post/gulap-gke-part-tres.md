---
title: "Create GKE Cluster with Terraform/Opentofu Part Tres"
date: 2026-04-09
author: "Mark Taguiad"
tags: ["cloud", "ulap", "gke", "terraform", "opentofu", "gcp", "google", "kubernetes", "standard gke", "autopilot gke"]
UseHugoToc: true
weight: 2
---
Part 3 of this [post](/post/gulap-gke-part-uno)
# Table of Contents
{{< toc >}}

To make this really modular let's create environemnt for Dev and Prod. 

Let's assign `standard gke` to dev and `autopilot gke` to prod.

This approach keeps out infrastructure:
- consistent
- reusable
- environment-aware
- easy to scale

### Providers
This is present in both environment.
```
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.26.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10" # or latest
    }
  }
}

provider "google" {
  credentials = file(var.credentials_file)
  project = var.project_id
  region  = var.region
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host  = "https://${module.gke.endpoint}"
  token = data.google_client_config.default.access_token

  cluster_ca_certificate = base64decode(
    module.gke.ca_certificate
  )
}

provider "helm" {
  kubernetes {
    host  = "https://${module.gke.endpoint}"

    token = data.google_client_config.default.access_token

    cluster_ca_certificate = base64decode(
      module.gke.ca_certificate
    )
  }
}
```

### Development Environment
The dev environment is designed for flexibility and cost efficiency. 

It uses a Standard GKE cluster, where you have full control over nodes.

*env/dev/main.tf*
```
# -------------------------------
# IAM
# -------------------------------
module "api" {
  source = "../../modules/iam/api"
  project_id = var.project_id
}

module "service-account" {
  source = "../../modules/iam/service-account"
  node_sa = var.node_sa
  project_id = var.project_id
}

# -------------------------------
# Network
# -------------------------------
module "network" {
  source = "../../modules/network"
  region = var.region

}

# -------------------------------
# Cluster
# -------------------------------It uses GKE Autopilot, where Google manages the infrastructure.
module "gke" {
  source = "../../modules/gke/standard"

  project_id = var.project_id
  region = var.region
  zone = var.zone

  cluster_name = var.cluster_name
  initial_node_count = var.initial_node_count

  network = module.network.network
  subnetwork = module.network.subnetwork
}

# -------------------------------
# Node Pool
# -------------------------------
module "nodepool" {
  source = "../../modules/nodepool"

  project_id = var.project_id
  region = var.region
  cluster_id = module.gke.cluster_id

  node_sa = module.service-account.node_sa_email

  min_node = var.min_node
  max_node = var.max_node

  disk_size_gb = var.disk_size_gb
  machine_type = var.machine_type
  disk_type = var.disk_type

}

# -------------------------------
# Storage
# -------------------------------
module "storage" {
  source = "../../modules/storage"

  balanced_sc_name = var.balanced_sc_name
  ssd_sc_name = var.ssd_sc_name


  depends_on = [module.gke, module.nodepool]
}

# -------------------------------
# Ingress-nginx
# -------------------------------
module "ingress-nginx" {
  source = "../../modules/addons/ingress-nginx"

  depends_on = [module.gke, module.nodepool]
}

# -------------------------------
# Cert-manager
# -------------------------------
module "cert_manager" {
  source = "../../modules/addons/cert-manager"

  depends_on = [module.gke, module.nodepool, module.ingress-nginx]
}
```

*env/dev/terraform.tfvars*
```
project_id = "project-12345"
credentials_file = "/home/username/.config/gcp/service-account.json"
region = "us-east1"
zone = "us-east1-c"

service_account = "tofu-sa@project-123456.iam.gserviceaccount.com"

node_sa = "gke-node-sa"
cluster_name = "gke-cluster"

initial_node_count = 1

disk_size_gb = 20
machine_type = "e2-small"
disk_type    = "pd-balanced"

min_node = 1
max_node = 5

balanced_sc_name = "balanced-sc"
ssd_sc_name = "ssd-sc"
```
### Production Environment
Production is designed for stability and minimal operations overhead.

It uses GKE Autopilot, where Google manages the infrastructure.

*env/dev/main.tf*
```
# -------------------------------
# IAM
# -------------------------------
module "api" {
  source = "../../modules/iam/api"
  project_id = var.project_id
}

# -------------------------------
# Network
# -------------------------------
module "network" {
  source = "../../modules/network"
  region = var.region

}

# -------------------------------
# Cluster
# -------------------------------
module "gke" {
  source = "../../modules/gke/autopilot"

  project_id = var.project_id
  region = var.region
  zone = var.zone

  cluster_name = var.cluster_name

  network = module.network.network
  subnetwork = module.network.subnetwork
}

# -------------------------------
# Storage
# -------------------------------
module "storage" {
  source = "../..//modules/storage"

  balanced_sc_name = var.balanced_sc_name
  ssd_sc_name = var.ssd_sc_name


  depends_on = [module.gke]
}

# -------------------------------
# Ingress-nginx
# -------------------------------
module "ingress-nginx" {
  source = "../../modules/addons/ingress-nginx"

  depends_on = [module.gke]
}

# -------------------------------
# Cert-manager
# -------------------------------
module "cert_manager" {
  source = "../../modules/addons/cert-manager"

  depends_on = [module.gke, module.ingress-nginx]
}

```

*env/prod/terraform.tfvars*
```
project_id = "project-123456" 
credentials_file = "/home/username/.config/gcp/service-account.json"
region = "us-east1"
zone = "us-east1-c"

service_account = "tofu-sa@project-123456.iam.gserviceaccount.com"

cluster_name = "gke-cluster"

balanced_sc_name = "balanced-sc"
ssd_sc_name = "ssd-sc"
```

### Deploy
Navigate to either the environment.
- env/dev
- env/prod

```
tofu plan
tofu apply
```
### Kubeconfig
Get config using this command:
```bash
gcloud container clusters get-credentials <gke-cluster-name> --region <region> --project <project-id>
```

### Verify
Verify using kubectl command. 
```bash
kubectl get pods -A
NAMESPACE         NAME                                                READY   STATUS    RESTARTS        AGE
cert-manager      cert-manager-cainjector-7fc5bf87cd-bh96c            1/1     Running   0               3m19s
cert-manager      cert-manager-fb659bc9b-9fwg6                        1/1     Running   0               3m19s
cert-manager      cert-manager-webhook-55b4ff9fbf-pcngn               1/1     Running   0               3m19s
gke-managed-cim   kube-state-metrics-0                                2/2     Running   0               13m
gmp-system        collector-725mp                                     2/2     Running   0               7m31s
gmp-system        collector-cpwlq                                     2/2     Running   0               5m51s
gmp-system        gmp-operator-68d4ff44c6-whc2g                       1/1     Running   0               12m
ingress-nginx     ingress-nginx-controller-6c7cd85885-zhf2k           1/1     Running   0               6m35s
kube-system       event-exporter-gke-77766c7db8-gw9kh                 2/2     Running   1 (6m20s ago)   13m
kube-system       fluentbit-gke-6td9k                                 3/3     Running   0               5m51s
kube-system       fluentbit-gke-dkj46                                 3/3     Running   0               7m31s
kube-system       gke-metadata-server-gmtjs                           1/1     Running   0               7m31s
kube-system       gke-metadata-server-j7b8k                           1/1     Running   0               5m51s
kube-system       gke-metrics-agent-hn6dz                             3/3     Running   0               5m51s
kube-system       gke-metrics-agent-kswdw                             3/3     Running   0               7m31s
kube-system       ip-masq-agent-7x4px                                 1/1     Running   0               7m31s
kube-system       ip-masq-agent-8ddst                                 1/1     Running   0               5m51s
kube-system       konnectivity-agent-autoscaler-6f99bf84bc-b45zf      1/1     Running   0               12m
kube-system       konnectivity-agent-cc694844f-6crvt                  2/2     Running   0               5m41s
kube-system       konnectivity-agent-cc694844f-ssn8g                  2/2     Running   0               12m
kube-system       kube-dns-5865677fdd-mqb4t                           4/4     Running   0               5m41s
kube-system       kube-dns-5865677fdd-z9kzr                           4/4     Running   0               13m
kube-system       kube-dns-autoscaler-6c49bf7f57-pqgpk                1/1     Running   0               12m
kube-system       kube-proxy-gke-gke-cluster-gke-node-c8d441f8-plbd   1/1     Running   0               7m31s
kube-system       kube-proxy-gke-gke-cluster-gke-node-d17708a2-km2d   1/1     Running   0               5m51s
kube-system       metrics-server-v1.35.1-7f6b8db48b-8wvrq             1/1     Running   1 (4m13s ago)   12m
kube-system       netd-7b89w                                          3/3     Running   0               5m51s
kube-system       netd-8hs6w                                          3/3     Running   0               7m31s
kube-system       node-local-dns-v9f44                                2/2     Running   0               5m51s
kube-system       node-local-dns-ztzqc                                2/2     Running   0               7m31s
kube-system       pdcsi-node-mc2gf                                    3/3     Running   0               5m51s
kube-system       pdcsi-node-mz4v4                                    3/3     Running   0               7m31s

kubectl get nodes -A
NAME                                     STATUS   ROLES    AGE     VERSION
gke-gke-cluster-gke-node-c8d441f8-plbd   Ready    <none>   7m38s   v1.35.1-gke.1396002
gke-gke-cluster-gke-node-d17708a2-km2d   Ready    <none>   5m59s   v1.35.1-gke.1396002
```
