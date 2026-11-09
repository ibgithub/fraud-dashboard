# AnvAIa on Amazon EKS (Fargate)

Deploy the 3 services — **frontend**, **auth-service**, **analytics-service** — to
Amazon EKS using Fargate (serverless pods). Routing is handled by an **ALB Ingress**;
the frontend is static-only (no `/api` proxy).

```
Internet → Route53 → ALB (ACM TLS) → Ingress
   /                       → frontend
   /api/v1/executive/*     → analytics-service
   /api/*                  → auth-service
                                   ↓
                          RDS PostgreSQL (existing)
```

Region used in examples: `ap-southeast-3` (Jakarta). Replace `<ACCOUNT_ID>`,
`<CERT_ID>`, and `anvaia.example.com` with your real values.

---

## 0. Prerequisites (install locally)

- `aws` CLI (configured: `aws configure`)
- `eksctl`
- `kubectl`
- `helm`
- Docker (to build & push images)

---

## 1. Create the EKS cluster (Fargate)

```bash
eksctl create cluster \
  --name anvaia \
  --region ap-southeast-3 \
  --fargate \
  --version 1.30
```

This creates a cluster with a Fargate profile for the `default` namespace. Add a
Fargate profile for our `anvaia` namespace:

```bash
eksctl create fargateprofile \
  --cluster anvaia \
  --region ap-southeast-3 \
  --name anvaia-fp \
  --namespace anvaia
```

Update kubeconfig:

```bash
aws eks update-kubeconfig --name anvaia --region ap-southeast-3
kubectl get nodes   # Fargate: nodes appear as pods are scheduled
```

---

## 2. Install the AWS Load Balancer Controller (needed for ALB Ingress)

```bash
# 2a. Associate an IAM OIDC provider
eksctl utils associate-iam-oidc-provider --cluster anvaia --region ap-southeast-3 --approve

# 2b. Create the IAM policy (download the official policy JSON first)
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam-policy.json

# 2c. Create a service account bound to that policy
eksctl create iamserviceaccount \
  --cluster anvaia --region ap-southeast-3 \
  --namespace kube-system --name aws-load-balancer-controller \
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# 2d. Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=anvaia \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

(Optional, for HPA) install the Metrics Server:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## 3. Build & push images to ECR

```bash
ACCOUNT_ID=<ACCOUNT_ID>
REGION=ap-southeast-3
ECR=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# 3a. Create repos (once)
aws ecr create-repository --repository-name anvaia/auth-service --region $REGION
aws ecr create-repository --repository-name anvaia/analytics-service --region $REGION
aws ecr create-repository --repository-name anvaia/frontend --region $REGION

# 3b. Login
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR

# 3c. Build & push (run from repo root)
docker build -t $ECR/anvaia/auth-service:latest ./backend/auth-service
docker push $ECR/anvaia/auth-service:latest

docker build -t $ECR/anvaia/analytics-service:latest ./backend/analytics-service
docker push $ECR/anvaia/analytics-service:latest

# Frontend uses the K8s-specific Dockerfile (static-only nginx, no /api proxy)
docker build -f ./frontend/Dockerfile.k8s -t $ECR/anvaia/frontend:latest ./frontend
docker push $ECR/anvaia/frontend:latest
```

Then edit the three Deployment manifests and replace the `image:` placeholder
`<ACCOUNT_ID>.dkr.ecr.ap-southeast-3.amazonaws.com/...` with `$ECR/...`.

---

## 4. Configure secrets & config

```bash
# Copy the template and fill in real values (keep secret.yaml OUT of git).
cp secret.example.yaml secret.yaml
# Generate a strong JWT secret:
openssl rand -base64 48
# Edit secret.yaml: JWT_SECRET, DB_PASSWORD, EXEC_DB_PASSWORD
```

Review `configmap.yaml` (DB hosts/names, CORS origin) and `ingress.yaml`
(host + ACM certificate ARN).

> Production note: prefer AWS Secrets Manager + External Secrets Operator (or the
> Secrets Store CSI Driver) over a plain Secret. The plain Secret is the simplest
> starting point.

---

## 5. Apply manifests (in order)

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml            # your filled copy (not secret.example.yaml)
kubectl apply -f auth-service.yaml
kubectl apply -f analytics-service.yaml
kubectl apply -f frontend.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml               # optional (needs Metrics Server)
```

---

## 6. Verify

```bash
kubectl -n anvaia get pods            # all Running & READY
kubectl -n anvaia get svc
kubectl -n anvaia get ingress         # ADDRESS = the ALB DNS name
kubectl -n anvaia describe ingress anvaia-ingress
```

Point your domain (Route53) to the ALB DNS name (CNAME/Alias). Then:

```bash
curl -sk https://anvaia.example.com/actuator/health   # not exposed via Ingress; internal only
curl -s  https://anvaia.example.com/                  # SPA loads
# Login:
curl -s -X POST https://anvaia.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 7. Networking notes (RDS access)

- The EKS pods must reach RDS. Ensure the **RDS security group** allows inbound
  5432 from the EKS cluster's VPC/security group (or the pods' security group).
- If EKS and RDS are in different VPCs, set up VPC peering or put them in the same VPC.

---

## 8. Rolling updates

```bash
# After pushing a new image tag:
kubectl -n anvaia set image deployment/analytics-service analytics-service=$ECR/anvaia/analytics-service:<newtag>
kubectl -n anvaia rollout status deployment/analytics-service
# Rollback if needed:
kubectl -n anvaia rollout undo deployment/analytics-service
```

---

## Files

| File | Purpose |
|------|---------|
| `namespace.yaml` | `anvaia` namespace |
| `configmap.yaml` | Non-sensitive config (DB hosts, CORS, flags) |
| `secret.example.yaml` | Template for JWT/DB secrets (copy to `secret.yaml`) |
| `auth-service.yaml` | auth-service Deployment + Service |
| `analytics-service.yaml` | analytics-service Deployment + Service |
| `frontend.yaml` | frontend Deployment + Service |
| `ingress.yaml` | ALB Ingress (path routing + TLS) |
| `hpa.yaml` | Autoscalers for the backend services |
