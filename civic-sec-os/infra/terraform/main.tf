terraform {
  required_version = ">= 1.5.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.25.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.12.0"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig
  }
}

resource "kubernetes_namespace" "civic" {
  metadata {
    name = var.namespace
    labels = {
      "opa.enforced" = "true"
    }
  }
}

resource "helm_release" "opa" {
  name       = "opa"
  repository = "https://open-policy-agent.github.io/kube-mgmt"
  chart      = "opa-kube-mgmt"
  namespace  = kubernetes_namespace.civic.metadata[0].name

  set {
    name  = "opa.imageTag"
    value = "0.63.0"
  }

  set {
    name  = "service.type"
    value = "ClusterIP"
  }
}

resource "kubernetes_secret" "sealed" {
  metadata {
    name      = "civic-sealed-secret"
    namespace = kubernetes_namespace.civic.metadata[0].name
    annotations = {
      "sealedsecrets.bitnami.com/managed" = "true"
    }
  }

  data = {
    "placeholder" = base64encode("rotate-me")
  }

  type = "Opaque"
}
