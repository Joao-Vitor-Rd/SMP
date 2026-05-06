#!/bin/bash

# Script para configurar MinIO com bucket público

echo "Aguardando MinIO iniciar..."
sleep 15

echo "Configurando MinIO..."

# Configurar alias
/usr/bin/mc alias set minio_local http://localhost:9000 minioadmin minioadmin

# Remover bucket antigo se existir (opcional)
# /usr/bin/mc rb minio_local/smp-fotos --force

# Criar bucket se não existir
/usr/bin/mc mb minio_local/smp-fotos --ignore-existing

# Tornar bucket público (leitura e escrita anônima)
/usr/bin/mc anonymous set public minio_local/smp-fotos

# Verificar configuração
/usr/bin/mc anonymous list minio_local/smp-fotos

echo "✅ MinIO bucket 'smp-fotos' configurado como público!"
