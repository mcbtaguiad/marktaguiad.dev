---
title: "Create GKE Cluster with Terraform/Opentofu Part Uno"
date: 2026-04-08
author: "Mark Taguiad"
tags: ["cloud", "ulap", "gke", "terraform", "opentofu", "gcp", "google", "kubernetes", "standard gke", "autopilot gke"]
UseHugoToc: true
weight: 2
---
Still a not-so comprehensive guide to create GKE Cluster with Terraform/Opentofu. 

Visit the previous [post](/post/gulap-vm) before proceeding with this one. 

Repo for this post: [g-ulap-demo](https://github.com/mcbtaguiad/g-ulap-demo.git).
# Table of Contents
{{< toc >}}

### Overview
This topic is quite big and not a single blog or post would answer all your question. I advice you to read on documentations and blog posts. This post would be too long if I explain every details.

As a curious engineer and sometimes reckless (don't be reckless when using company account or in production hahaha), I suggest you first deploy and you fix the error that popped up. 

We'll cover creating both `Standard GKE` and `Autopilot GKE`, I won't be able to show you here some of the code blocks like `variables.tf` so make sure to look at the repo for reference. 

Also I structured it to be modular so if you are not yet familiar with Terraform modules then I suggest you also look it up. 

### Project Structure
```bash
├── env
│   ├── dev
│   │   ├── main.tf
│   │   ├── provider.tf
│   │   ├── terraform.tfvars
│   │   └── variables.tf
│   └── prod
│       ├── main.tf
│       ├── provider.tf
│       ├── terraform.tfvars
│       └── variables.tf
└── modules
    ├── addons
    │   ├── cert-manager
    │   │   └── main.tf
    │   └── ingress-nginx
    │       └── main.tf
    ├── gke
    │   ├── autopilot
    │   │   ├── main.tf
    │   │   ├── outputs.tf
    │   │   └── variables.tf
    │   └── standard
    │       ├── main.tf
    │       ├── outputs.tf
    │       └── variables.tf
    ├── iam
    │   ├── api
    │   │   ├── main.tf
    │   │   └── variables.tf
    │   └── service-account
    │       ├── main.tf
    │       ├── outputs.tf
    │       └── variables.tf
    ├── network
    │   ├── firewall
    │   │   ├── main.tf
    │   │   └── variables.tf
    │   ├── main.tf
    │   ├── output.tf
    │   └── variables.tf
    ├── nodepool
    │   ├── main.tf
    │   └── variables.tf
    └── storage
        ├── main.tf
        └── variables.tf
```
### Services & Roles
Enable first services in your Terraform service account and project. We are using the same service account used in the previous post.
```bash
gcloud services enable container.googleapis.com --project=<project_id>

gcloud projects add-iam-policy-binding <project_id> \
  --member="serviceAccount:tofu-sa@<project_id>.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageAdmin"

gcloud projects add-iam-policy-binding <project_id> \
  --member="serviceAccount:tofu-sa@<project_id>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"
```

### IAM Module
#### api
Enables required Google Cloud APIs.

| API              | Purpose                                  |
| ---------------- | ---------------------------------------- |
| compute          | Required for networking and VM instances |
| container        | Core GKE service                         |
| logging          | Collects cluster logs                    |
| monitoring       | Provides metrics and observability       |
| secretmanager    | Secure storage for secrets               |
| artifactregistry | Stores container images                  |

*modules/api/main.tf*
```
resource "google_project_service" "api" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "logging.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "artifactregistry.googleapis.com"
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
```
#### Service Account
Creates a service account for `nodepool` with logging and metrics roles. 
- *logging.logWriter* - Allows nodes to send logs
- *monitoring.metricWriter* - Allows nodes to send metrics

*modules/service-account/main.tf*
```
resource "google_service_account" "node" {
  account_id = var.node_sa
}

resource "google_project_iam_member" "gke_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.node.email}"
}

resource "google_project_iam_member" "gke_metrics" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.node.email}"
}
```
Export the output to be used in `nodepool` module.

*modules/service-account/outputs.tf*
```
output "node_sa_email" {
  value = google_service_account.node.email
}
```

### Network Module
Disable this if you are okay with your nodes and cluster exposed to the public cloud. GCP create a network with auto-generated subnets. 

We'll create a private network and NAT to expose the endpoint for Ingress and Outbout internet (pulling container images, apis, updates).

#### VPC
*modules/network/main.tf*
```
resource "google_compute_network" "vpc" {
  name                            = "gke-network"
  routing_mode                    = "REGIONAL"
  auto_create_subnetworks         = false
  delete_default_routes_on_create = true
}

# -----------------------------
# Subnet (with secondary ranges)
# -----------------------------
resource "google_compute_subnetwork" "private" {
  name                     = "private"
  ip_cidr_range            = "10.0.32.0/19"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "k8s-pods"
    ip_cidr_range = "172.16.0.0/14"
  }

  secondary_ip_range {
    range_name    = "k8s-services"
    ip_cidr_range = "172.20.0.0/18"
  }
}

# -----------------------------
# Cloud Router
# -----------------------------
resource "google_compute_router" "router" {
  name    = "router"
  region  = var.region
  network = google_compute_network.vpc.id
}

# -----------------------------
# Cloud NAT 
# -----------------------------
resource "google_compute_router_nat" "nat" {
  name   = "nat"
  region = var.region
  router = google_compute_router.router.name

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.private.self_link
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

# -----------------------------
# Firewall
# -----------------------------
module "firewall" {
  source = "./firewall"

  network = google_compute_network.vpc.name
}
```
*modules/outputs.tf*
```
output "network" {
  value = google_compute_network.vpc.id
}

output "subnetwork" {
  value = google_compute_subnetwork.private.id
}

output "network_name" {
  value = google_compute_network.vpc.name
}
```
#### Firewall
*modules/network/firewall/main.tf*
```
# -----------------------------
# Default route (required!)
# -----------------------------
resource "google_compute_route" "internet" {
  name             = "egress-internet"
  network          = var.network
  dest_range       = "0.0.0.0/0"
  next_hop_gateway = "default-internet-gateway"
}

# -----------------------------
# Firewall: Internal traffic
# -----------------------------
resource "google_compute_firewall" "allow_internal" {
  name    = "gke-allow-internal"
  network = var.network

  direction = "INGRESS"

  source_ranges = [
    "10.0.0.0/8",       # node subnet
    "172.16.0.0/14",    # pods
    "172.20.0.0/18"     # services
  ]

  allow {
    protocol = "all"
  }
}

# -----------------------------
# Firewall: Egress (internet access)
# -----------------------------
resource "google_compute_firewall" "allow_egress" {
  name    = "gke-allow-egress"
  network = var.network

  direction = "EGRESS"

  destination_ranges = ["0.0.0.0/0"]

  allow {
    protocol = "all"
  }
}

# -----------------------------
# Firewall: Control plane → nodes
# -----------------------------
resource "google_compute_firewall" "allow_master_to_nodes" {
  name    = "gke-master-to-nodes"
  network = var.network 

  direction = "INGRESS"

  source_ranges = ["192.168.0.0/28"]

  allow {
    protocol = "tcp"
    ports    = ["443", "10250"]
  }
}
```

### Node Pool Module
This is where your workloads actually run. Changed the configuration based on your app requirement, this will get costly if not managed correctly. 

Disable this module if you are planning to use `autopilot`. 

In this module, we defined the compute layer of our GKE setup:
- configured a scalable node pool
- enabled automatic repair and upgrades
- defined machine and disk configurations
- connected nodes to a secure service account

*modules/nodepool/main.tf*
```
resource "google_container_node_pool" "gke-node" {
  name    = "gke-node"
  cluster = var.cluster_id
  location = var.region

  autoscaling {
    total_min_node_count = var.min_node
    total_max_node_count = var.max_node
  } 

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    disk_size_gb = var.disk_size_gb
    machine_type = var.machine_type
    disk_type    = var.disk_type
    

    # labels = {
    #   role = "worker"
    # }

    # taint {
    #   key    = "instance_type"
    #   value  = "spot"
    #   effect = "NO_SCHEDULE"
    # }

    service_account = var.node_sa
    oauth_scopes = [
      "https://www.googleapis.com/auth/compute",
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
    ]
  }
}
```
