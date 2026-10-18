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
  description = "Lista de bloques CIDR autorizados para conectarse por SSH (Puerto 22). Variable OBLIGATORIA sin default 0.0.0.0/0 para prevenir exposición abierta."
  type        = list(string)
}

variable "allowed_admin_ips" {
  description = "Lista de bloques CIDR autorizados para acceder al puerto 8000 del panel. Si está vacía, el puerto no se expone y se accede por túnel SSH o Cloudflare."
  type        = list(string)
  default     = []
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

# ── SECRETOS DE PRODUCCIÓN (Obligatorios y Sensibles) ─────────────────────────

variable "dashboard_user" {
  description = "Nombre de usuario para Basic Auth del panel de control"
  type        = string
  default     = "admin"
}

variable "dashboard_pass" {
  description = "Contraseña segura del panel de control (mínimo 12 caracteres, alfanumérica)"
  type        = string
  sensitive   = true
}

variable "webhook_api_key" {
  description = "Clave de API para autenticar peticiones en endpoints de webhooks"
  type        = string
  sensitive   = true
}

variable "superadmin_key" {
  description = "Clave de superadministrador para operaciones críticas"
  type        = string
  sensitive   = true
}

variable "backup_encryption_key" {
  description = "Clave simétrica para cifrado de respaldos AES-256"
  type        = string
  sensitive   = true
}
