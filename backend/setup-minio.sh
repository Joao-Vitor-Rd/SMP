#!/bin/sh
set -e

echo "Aguardando MinIO iniciar..."

until /usr/bin/mc alias set minio_local http://minio:9000 minioadmin minioadmin >/dev/null 2>&1; do
    sleep 2
done

echo "Configurando MinIO..."

/usr/bin/mc mb --ignore-existing minio_local/smp-fotos
/usr/bin/mc anonymous set public minio_local/smp-fotos

echo "MinIO bucket 'smp-fotos' configurado como público!"
