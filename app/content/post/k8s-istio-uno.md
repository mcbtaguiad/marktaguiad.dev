---
title: "Istio: Routing"
date: 2026-03-23
author: "Mark Taguiad"
tags: ["k8s", "networking", "kubernetes", "istio", "routing"]
UseHugoToc: true
weight: 2
---
Modern applications are no longer built as single, monolithic systems—they’re composed of many small, interconnected services. Managing how these services communicate can quickly become complex, especially as systems scale. This is where Istio comes in.

Istio acts as a powerful service mesh that sits between your services and handles three critical concerns: traffic management, security, and observability.

With Istio, you gain fine-grained control over how traffic flows between services—enabling advanced deployment strategies like A/B testing and canary releases with ease. At the same time, it strengthens service-to-service security and provides deep visibility into your system through metrics, logs, and tracing.

For this post lets do a practical example in using istio.

Repo: [mcbtaguiad/istio-demo](https://github.com/mcbtaguiad/istio-demo.git)
# Table of Contents
{{< toc >}}
### Install
#### istioctl
Check this [link](https://istio.io/latest/docs/setup/install/) for different option to install istio. For this example we'll be using [istioctl](https://istio.io/latest/docs/setup/additional-setup/download-istio-release/).

Download the istio release. This will add istio binary to `$HOME/istio-<version>/bin`. 
```bash
curl -L https://istio.io/downloadIstio | sh -
export PATH="$PATH:$HOME/istio-<version>/bin"
```
#### Profile
An Istio profile is essentially a predefined configuration that determines which components are installed and how they’re set up. 

We need to set the profile when installing istio, the `default` profile is recommended for production deployment. Check this [link](https://istio.io/latest/docs/setup/additional-setup/config-profiles/) if you are interested in reading more about istio profile.

#### Platform
The platform setting tells Istio what kind of Kubernetes [environment](https://istio.io/latest/docs/setup/platform-setup/) it is running on.

#### Install
```bash
istioctl install --set profile=default --set values.global.platform=k3s
```
Notice if you visit the platform link `kubeadm` is missing. Since this is the standard for kubernetes you don't need to set platform.
```bash
istioctl install --set profile=default
```
Verify contents.
```bash
kubectl get all -n istio-system
NAME                                       READY   STATUS    RESTARTS   AGE
pod/istio-ingressgateway-b7dbbb799-j9rsg   1/1     Running   0          38s
pod/istiod-78bf998bbf-s4dnw                1/1     Running   0          50s

NAME                                  TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)                                      AGE
service/istio-ingressgateway          LoadBalancer   10.43.114.134   192.168.254.223   15021:30646/TCP,80:31914/TCP,443:30599/TCP   38s
service/istiod                        ClusterIP      10.43.82.154    <none>            15010/TCP,15012/TCP,443/TCP,15014/TCP        50s
service/istiod-revision-tag-default   ClusterIP      10.43.162.58    <none>            15010/TCP,15012/TCP,443/TCP,15014/TCP        26s

NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/istio-ingressgateway   1/1     1            1           38s
deployment.apps/istiod                 1/1     1            1           51s

NAME                                             DESIRED   CURRENT   READY   AGE
replicaset.apps/istio-ingressgateway-b7dbbb799   1         1         1       38s
replicaset.apps/istiod-78bf998bbf                1         1         1       51s

NAME                                                       REFERENCE                         TARGETS       MINPODS   MAXPODS   REPLICAS   AGE
horizontalpodautoscaler.autoscaling/istio-ingressgateway   Deployment/istio-ingressgateway   cpu: 3%/80%   1         5         1          38s
horizontalpodautoscaler.autoscaling/istiod                 Deployment/istiod                 cpu: 0%/80%   1         5         1          51s
```


### Istio Environment
#### Istio Sidecar
In order to take advantage of all of Istio’s features, pods in the mesh must be running an Istio sidecar proxy.

Before we deploy an application let's enable `istio-injection=enabled` to the namespace `demo`. 
```bash
kubectl label namespace demo istio-injection=enabled
```
Restart pod if pod is already present. 

#### Gateway
There is two approach to expose and route traffic using istio: the **traditional Istio API** and the newer **Kubernetes Gateway API**.

**Istio API (Traditional Approach)**

This relies on a shared ingress gateway deployed in the `istio-system` namespace. The `LoadBalancer` is reused  across applications in the cluster. 

Uses Istio-specific resources like:
- Gateway
- VirtualService

```bash
kubectl get pods -n istio-system
NAME                                   READY   STATUS    RESTARTS   AGE
istio-ingressgateway-b7dbbb799-j9rsg   1/1     Running   0          6h27m
istiod-78bf998bbf-s4dnw                1/1     Running   0          6h27m
```
**Gateway API (Kubernetes-Native Approach)**

In this approach a `LoadBalancer` is always deployed on all injected namespace. This is more declarative, Kubernetive-native  and future-proof, so this will be the approach used in this example/demo.

Uses Istio-specific resources like:
- Gateway
- HTTPRoute

Install Gateway-api.
```bash
kubectl get crd gateways.gateway.networking.k8s.io &> /dev/null || \
{ kubectl kustomize "github.com/kubernetes-sigs/gateway-api/config/crd?ref=v1.4.0" | kubectl apply -f -; }

customresourcedefinition.apiextensions.k8s.io/backendtlspolicies.gateway.networking.k8s.io created
customresourcedefinition.apiextensions.k8s.io/gatewayclasses.gateway.networking.k8s.io created
customresourcedefinition.apiextensions.k8s.io/gateways.gateway.networking.k8s.io created
customresourcedefinition.apiextensions.k8s.io/grpcroutes.gateway.networking.k8s.io created
customresourcedefinition.apiextensions.k8s.io/httproutes.gateway.networking.k8s.io created
customresourcedefinition.apiextensions.k8s.io/referencegrants.gateway.networking.k8s.io created
```

**Deploy**

Create gateway in `demo` namespace. 

Clone this repo [mcbtaguiad/istio-demo](https://github.com/mcbtaguiad/istio-demo.git).

```bash
git clone https://github.com/mcbtaguiad/istio-demo.git
cd istio-demo
kubectl create -f routing/gateway-api/gateway.yaml -n demo
```

Verify.
```bash
kubectl get all -n demo 
NAME                                        READY   STATUS    RESTARTS   AGE
pod/demo-app-gateway-istio-dd965bf4-htppk   1/1     Running   0          45s

NAME                             TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)                        AGE
service/demo-app-gateway-istio   LoadBalancer   10.43.150.164   192.168.254.224   15021:32268/TCP,80:30324/TCP   45s

NAME                                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/demo-app-gateway-istio   1/1     1            1           45s

NAME                                              DESIRED   CURRENT   READY   AGE
replicaset.apps/demo-app-gateway-istio-dd965bf4   1         1         1       45s
```

### Application
#### Diagram
Honestly use the book [example](https://istio.io/latest/docs/examples/bookinfo/#define-the-service-versions) of istio. 

This is a slight derivation of the book example, just need an excuse to uplift my boredom so I created this app-also to fully understand istio (smirk). 
{{< theme-image
light="/images/devops/k8s-notes/istio/k8s-istio-001.png"
dark="/images/devops/k8s-notes/istio/k8s-istio-dark-001.png"
alt="Application"
>}}

The diagram will make sense as we progress. Visit this diagram as we explore istio application.

#### Deploy Application
```bash
kubectl create -k kube/demo/environments/demo
```

Verify and take notes of the content here specially the services.
```bash
kubectl get all -n demo
NAME                                         READY   STATUS    RESTARTS   AGE
pod/backend-v1-579f8fdc8b-mjm79              2/2     Running   0          4h12m
pod/backend-v2-7c6675d6b8-gbkkx              2/2     Running   0          4h12m
pod/demo-app-gateway-istio-6c4c964fb-svp6s   1/1     Running   0          9h
pod/frontend-6fc6b84f46-hc9g4                2/2     Running   0          3h54m
pod/monitor-v1-97778d5-ft2lq                 2/2     Running   0          4h12m
pod/monitor-v2-6f789fd44c-6hngx              2/2     Running   0          4h12m
pod/redis-79c7d6dd4-w8trn                    2/2     Running   0          4h12m

NAME                             TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)                        AGE
service/backend                  ClusterIP      10.43.90.82     <none>            3000/TCP                       4h12m
service/backend-v1               ClusterIP      10.43.240.7     <none>            3000/TCP                       4h12m
service/backend-v2               ClusterIP      10.43.146.111   <none>            3000/TCP                       4h12m
service/demo-app-gateway-istio   LoadBalancer   10.43.7.6       192.168.254.221   15021:30942/TCP,80:32687/TCP   9h
service/frontend                 ClusterIP      10.43.130.214   <none>            80/TCP                         4h12m
service/monitor                  ClusterIP      10.43.129.195   <none>            8000/TCP                       4h12m
service/monitor-v1               ClusterIP      10.43.108.137   <none>            8000/TCP                       4h12m
service/monitor-v2               ClusterIP      10.43.190.193   <none>            8000/TCP                       4h12m
service/redis                    ClusterIP      10.43.125.209   <none>            6379/TCP                       4h12m

NAME                                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/backend-v1               1/1     1            1           4h12m
deployment.apps/backend-v2               1/1     1            1           4h12m
deployment.apps/demo-app-gateway-istio   1/1     1            1           9h
deployment.apps/frontend                 1/1     1            1           4h12m
deployment.apps/monitor-v1               1/1     1            1           4h12m
deployment.apps/monitor-v2               1/1     1            1           4h12m
deployment.apps/redis                    1/1     1            1           4h12m

NAME                                               DESIRED   CURRENT   READY   AGE
replicaset.apps/backend-v1-579f8fdc8b              1         1         1       4h12m
replicaset.apps/backend-v2-7c6675d6b8              1         1         1       4h12m
replicaset.apps/demo-app-gateway-istio-6c4c964fb   1         1         1       9h
replicaset.apps/frontend-6fc6b84f46                1         1         1       3h54m
replicaset.apps/frontend-c7dbbbf6c                 0         0         0       4h12m
replicaset.apps/monitor-v1-97778d5                 1         1         1       4h12m
replicaset.apps/monitor-v2-6f789fd44c              1         1         1       4h12m
replicaset.apps/redis-79c7d6dd4                    1         1         1       4h12m
```

### Routing
#### Gateway

The key here is we want to control the traffic going to the application using istio, if you look at the diagram we have `version 1` and `version 2` on backend and monitor service. That's were istio routing comes along, let's demostrate that here. 

Througout the routing example, make sure to always reference the `gateway` we created ealier.
```yaml
spec:
  parentRefs:
    - name: demo-app-gateway
```
#### Default Routing / Round Robin
In here we want to balance the route to both `version 1` and `version 2` on frontend and backend. 

Create the `HTTPRoute`.

*route-round-robin.yaml*
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: demo-app-rr
spec:
  parentRefs:
    - name: demo-app-gateway
  rules:
    # Backend API 
    - matches:
        - path:
            type: RegularExpression
            value: /api/.*
      backendRefs:
        - name: backend
          port: 3000

    # Monitor /status
    - matches:
        - path:
            type: PathPrefix
            value: /status
      backendRefs:
        - name: monitor
          port: 8000

    # Frontend /app 
    - matches:
        - path:
            type: PathPrefix
            value: /app
      backendRefs:
        - name: frontend
          port: 80
```
```bash
kubectl create -f routing/gateway-api/route-round-robin.yaml -n demo
```
This will use as the services bellow as `backendRefs`.
```bash
backend                  ClusterIP      10.43.90.82     <none>            3000/TCP                       4h14m
frontend                 ClusterIP      10.43.130.214   <none>            80/TCP                         4h14m
monitor                  ClusterIP      10.43.129.195   <none>            8000/TCP                       4h14m
```
Analyze Istio configuration for issues. This will report any configuration problems.
```bash
istioctl analyze -n demo
```
Verify using the gateway endpoint - check the IP on your gateway-api service.
```bash
# app landing page
http://192.168.254.221/app

# monitor
http://192.168.254.221/status
```
Cycle through /login, /register and /backend, you'll notice the version is changing randomly. 
{{< imageviewer folder="/images/devops/k8s-notes/istio/rr" >}}

If you are curious about `Path Matching`, look at the table below. 
| Match Type          | Description                            | Example                                         |
| ------------------- | -------------------------------------- | ----------------------------------------------- |
| `Exact`             | Matches the path **exactly**           | `/login` matches only `/login`                  |
| `Prefix`            | Matches the path **and any sub-paths** | `/app` matches `/app`, `/app/page1`, `/app/api` |
| `RegularExpression` | Matches paths using a **regex**        | `/app/.*` matches `/app/page1` and `/app/page2` |
#### Route to Specific Version
In here we route backend to `version 2` and monitor to `versin 1` exclusively.

*route-to-specific-version.yaml*
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: demo-app-spec-ver
spec:
  parentRefs:
    - name: demo-app-gateway
  rules:
    #  Backend API 
    - matches:
        - path:
            type: RegularExpression
            value: /api/.*
      backendRefs:
        - name: backend-v2
          port: 3000

    #  Monitor /status
    - matches:
        - path:
            type: PathPrefix
            value: /status
      backendRefs:
        - name: monitor-v1
          port: 8000

    # Frontend /app 
    - matches:
        - path:
            type: PathPrefix
            value: /app
      backendRefs:
        - name: frontend
          port: 80
```
```bash
kubectl create -f routing/gateway-api/route-to-specific-version.yaml -n demo
```
#### Route Specific User
In this setup, the Go application authenticates users using JWT **(JSON Web Tokens)**. After a successful login, user-specific information (e.g., username or role) is extracted from the JWT and injected into a custom HTTP header, such as:
```bash
x-user: jonathan
```
Of course this will depend on how you create your application. 

User `jonathan` will be routed to `version 1` and all other users to `version 2`.

To make it easier to debug or demonstrate lets add a `ResponseHeaderModifier`.
```yaml
      filters:
        - type: ResponseHeaderModifier
          responseHeaderModifier:
            add:
              - name: x-version
                value: "1.0.0"
```
*route-to-user.yaml*
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: demo-app-route-user-specific
spec:
  parentRefs:
    - name: demo-app-gateway
  rules:
    #  Backend API 
    - matches:
      - headers:
        - name: x-user
          type: Exact
          value: "jonathan"
        path:
          type: RegularExpression
          value: /api/.*
      filters:
        - type: ResponseHeaderModifier
          responseHeaderModifier:
            add:
              - name: x-version
                value: "1.0.0"
      backendRefs:
        - name: backend-v1
          port: 3000

    - matches:
        - path:
            type: RegularExpression
            value: /api/.*
      filters:
        - type: ResponseHeaderModifier
          responseHeaderModifier:
            add:
              - name: x-version
                value: "2.0.0"
      backendRefs:
        - name: backend-v2
          port: 3000


    #  Monitor /status
    - matches:
        - path:
            type: PathPrefix
            value: /status
      backendRefs:
        - name: monitor
          port: 8000

    #  SPA catch-all
    - matches:
      
        - path:
            type: PathPrefix
            value: /app
      backendRefs:
        - name: frontend
          port: 80
```
```bash
kubectl create -f routing/gateway-api/route-to-user.yaml -n demo
```
Get user token. You'll notice that request is always send through `istio-envoy`. User `jonathan` is routed to `version 1`.
```
curl -i -X POST http://192.168.254.221/api/login  -H "Content-Type: application/json"   -d '{"username":"jonathan","password":"123"}'
HTTP/1.1 200 OK
vary: Origin
date: Sat, 28 Mar 2026 10:20:22 GMT
content-length: 170
content-type: text/plain; charset=utf-8
x-envoy-upstream-service-time: 85
server: istio-envoy
x-version: 2.0.0

curl -i http://192.168.254.221/api/users \                                                                                          
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzQ3Nzk2MjIsImlzcyI6ImRlbW8tYXBwIiwidXNlcm5hbWUiOiJqb25hdGhhbiJ9.QRpu3WT3yHuMz5RwZmXsKNTfD2VtJf21XlZcD6Jg3ak" \
  -H "x-user: jonathan"
HTTP/1.1 200 OK
vary: Origin
date: Sat, 28 Mar 2026 10:20:57 GMT
content-length: 477
content-type: text/plain; charset=utf-8
x-envoy-upstream-service-time: 9
server: istio-envoy
x-version: 1.0.0

{"total":12,"users":[{"username":"3213","group":"alpha"},{"username":"user001","group":"alpha"},{"username":"user002","group":"beta"},{"username":"test","group":"alpha"},{"username":"admin","group":"alpha"},{"username":"user004","group":"beta"}
```
Inspect `x-version: 1.0.0`.

Test if other `users` are routed to `version 2`
```bash
curl -i -X POST http://192.168.254.221/api/login  -H "Content-Type: application/json"   -d '{"username":"user001","password":"123"}'
HTTP/1.1 200 OK
vary: Origin
date: Sat, 28 Mar 2026 10:29:55 GMT
content-length: 169
content-type: text/plain; charset=utf-8
x-envoy-upstream-service-time: 98
server: istio-envoy
x-version: 2.0.0

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzQ3ODAxOTUsImlzcyI6ImRlbW8tYXBwIiwidXNlcm5hbWUiOiJ1c2VyMDAxIn0.OhnP-b6wFqJI1eUf0dyMhISoby49iPgY_Rv0Sy-XWTY"}

curl -i http://192.168.254.221/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzQ3ODAxOTUsImlzcyI6ImRlbW8tYXBwIiwidXNlcm5hbWUiOiJ1c2VyMDAxIn0.OhnP-b6wFqJI1eUf0dyMhISoby49iPgY_Rv0Sy-XWTY" \  
  -H "x-user: user001"
HTTP/1.1 200 OK
vary: Origin
date: Sat, 28 Mar 2026 10:30:43 GMT
content-length: 477
content-type: text/plain; charset=utf-8
x-envoy-upstream-service-time: 11
server: istio-envoy
x-version: 2.0.0

{"total":12,"users":[{"username":"3213","group":"alpha"},{"username":"user001","group":"alpha"},{"username":"user002","group":"beta"},{"username":"test","group":"alpha"},{"username":"admin","group":"alpha"},{"username":"user004","group":"beta"},{"username":"jonathan","group":"alpha"},{"username":"user005","group":"beta"},{"username":"123123","group":"beta"},{"username":"test001","group":"alpha"},{"username":"user003","group":"beta"},{"username":"jonthan","group":"beta"}]}
```
This verifies that user `jonathan` is routed to `version 1` and other users are routed to `version 2`. 

#### Deployment/Testing Strategies
With this we can build testing/deployment strategies like A/B, Canary and Blue/Green. I will discuss this on a separate post. 
