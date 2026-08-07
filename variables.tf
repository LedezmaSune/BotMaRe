variable "aws_region" {
  description = "Región de AWS donde se desplegará el servidor"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre identificador del proyecto"
  type        = string
  default     = "botmare"
}

variable "environment" {
  description = "Ambiente de ejecución (production, staging, dev)"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "Tipo de instancia en la nube (ej. t3.small, t3.medium)"
  type        = string
  default     = "t3.small"
}

variable "disk_size_gb" {
  description = "Tamaño del disco SSD en Gigabytes"
  type        = number
  default     = 30
}

variable "key_name" {
  description = "Nombre del par de llaves SSH (Key Pair) registrado en AWS para acceso a la terminal"
  type        = string
  default     = ""
}

variable "allowed_ssh_ips" {
  description = "Lista de bloques CIDR autorizados para conectarse por SSH (Puerto 22)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allocate_elastic_ip" {
  description = "Asignar una IP pública estática fija (Elastic IP)"
  type        = bool
  default     = true
}

variable "github_repo_url" {
  description = "URL del repositorio GitHub para clonar y ejecutar"
  type        = string
  default     = "https://github.com/LedezmaSune/BotMaRe.git"
}
