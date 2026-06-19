@echo off
title Instalador BotMaRe Windows
echo Iniciando el instalador seguro de BotMaRe...
echo Omite la necesidad de permisos de Administrador.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0install-windows.ps1"
