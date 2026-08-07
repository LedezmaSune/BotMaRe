terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── 1. RED Y SEGURIDAD ────────────────────────────────────────────────────────
data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "botmare_sg" {
  name        = "${var.project_name}-sg-${var.environment}"
  description = "Reglas de seguridad para BotMaRe (WhatsApp, Panel Web y SSH)"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    description = "Acceso SSH para administracion remota"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_ips
  }

  # HTTP / HTTPS
  ingress {
    description = "HTTP Publico (Let's Encrypt / Certificados)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS Publico"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Panel Web BotMaRe (Puerto 8000)
  ingress {
    description = "Panel de Control Web BotMaRe"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Next.js Turbo Dev UI (Puerto 3000)
  ingress {
    description = "Next.js UI Dashboard"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Salida libre para Cloudflare Tunnel, Telegram API y Baileys WhatsApp
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name        = "${var.project_name}-security-group"
    Environment = var.environment
  }
}

# ── 2. AMI UBUNTU OFICIAL ────────────────────────────────────────────────────
data "aws_ami" "ubuntu_lts" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

# ── 3. SCRIPT DE INICIALIZACIÓN AUTOMÁTICA (CLOUD-INIT) ──────────────────────
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e

    echo "=========================================================="
    echo "  INICIANDO DESPLIEGUE AUTOMÁTICO DE BOTMARE EN VPS/AWS   "
    echo "=========================================================="

    # Actualización del sistema
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y ca-certificates curl gnupg lsb-release git ufw fail2ban

    # Instalación de Docker y Docker Compose
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

    # Configuración de usuario ubuntu para Docker
    usermod -aG docker ubuntu
    systemctl enable docker
    systemctl start docker

    # Instalación de Node.js 20 LTS y PNPM
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pnpm pm2 tsx

    # Preparar directorio de la aplicación
    mkdir -p /opt/botmare
    cd /opt/botmare

    # Clonar repositorio
    if [ ! -d "/opt/botmare/.git" ]; then
      git clone ${var.github_repo_url} /opt/botmare
    else
      git pull origin main
    fi

    # Configurar archivo de entorno si no existe
    if [ ! -f "/opt/botmare/.env" ]; then
      cp /opt/botmare/.env.example /opt/botmare/.env
    fi

    # Dar permisos al usuario ubuntu
    chown -R ubuntu:ubuntu /opt/botmare

    # Construir y levantar con Docker Compose
    docker compose up -d --build

    echo "=========================================================="
    echo "  BOTMARE HA SIDO INSTALADO Y LEVANTADO CON ÉXITO         "
    echo "=========================================================="
  EOF
}

# ── 4. INSTANCIA SERVIDOR VPS / EC2 ──────────────────────────────────────────
resource "aws_instance" "botmare_server" {
  ami                    = data.aws_ami.ubuntu_lts.id
  instance_type          = var.instance_type
  key_name               = var.key_name != "" ? var.key_name : null
  vpc_security_group_ids = [aws_security_group.botmare_sg.id]

  root_block_device {
    volume_size           = var.disk_size_gb
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.project_name}-root-volume"
    }
  }

  user_data                   = local.user_data
  user_data_replace_on_change = true

  tags = {
    Name        = "${var.project_name}-server"
    Environment = var.environment
  }
}

# ── 5. IP ELÁSTICA PÚBLICA (ESTÁTICA) ─────────────────────────────────────────
resource "aws_eip" "botmare_eip" {
  count    = var.allocate_elastic_ip ? 1 : 0
  instance = aws_instance.botmare_server.id
  domain   = "vpc"

  tags = {
    Name        = "${var.project_name}-eip"
    Environment = var.environment
  }
}
