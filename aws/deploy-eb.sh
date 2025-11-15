#!/bin/bash

# Script simplificado para AWS Elastic Beanstalk
set -e

APP_NAME="mini-rpg-app"
ENV_NAME="mini-rpg-env"
VERSION_LABEL="v$(date +%Y%m%d%H%M%S)"
REGION="us-east-1"

echo "🚀 Desplegando Mini RPG en AWS Elastic Beanstalk..."
echo "📍 Aplicación: $APP_NAME"
echo "🌍 Entorno: $ENV_NAME"
echo "🏷️  Versión: $VERSION_LABEL"
echo ""

# Verificar que AWS CLI esté configurado
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ Error: AWS CLI no está configurado"
    echo "📋 Ejecuta: aws configure"
    echo "🔑 Necesitas: Access Key ID, Secret Access Key, y Region"
    exit 1
fi

echo "✅ Credenciales AWS verificadas"
echo ""

# 1. Preparar archivo de despliegue
echo "📦 Preparando aplicación..."
cp -r backend/* .
cp aws/.ebextensions . -r 2>/dev/null || true

# Crear package.json en la raíz si no existe
if [ ! -f package.json ]; then
    cp backend/package.json .
fi

# 2. Crear aplicación si no existe
echo "🏗️  Verificando aplicación Elastic Beanstalk..."
if ! aws elasticbeanstalk describe-applications --application-names $APP_NAME --region $REGION &>/dev/null; then
    echo "📱 Creando aplicación..."
    aws elasticbeanstalk create-application \
        --application-name $APP_NAME \
        --description "Mini RPG Game - Juego de Rol Web" \
        --region $REGION
else
    echo "✅ Aplicación ya existe"
fi

# 3. Crear entorno si no existe
echo "🔄 Configurando entorno..."
if ! aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION &>/dev/null; then
    echo "🌍 Creando entorno (esto puede tomar unos minutos)..."
    aws elasticbeanstalk create-environment \
        --application-name $APP_NAME \
        --environment-name $ENV_NAME \
        --solution-stack-name "64bit Amazon Linux 2 v5.8.4 running Node.js 18" \
        --region $REGION
    
    echo "⏳ Esperando que el entorno esté listo..."
    aws elasticbeanstalk wait environment-updated \
        --application-name $APP_NAME \
        --environment-names $ENV_NAME \
        --region $REGION
fi

# 4. Desplegar aplicación
echo "🚀 Desplegando aplicación..."
eb init $APP_NAME --region $REGION --platform "Node.js 18 running on 64bit Amazon Linux 2" || true
eb deploy $ENV_NAME || {
    echo "📤 Usando método alternativo de despliegue..."
    zip -r app.zip . -x "*.git*" "aws/*" "node_modules/*" "*.log"
    
    # Obtener URL del bucket S3 de Elastic Beanstalk
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    BUCKET_NAME="elasticbeanstalk-$REGION-$ACCOUNT_ID"
    
    # Crear bucket si no existe
    aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || true
    
    # Subir aplicación
    aws s3 cp app.zip s3://$BUCKET_NAME/$VERSION_LABEL.zip
    
    # Crear versión de aplicación
    aws elasticbeanstalk create-application-version \
        --application-name $APP_NAME \
        --version-label $VERSION_LABEL \
        --source-bundle S3Bucket=$BUCKET_NAME,S3Key=$VERSION_LABEL.zip \
        --region $REGION
    
    # Actualizar entorno
    aws elasticbeanstalk update-environment \
        --environment-name $ENV_NAME \
        --version-label $VERSION_LABEL \
        --region $REGION
    
    # Limpiar
    rm -f app.zip
}

# 5. Obtener URL de la aplicación
echo ""
echo "⏳ Obteniendo información del entorno..."
ENDPOINT_URL=$(aws elasticbeanstalk describe-environments \
    --application-name $APP_NAME \
    --environment-names $ENV_NAME \
    --region $REGION \
    --query 'Environments[0].EndpointURL' --output text)

echo ""
echo "🎉 ¡Despliegue completado!"
echo "🌐 Tu Mini RPG está disponible en: http://$ENDPOINT_URL"
echo "📊 Monitoreo: https://$REGION.console.aws.amazon.com/elasticbeanstalk/home?region=$REGION#/environment/dashboard?environmentId=$ENV_NAME"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: eb logs"
echo "   Estado: eb status"
echo "   Terminar: eb terminate"
echo ""