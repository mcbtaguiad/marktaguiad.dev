---
title: "Kubernetes Notes - Architecture"
date:  2026-03-05T07:22:20+08:00
author: "Mark Taguiad"
tags: ["k8s", "kubernetes"]
UseHugoToc: true
weight: 2
---
Kubernetes (K8s) is an open-source platform used to automate the deployment, scaling, and management of containerized applications. It is designed to simplify running large numbers of containers in production environments.

# Table of Contents
{{< toc >}}
### Container Management Problem

Modern applications often consist of multiple services built with different technologies.

Example architecture:
- Frontend → Node.js
- Databases → MySQL
- Backend service - Java

All of these services may run as containers.

Key challenges:
- Ensuring high availability
- Maintaining scalability
- Restarting failed services automatically
- Managing dozens or hundreds of containers

Manual management becomes difficult at scale. Kubernetes solves this orchestration problem.
### Architecture
<!-- {{< imglink src="/images/devops/k8s-notes/k8s-notes-001.png" alt="imagen" >}} -->
{{< theme-image
light="/images/devops/k8s-notes/k8s-notes-001.png"
dark="/images/devops/k8s-notes/k8s-notes-dark-001.png"
alt="Architecture Diagram"
>}}

Kubernetes uses a cluster architecture composed of a Control Plane and Worker Nodes.
1. Control Plane (Master Components)
Manages the cluster and makes global decisions.
- API Server – Entry point for all Kubernetes commands (e.g., kubectl).
- Scheduler – Assigns Pods to appropriate worker nodes.
- Controller Manager – Maintains the desired state (e.g., ensures the correct number of pods).
- etcd – Distributed key-value store that holds all cluster data and configuration.
2. Worker Nodes
Machines where applications actually run.
- Kubelet – Agent that communicates with the control plane and manages pods on the node.
- Container Runtime – Runs containers (e.g., containerd).
- Kube-proxy – Handles networking and load balancing for services.
3. Pods
The smallest deployable unit in Kubernetes, containing one or more containers that share storage and networking.
### Kubernetes Workflow
#### Client
Assume we deploy a Pod and expose it externally using a `Service` of type` LoadBalancer`.
1. User Sends Request

A developer interacts with the cluster using `kubectl`, which communicates with the Kubernetes API Server.
```bash
kubectl apply -f pod.yaml
```
`kubectl` sends a REST API request to the API Server.
#### Pod Creation
2. API Server Validates Request

The API Server:
- Authenticates and authorizes the request
- Validates the object definition
- Stores the desired state in etcd

`etcd` acts as the source of truth for cluster state.

3. Scheduler Assigns a Node

It selects the best node based on:
- CPU / memory availability
- node selectors
- taints and tolerations
- affinity / anti-affinity rules

The scheduler binds the Pod to a Node.

4. Kubelet Creates the Pod

On the selected node, the Kubelet receives the Pod specification from the API Server.

Kubelet then:
- Pulls the container image
- Uses a container runtime such as containerd or Docker
- Creates and starts the container
- Reports Pod status back to the API Server

Now the Pod is running on the node.

#### Service Exposure Workflow
5. Service Object is Created

When a Service is created:
``` bash
kubectl apply -f service.yaml
```

The API Server stores the Service definition in etcd.

6. Controller Manager Detects the Service

The Kubernetes Controller Manager runs multiple controllers.

The Endpoints Controller:
- Watches for Services
- Uses the Service label selector
- Finds matching Pods
- Creates or updates Endpoints containing Pod IP addresses

This links the Service to the correct Pods.

7. Kube-Proxy Programs Network Rules

The Kube-Proxy runs on every node.

It watches the API Server for:
- Services
- Endpoints

Then it configures:
- iptables or IPVS rules

These rules ensure traffic sent to the Service is load balanced across the Pod IPs.

8. Cloud Controller Manager

Responsible for receiving requests to create objects and interacting with the underlying cloud provider e.g AWS/GCP
- Creates an external load balancer

For local server or metal cluster `MetalLB` is an alternative. 

*CCP*
```bash
Kubernetes → Cloud Controller Manager → AWS/GCP/Azure LB
```

*MetalLB*
```bash
Kubernetes → MetalLB → Local network (BGP / ARP)
```

#### Traffic Flow 
For a LoadBalancer Service:
- Cloud provider (Metallb) creates an external load balancer
- Traffic enters the cluster through the load balancer
- It forwards traffic to a NodePort
- kube-proxy routes the traffic to one of the Pods

```bash
User / Developer
      │
      ▼
kubectl
      │
      ▼
Kubernetes API Server
      │
      ├─ Authenticates & validates request
      ├─ Stores objects in etcd
      ▼
Scheduler
      │
      ├─ Selects a suitable Node
      ▼
Kubelet on Node
      │
      ├─ Pulls container image
      ├─ Starts container via container runtime
      └─ Reports status to API Server
      ▼
Pod Running
      │
      ▼
Service Created
      │
      ▼
Controller Manager
      │
      ├─ Endpoints controller finds Pods using label selectors
      └─ Creates Endpoints object
      ▼
Kube-Proxy (on each node)
      │
      ├─ Watches Services & Endpoints
      ├─ Programs iptables/IPVS rules
      └─ Load balances traffic to Pods
      ▼
External LoadBalancer
      │
      ▼
Client Traffic → Service → Pods
```
