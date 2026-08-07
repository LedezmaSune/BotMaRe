output "instance_id" {
  description = "ID de la instancia EC2 creada"
  value       = aws_instance.botmare_server.id
}

output "public_ip" {
  description = "Dirección IP pública para acceder a BotMaRe"
  value       = var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip
}

output "dashboard_url" {
  description = "Enlace directo al Panel de Control Web de BotMaRe"
  value       = "http://${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}:8000"
}

output "ssh_command" {
  description = "Comando para conectar a la terminal del servidor por SSH"
  value       = var.key_name != "" ? "ssh -i <tu_llave.pem> ubuntu@${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}" : "ssh ubuntu@${var.allocate_elastic_ip ? aws_eip.botmare_eip[0].public_ip : aws_instance.botmare_server.public_ip}"
}
