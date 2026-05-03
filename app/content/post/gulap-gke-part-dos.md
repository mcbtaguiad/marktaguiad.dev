---
title: "Create GKE Cluster with Terraform/Opentofu Part Dos"
date: 2026-04-08T20:10:15+08:00
author: "Mark Taguiad"
tags: ["cloud", "ulap", "gke", "terraform", "opentofu", "gcp", "google", "kubernetes", "standard gke", "autopilot gke"]
UseHugoToc: true
weight: 2
---
Part 2 of this [post](/post/gulap-gke-part-uno)
# Table of Contents
{{< toc >}}

### GKE Module
This module is where everything comes together—network, IAM, and node pools—to create a working GKE cluster.

#### Standard vs Autopilot
| Feature      | Standard            | Autopilot      |
| ------------ | ------------------- | -------------- |
| Node control | Full                | None           |
| Scaling      | Manual + autoscaler | Fully managed  |
| Operations   | You manage          | Google manages |
| Flexibility  | High                | Limited        |
#### Standard
Gives you full control over nodes and scaling.
- removes default node pool - you manage it separately
- uses VPC-native networking (pods/services ranges)
- private cluster - nodes have no public IP
- uses Workload Identity for secure access

*modules/gke/standard/main.tf*
```
resource "google_container_cluster" "gke" {
  name                     = var.cluster_name
  location                 = var.region
  remove_default_node_pool = true
  initial_node_count       = var.initial_node_count
  network                  = var.network
  subnetwork               = var.subnetwork
  networking_mode          = "VPC_NATIVE"

  deletion_protection = false

  # Optional, if you want multi-zonal cluster
  # node_locations = ["us-central1-b"]

  node_config {
    disk_size_gb = 15
    machine_type = "e2-micro"
    disk_type    = "pd-balanced"
  }

  addons_config {
    http_load_balancing {
      disabled = true
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "k8s-pods"
    services_secondary_range_name = "k8s-services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "192.168.0.0/28"
  }
}
```

*modules/gke/standard/outputs.tf*
```
output "cluster_id" {
  value = google_container_cluster.gke.id
}

output "endpoint" {
  value = google_container_cluster.gke.endpoint
}

output "ca_certificate" {
  value = google_container_cluster.gke.master_auth[0].cluster_ca_certificate
}
```
#### Autopilot
Fully managed—no node pool management required.
- no node pools to manage
- google handles scaling, upgrades, and operations
- best for simplicity and faster setup

*modules/gke/standard/main.tf*
```
resource "google_container_cluster" "gke" {
  name                     = var.cluster_name
  location                 = var.region

  enable_autopilot = true

  network                  = var.network
  subnetwork               = var.subnetwork
  networking_mode          = "VPC_NATIVE"

  deletion_protection = false

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "k8s-pods"
    services_secondary_range_name = "k8s-services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "192.168.0.0/28"
  }
}
```
*modules/gke/autopilot/outputs.tf*
```
output "cluster_id" {
  value = google_container_cluster.gke.id
}

output "endpoint" {
  value = google_container_cluster.gke.endpoint
}

output "ca_certificate" {
  value = google_container_cluster.gke.master_auth[0].cluster_ca_certificate
}
```

### Storage Module
In GKE, a default storage class is already created for you. This means you can provision persistent volumes out of the box without defining anything.

This module only matters if you want to customize storage behavior—such as disk type, reclaim policy, or default class.

We define two storage classes:
- **balance (default)** - general-purpose workloads
- **SSD** - high-performance workloads

*module/storage/main.tf*
```
resource "kubernetes_storage_class" "balanced" {
  metadata {
    name = var.balanced_sc_name
  }

  storage_provisioner = "pd.csi.storage.gke.io"

  parameters = {
    type = "pd-balanced"
  }

  reclaim_policy      = "Retain"
  volume_binding_mode = "WaitForFirstConsumer"

  allow_volume_expansion = true
}

resource "kubernetes_storage_class" "ssd" {
  metadata {
    name = var.ssd_sc_name

  }

  storage_provisioner = "pd.csi.storage.gke.io"

  parameters = {
    type = "pd-ssd"
  }

  reclaim_policy      = "Retain"
  volume_binding_mode = "WaitForFirstConsumer"

  allow_volume_expansion = true
}

resource "kubernetes_annotations" "default_storageclass" {
  api_version = "storage.k8s.io/v1"
  kind        = "StorageClass"
  metadata {
    name = var.balanced_sc_name
  }

  annotations = {
    "storageclass.kubernetes.io/is-default-class" = "true"
  }

  force = true
}
```

### Addons Module
These are not required for GKE to function, but they are critical for real-world applications.

In this module, we install two key components using Helm:
- Ingress NGINX - exposes services to the internet
- cert-manager - manages TLS certificates automatically

#### Ingress-Nginx
Ingress is how external traffic reaches services inside your cluster.

*modules/addons/ingress-nginx/main.tf*
```
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"

  create_namespace = true

  set {
    name  = "controller.publishService.enabled"
    value = "true"
  }
}
```
#### cert-manager
Automates the creation and renewal of SSL/TLS certificates inside Kubernetes.

*modules/addons/cert-manager/main.tf*
```
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  namespace  = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = "v1.20.1"

  create_namespace = true

  values = [<<EOF
crds:
  enabled: true

global:
  leaderElection:
    namespace: cert-manager
EOF
  ]
}
```
