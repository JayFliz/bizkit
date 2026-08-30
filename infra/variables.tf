variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH (restrict to your IP)"
  type        = list(string)
  default     = []
}

variable "domain_name" {
  description = "Domain name for the app (optional, used in nginx config)"
  type        = string
  default     = ""
}

variable "resend_from" {
  description = "Resend sender address"
  type        = string
  default     = "Bizkit <bizkit@fliz.co.uk>"
}

variable "ssm_prefix" {
  description = "SSM Parameter Store prefix for secrets"
  type        = string
  default     = "/bizkit"
}

variable "app_repo" {
  description = "Git repository URL to clone"
  type        = string
  default     = ""
}
