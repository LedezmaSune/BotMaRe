output "instance_id" {
  description = "ID de la instancia EC2 creada"
  value       = aws_instance.botmare_server.id
}

output "public_ip" {
  description = "Dirección IP pública del servidor"
  value       = var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip
}

output "dashboard_url" {
  description = "URL para acceder al Panel de Control Web (accesible directamente si allowed_admin_ips incluye tu IP, o mediante túnel SSH si está restringido)"
  value       = "http://${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}:8000"
}

output "ssh_command" {
  description = "Comando para conectar por SSH de forma segura"
  value       = var.key_name != "" ? "ssh -i <tu_llave.pem> ubuntu@${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}" : "ssh ubuntu@${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}"
}

output "ssh_tunnel_command" {
  description = "Comando para túnel SSH seguro hacia el Panel Web (permite operar sin exponer el puerto 8000 a internet)"
  value       = "ssh -N -L 8000:localhost:8000 ubuntu@${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}"
}

output "first_boot_instructions" {
  description = "Procedimiento de primer arranque y verificación de seguridad"
  value       = <<-EOT
    ════════════════════════════════════════════════════════════════════════
    PROCEDIMIENTO DE PRIMER ARRANQUE SEGURO DE BOTMARE:
    1. Asegúrate de que las credenciales pasadas a Terraform provienen de
       secretos seguros (autogenerados con 'pnpm run setup:secrets' localmente).
    2. Conéctate vía túnel SSH seguro si el puerto 8000 no se expuso:
       ssh -N -L 8000:localhost:8000 ubuntu@<IP>
    3. Abre en tu navegador: http://localhost:8000
    4. Inicia sesión con DASHBOARD_USER y DASHBOARD_PASS definidos en variables.
    5. Escanea el código QR de WhatsApp para vincular el bot.
    ════════════════════════════════════════════════════════════════════════
  EOT
}
