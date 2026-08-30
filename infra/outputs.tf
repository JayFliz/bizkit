output "public_ip" {
  description = "Public IP address of the bizkit server"
  value       = aws_eip.bizkit.public_ip
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_eip.bizkit.public_ip}"
}

output "app_url" {
  description = "Application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_eip.bizkit.public_ip}"
}
