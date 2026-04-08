---
title: "Terraform/Opentofu VM Provisioning in Google Cloud Platform"
date: 2026-04-04
author: "Mark Taguiad"
tags: ["cloud", "ulap", "vm", "terraform", "opentofu"]
UseHugoToc: true
weight: 2
---
A not-so-comprehensive guide to provisioning a VM in Google Cloud Platform—because my bank account has… boundaries.

Cloud can get expensive real fast. If you’re using your company’s account, go wild. Live your best cloud life. Spin up instances like there’s no tomorrow.

But if you’re like me—personally funding this adventure—then welcome. We’ll be keeping things practical, efficient, and, most importantly, affordable.

For now, I’ll cover the basics and the stuff that actually matters. I’ll update this guide if I ever stumble upon a pot of gold.

# Table of Contents
{{< toc >}}

### Free Tier Account
If your just testing GCP, then I advice you use the free tier account. 

Check this [link](https://cloud.google.com/free?utm_source=google&utm_medium=cpc&utm_campaign=Cloud-SS-DR-GCP-1713664-GCP-DR-APAC-PH-en-Google-BKWS-MIX-GenericCloud&utm_content=c-Hybrid+%7C+BKWS+-+EXA+%7C+Txt+-+Generic+Cloud-Cloud+Generic-Core+GCP-PH_en-299036639748&utm_term=google%20cloud%20free%20tier&gclsrc=aw.ds&gad_source=1&gad_campaignid=12297519333&gclid=EAIaIQobChMIheyF3d7ckwMV5vtMAh3MlCy_EAAYASAAEgJXg_D_BwE).

### Service Account
Create `service account` that have permission to create vm `compute engine`. 

#### Account
If you already have account in GCP, then you already have a default project. Create new or keep using the default-make sure to use the project-id (e.g. myproject-123456). 
```bash
gcloud iam service-accounts create <your-tf-tofu-service-account> \
    --display-name=<service account description> \
    --project=<project-id>
```
The full service account email will look like:
```
my-service-account@my-sample-project-123.iam.gserviceaccount.com
```
#### Role/Permission
If you don't care about security, RBAC and don't want to worry about permission error that may arise.
```bash
gcloud projects add-iam-policy-binding <project-id> \
    --member=serviceAccount:tofu-sa@coltrane-492510.iam.gserviceaccount.com \
    --role=roles/roles/compute.admin
```
This is **overkill** for most real-world use cases.

Instead of roles/compute.admin, use more specific roles:
```bash
#!/bin/bash

PROJECT_ID="my-sample-project-123"
SA="my-service-account@$PROJECT_ID.iam.gserviceaccount.com"

for ROLE in \
  roles/compute.instanceAdmin.v1 \
  roles/compute.networkAdmin \
  roles/iam.serviceAccountUser 
do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA" \
    --role="$ROLE"
done
```

#### Export Service Account
```bash
gcloud iam service-accounts keys create ./service-account.json \
    --iam-account=<full_service_account_email> \
    --project=<project-id>
```
### Service
Enable GCP service, this is usually disabled by default.
```bash
gcloud services enable cloudresourcemanager.googleapis.com --project=<project-id>
gcloud services enable compute.googleapis.com --project=<project-id>
gcloud services enable networkmanagement.googleapis.com --project=<project-id>
gcloud services enable iap.googleapis.com --project=<project-id>
gcloud services enable monitoring.googleapis.com --project=<project-id>
```
### Basic VM
This will create VM:
- create `e2-micro`
- internal IP/subnet
- ssh through `IAP` tunnel only
- no extra disk
- no scaling


*provider.tf*
```
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.26.0"
    }
  }
}

provider "google" {
  credentials = file("${path.module}/service-account.json")
  project = var.project_id
  region  = var.region
}
```

*variables.tf*
```
variable "project_id" {
  type    = string
}
variable "region" {
  type        = string
  description = "Region"
}
variable "zone" {
  type        = string
  description = "Zone"
}
variable "compute_instance_name" {
  type        = string
  description = "Compute Instance Name"
}
variable "machine_type" {
  type        = string
  description = "Machine Type"
} 
variable "hostname" {
  type        = string
  description = "VM Hostname"
} 
variable "image_type" {
  type        = string
  description = "Image Type"
} 
variable "network_name" {
  type        = string
  description = "Network Name"
} 
```
*terraform.tfvars*
```
project_id = "yourproject-123456"

region = "us-west1"
zone = "us-west1-c"

compute_instance_name = "vm-name"
machine_type = "e2-micro"
image_type = "debian-cloud/debian-13"
network_name = "vm-network"

hostname = "vm-hostname"
```
*main.tf*
```
resource "google_compute_network" "vm_network" {
  name                    = var.network_name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "vm_sub_network" {
  name          = "my-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vm_network.id
}


resource "google_compute_instance" "vm_instance" {
  name         = var.compute_instance_name
  tags         = ["vm-test", "os-login"]
  zone         = var.zone
  machine_type = var.machine_type
  network_interface {
    network    = google_compute_network.vm_network.id
    subnetwork = google_compute_subnetwork.vm_sub_network.id
  }
  boot_disk {
    initialize_params {
      image = var.image_type
    }
  }
  hostname = var.hostname # if not set, default to vm google_compute_instance.name
}

```
Provision using `tf` or `tofu`.
```
tofu plan
tofu apply
```
List VM instances. 
```bash
gcloud compute instances list
NAME      ZONE        MACHINE_TYPE  PREEMPTIBLE  INTERNAL_IP  EXTERNAL_IP     STATUS
miles-vm  us-west1-c  e2-micro                   10.0.1.2                     RUNNING
```

### Network
Before we can SSH to the server we must first define the network.
#### Firewall
Allow SSH.
- "35.235.240.0/20" - IAP Subnet
- "0.0.0.0/0" - allow public access

```
resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh-iap"
  network = google_compute_network.vm_network.id

  source_ranges = ["35.235.240.0/20", "0.0.0.0/0"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  target_tags = ["vm-test"]
}
```

Make sure that `target_tags` is the same tag set in `vm_tags`.

#### Public IP
Skip this if you don't want to expose the VM in public domain. You can only login using IAP tunnel.

```
resource "google_compute_address" "vm_address" {
  name   = "external-test-ip"
  region = var.region
}

resource "google_compute_instance" "vm_instance" {
  name         = var.compute_instance_name
  tags         = ["vm-test", "os-login"]
  zone         = var.zone
  machine_type = var.machine_type
  network_interface {
    network    = google_compute_network.vm_network.id
    subnetwork = google_compute_subnetwork.vm_sub_network.id

    # acquire public/external ip
    access_config {
      nat_ip = google_compute_address.vm_address.address
    }
  }
}
```
### Login Method
#### IAM-Based
First enable `osloginapi`.


```
# compute engine api
resource "google_project_service" "project" {
  service            = "oslogin.googleapis.com"
  disable_on_destroy = false
}

data "google_project" "project" {
}
resource "google_project_iam_member" "os_login_admin_users" {
  project = data.google_project.project.project_id
  role    = "roles/compute.osAdminLogin"
  member  = "serviceAccount:service-${data.google_project.project.number}@compute-system.iam.gserviceaccount.com"
}
```
If you want to enable IAM-Based login to all the VM then define the metadata resources outside the `compute engine` bracket/resources.
```
resource "google_compute_project_metadata" "default" {
  metadata = {
    enable-oslogin = "TRUE"
  }
}
```
If not and explicit to specific VM. 
```
resource "google_compute_instance" "vm_instance" {
  name         = var.compute_instance_name
  tags         = ["vm-test", "os-login"]
  zone         = var.zone
  machine_type = var.machine_type
  network_interface {
    network    = google_compute_network.vm_network.id
    subnetwork = google_compute_subnetwork.vm_sub_network.id
  }
  boot_disk {
    initialize_params {
      image = var.image_type
    }
  }
  metadata = {
    enable-oslogin : "TRUE"
  }
}
```
To login to the vm/server.
```
gcloud compute ssh --zone "zone" "vm-name" --tunnel-through-iap --project "project-id"
```
#### SSH-Based
This is the traditional method-you would need to assign public IP to the VM. 

Using file (public-key), this will apply to all the VM created.
```
resource "google_os_login_ssh_public_key" "default" {
  user = data.google_client_openid_userinfo.me.email
  key  = file("id_rsa.pub") 
}
```

Using manifest, this will apply to all VM created.
```
resource "google_compute_project_metadata" "default" {
  metadata = {
    ssh-keys = <<EOF
      dev:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILg6UtHDNyMNAh0GjaytsJdrUxjtLy3APXqZfNZhvCeT dev
      test:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILg6UtHDNyMNAh0GjaytsJdrUxjtLy3APXqZfNZhvCeT test
    EOF
  }
}
```

Or apply metadata inside `compute engine` resources, this will apply only to this VM.
```
resource "google_compute_instance" "vm_instance" {
  name         = var.compute_instance_name
  tags         = ["vm-test", "os-login"]
  zone         = var.zone
  machine_type = var.machine_type
  network_interface {
    network    = google_compute_network.vm_network.id
    subnetwork = google_compute_subnetwork.vm_sub_network.id

    # acquire public/external ip
    access_config {
      nat_ip = google_compute_address.vm_address.address
    }
  }
  boot_disk {
    initialize_params {
      image = var.image_type
    }
  }
  metadata = {
    "ssh-keys" = var.ssh_keys
  }
}
```
List VM instances. 
```
gcloud compute instances list
NAME      ZONE        MACHINE_TYPE  PREEMPTIBLE  INTERNAL_IP  EXTERNAL_IP     STATUS
miles-vm  us-west1-c  e2-micro                   10.0.1.2     136.109.82.172  RUNNING
```
Login to the VM through External IP.
```bash
ssh <user>@<external_ip>
```

### Extra Disk
#### Persistent Storage
By default the Disk limit is `10gb`, if you are using free tier set limit to `30gb` and disk type to `pd-standard`.
```
resource "google_compute_instance" "vm_instance" {
  name         = var.compute_instance_name
  tags         = ["vm-test", "os-login"]
  zone         = var.zone
  machine_type = var.machine_type
  network_interface {
    network    = google_compute_network.vm_network.id
    subnetwork = google_compute_subnetwork.vm_sub_network.id
  }
  boot_disk {
    initialize_params {
      image = var.image_type
      size = 30
      type = "pd-standard"
    }
  }
  metadata = {
    "ssh-keys" = var.ssh_keys
  }
}
```
| Disk Type   | Free Tier | Speed  |
| ----------- | --------- | ------ |
| pd-standard |  free     | slow   |
| pd-balanced |  paid     | medium |
| pd-ssd      |  paid     | fast   |

List disk.
```bash
mcbtaguiad@miles:~$ sudo fdisk -l
Disk /dev/sda: 30 GiB, 32212254720 bytes, 62914560 sectors
Disk model: PersistentDisk  
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
Disklabel type: gpt
Disk identifier: A2056751-613C-B043-B7CA-DDB01D9057BD

Device      Start      End  Sectors  Size Type
/dev/sda1  262144 62912512 62650369 29.9G Linux root (x86-64)
/dev/sda14   2048     8191     6144    3M BIOS boot
/dev/sda15   8192   262143   253952  124M EFI System

Partition table entries are not in disk order.
```

To add extra persistent disk. 
```
resource "google_project_service" "compute_api" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_disk" "extra_disk" {
  name = "extra-disk"
  type = "pd-standard"
  zone = var.zone
  size = "15"
}
resource "google_compute_instance" "vm_instance" {
  name         = var.compute_instance_name
  tags         = ["vm-test"]
  zone         = var.zone
  machine_type = var.machine_type
  network_interface {
    network    = google_compute_network.vm_network.id
    subnetwork = google_compute_subnetwork.vm_sub_network.id

    # acquire public/external ip
    access_config {
      nat_ip = google_compute_address.vm_address.address
    }
  }
  boot_disk {
    initialize_params {
      image = var.image_type
      size = var.disk_size
      type = var.disk_type
    }
  }
  attached_disk {
    source      = google_compute_disk.extra_disk.id
    device_name = google_compute_disk.extra_disk.name
  }
  metadata = {
    "ssh-keys" = var.ssh_keys
  }
  hostname = var.hostname # if not set, default to vm google_compute_instance.name
}
```

List disk.
```bash
mcbtaguiad@miles:~$ sudo fdisk -l
Disk /dev/sda: 15 GiB, 16106127360 bytes, 31457280 sectors
Disk model: PersistentDisk  
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
Disklabel type: gpt
Disk identifier: A2056751-613C-B043-B7CA-DDB01D9057BD

Device      Start      End  Sectors  Size Type
/dev/sda1  262144 31455232 31193089 14.9G Linux root (x86-64)
/dev/sda14   2048     8191     6144    3M BIOS boot
/dev/sda15   8192   262143   253952  124M EFI System

Partition table entries are not in disk order.


Disk /dev/sdb: 15 GiB, 16106127360 bytes, 31457280 sectors
Disk model: PersistentDisk  
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
```
#### Ephemeral Storage
Use for cache or temp data, this uses `NVME` or `SCSI` (and money hahaha). 
```
resource "google_compute_instance" "default" {
  name         = "my-vm-instance-with-scratch"
  machine_type = "n2-standard-8"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-13"
    }
  }

  # Local SSD interface type; NVME for image with optimized NVMe drivers or SCSI
  # Local SSD are 375 GiB in size
  scratch_disk {
    interface = "SCSI"
  }

  network_interface {
    network = "default"
    access_config {}
  }
}

### Snapshots
#### Manual
List the disk created.
```bash
gcloud compute disks list
NAME        LOCATION    LOCATION_SCOPE  SIZE_GB  TYPE         STATUS
extra-disk  us-west1-c  zone            15       pd-standard  READY
miles-vm    us-west1-c  zone            10       pd-standard  READY
```
Manual run snapshot.
```bash
gcloud compute disks snapshot miles-vm \
  --snapshot-names=snapshot-$(date +%Y%m%d-%H%M%S) \
  --zone=us-west1-c

Creating snapshot(s) snapshot-20260408-140531...done.     
```
List snapshots.
```bash
gcloud compute snapshots list             
NAME                      DISK_SIZE_GB  SRC_DISK                     STATUS
snapshot-20260408-140531  15            us-west1-c/disks/miles-vm    READY
```
To delete.
```
gcloud compute snapshots delete SNAPSHOT_NAME
```
#### Automatic/Scheduled
Create `google_compute_disk` for boot.
```
resource "google_compute_disk" "boot_disk" {
  name = "boot-disk"
  type = "pd-standard"
  zone = var.zone
  size = var.disk_size
  image = var.image_type
}
```
Create `google_compute_snapshot`. Note that you would also need to create for other disk present.
```
resource "google_compute_snapshot" "boot_disk_snapshot" {
  name        = "vm-snapshot-extra-disk"
  source_disk = google_compute_disk.boot_disk.name
  zone        = var.zone

  depends_on = [google_compute_disk.boot_disk]
}
```

Create `snapshot_policy`.
```
resource "google_compute_resource_policy" "snapshot_policy" {
  name   = "daily-snapshot-policy"
  region = var.region

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "04:00"
      }
    }

    retention_policy {
      max_retention_days    = 3
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }
  }
}
```
If you are not broke, also add `regional clone`.
```
resource "google_compute_region_disk" "regiondisk" {
  name                      = "region-disk-name"
  snapshot                  = google_compute_snapshot.boot_disk_snapshot.id
  type                      = "pd-ssd"
  region                    = "us-central1"
  physical_block_size_bytes = 4096
  size                      = 11

  replica_zones = ["us-central1-a", "us-central1-f"]
}
```
### Asynchronous Disk Replication
This replicate `boot_disk` to a regional/secondary disk `replication_disk`.

Create `google_compute_disk`.
```
resource "google_compute_disk" "boot_disk" {
  name = "boot-disk"
  type = "pd-standard"
  zone = var.zone
  size = var.disk_size
  image = var.image_type
}

