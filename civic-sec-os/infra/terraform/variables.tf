variable "kubeconfig" {
  type        = string
  description = "Path to kubeconfig file for the dev cluster"
  default     = "~/.kube/config"
}

variable "namespace" {
  type        = string
  description = "Target namespace"
  default     = "civic-sec-os"
}