resource "google_compute_disk" "replication_disk" {
  name = "replication-disk"
  type = "pd-ssd"
  zone = "europe-west3-a"

  async_primary_disk {
    disk = google_compute_disk.boot_disk.id
  }

  physical_block_size_bytes = 4096
}
```
Create `google_compute_disk_async_replication`.
```
resource "google_compute_disk_async_replication" "repli_disk" {
  primary_disk = google_compute_disk.boot_disk.id
  secondary_disk {
    disk = google_compute_disk.replication_disk.id
  }
}
```
### Autoscaler
This defines the blueprint for the instances that will be part of the managed instance group.
```
resource "google_compute_instance_template" "default" {
  name           = "my-instance-template"
  machine_type   = "e2-medium"
  can_ip_forward = false

  tags = ["vm-test"]

  disk {
    source_image = data.google_compute_image.debian_13.id
  }

  network_interface {
    network = "default"
  }

  metadata = {
    name = "value"
  }

  service_account {
    scopes = ["userinfo-email", "compute-ro", "storage-ro"]
  }
}
```

Fetches the latest Debian 11 image from debian-cloud.
```
data "google_compute_image" "debian_11" {
  family  = "debian-11"
  project = "debian-cloud"
}
```
Creates a Managed Instance Group (MIG) in a specific zone.
- handle creating, deleting, and updating instances automatically based on the template.
```
resource "google_compute_instance_group_manager" "default" {
  name = "my-igm"
  zone = "us-central1-f"

  version {
    instance_template = google_compute_instance_template.default.id
    name              = "primary"
  }

  base_instance_name = "autoscaler-sample"
}
```
Automatically scales the MIG based on CPU usage, load, or schedule.
- minimum 1 vm
- maximum 5 vm
- automatically ensures 2 instances every weekday starting 7AM New York time for 12 hours (43,200 seconds).
- outside this period, it can scale down to the min (1 instance).

```
resource "google_compute_autoscaler" "default" {
  provider = google-beta
  name     = "my-autoscaler"
  zone     = "us-central1-f"
  target   = google_compute_instance_group_manager.default.id

  autoscaling_policy {
    max_replicas    = 5
    min_replicas    = 1
    cooldown_period = 60

    scaling_schedules {
      name                  = "every-weekday-morning"
      description           = "Increase to 2 every weekday at 7AM for 12 hours."
      min_required_replicas = 2
      schedule              = "0 7 * * MON-FRI"
      time_zone             = "America/New_York"
      duration_sec          = 43200
    }
  }
}
```
