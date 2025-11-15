# 🎮 Mini RPG - Juego de Rol Dockerizado

Un mini juego de rol (RPG) completo desarrollado con Node.js, containerizado con Docker y listo para desplegarse en AWS.

## 🌟 Características

- **⚔️ Sistema de Combate**: Enfréntate a diferentes tipos de enemigos
- **📈 Sistema de Niveles**: Gana experiencia y sube de nivel
- **💰 Sistema de Economía**: Gana oro y compra pociones
- **🎒 Inventario**: Gestiona tus pociones de vida
- **🏥 Sistema de Curación**: Regenera tu salud en la ciudad
- **🌍 Interfaz Web**: Juego completamente jugable desde el navegador

## 🏗️ Arquitectura

### Backend
- **Node.js + Express**: API REST para la lógica del juego
- **Base de datos en memoria**: Almacenamiento temporal de jugadores
- **Endpoints RESTful**: Manejo de personajes, combate y comercio

### Frontend
- **HTML5 + CSS3 + JavaScript**: Interfaz moderna y responsiva
- **CSS Grid & Flexbox**: Layout adaptable
- **Fetch API**: Comunicación asíncrona con el backend

### Containerización
- **Docker**: Containerización de la aplicación
- **Docker Compose**: Orquestación local
- **Multi-stage builds**: Optimización del tamaño de imagen

## 🚀 Instalación y Uso

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- AWS CLI (para despliegue)

### 🐳 Ejecución con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/Diego-Carrasquilla/Laboratorio_final.git
cd Laboratorio_final

# Construir y ejecutar con Docker Compose
docker-compose up --build

# La aplicación estará disponible en http://localhost:3000
```

### 💻 Ejecución Local (Desarrollo)

```bash
# Instalar dependencias
cd backend
npm install

# Ejecutar servidor de desarrollo
npm run dev

# La aplicación estará disponible en http://localhost:3000
```

## 🎮 Cómo Jugar

1. **Crear Personaje**: Ingresa tu nombre para crear un nuevo héroe
2. **Explorar**: Elige un enemigo para combatir en la zona de exploración
3. **Combatir**: Usa ataques o pociones durante el combate
4. **Progresar**: Gana experiencia, oro y sube de nivel
5. **Gestionar**: Compra pociones y cura a tu personaje en la ciudad

### Enemigos Disponibles
- 👺 **Goblin**: Enemigo básico (30 HP, 15 EXP)
- 👹 **Orc**: Enemigo intermedio (50 HP, 25 EXP)
- 🧌 **Troll**: Enemigo avanzado (80 HP, 40 EXP)
- 🐲 **Dragon**: Jefe final (150 HP, 100 EXP)

## 📡 API Endpoints

### Jugador
- `POST /api/player/create` - Crear nuevo jugador
- `GET /api/player/:id` - Obtener información del jugador
- `POST /api/player/:id/heal` - Curar jugador (costo: 20 oro)
- `POST /api/player/:id/buy-potion` - Comprar poción (costo: 30 oro)

### Combate
- `GET /api/monsters` - Obtener lista de monstruos
- `POST /api/battle/start` - Iniciar combate
- `POST /api/battle/turn` - Ejecutar turno de combate

### Utilidad
- `GET /health` - Health check para monitoreo

## 🌐 Despliegue en AWS

### Opción 1: AWS Elastic Beanstalk

```bash
# Configurar AWS CLI
aws configure

# Ejecutar script de despliegue
cd aws
./deploy-eb.sh
```

### Opción 2: AWS ECS (Fargate)

```bash
# Configurar AWS CLI
aws configure

# Ejecutar script de despliegue
cd aws
./deploy-ecs.sh
```

### Configuraciones Incluidas

- **Elastic Beanstalk**: Configuración automática con health checks
- **ECS**: Task definitions y service configuration
- **ECR**: Registry para imágenes Docker
- **Auto Scaling**: Escalabilidad automática
- **Load Balancer**: Distribución de carga
- **CloudWatch**: Monitoreo y logs

## 🔧 Variables de Entorno

```bash
NODE_ENV=production        # Entorno de ejecución
PORT=3000                 # Puerto del servidor
```

## 📁 Estructura del Proyecto

```
Laboratorio_final/
├── backend/              # Código del servidor
│   ├── server.js        # Servidor Express principal
│   ├── package.json     # Dependencias de Node.js
│   └── public/          # Archivos estáticos del frontend
│       ├── index.html   # Interfaz principal
│       ├── style.css    # Estilos del juego
│       └── game.js      # Lógica del cliente
├── aws/                 # Configuraciones de AWS
│   ├── deploy-eb.sh     # Script para Elastic Beanstalk
│   ├── deploy-ecs.sh    # Script para ECS
│   ├── Dockerrun.aws.json
│   └── .ebextensions/
├── docker-compose.yml   # Configuración de Docker Compose
├── Dockerfile          # Imagen de producción
└── README.md           # Esta documentación
```

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Containerización**: Docker, Docker Compose
- **Cloud**: AWS (ECS, Elastic Beanstalk, ECR, CloudWatch)
- **Monitoreo**: Health checks, CloudWatch logs

## 🔒 Seguridad

- **Usuario no-root**: Container ejecuta con usuario limitado
- **Health checks**: Monitoreo automático de salud
- **Validación de entrada**: Sanitización de datos del usuario
- **CORS habilitado**: Configuración de recursos cruzados

## 📊 Monitoreo

### Health Check Endpoint
```
GET /health
Response: { "status": "OK", "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ" }
```

### Métricas Incluidas
- Estado de la aplicación
- Tiempo de respuesta
- Uso de memoria
- Logs estructurados

## 🤝 Contribuciones

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👨‍💻 Autor

**Diego Carrasquilla**
- GitHub: [@Diego-Carrasquilla](https://github.com/Diego-Carrasquilla)

## 🎯 Próximas Características

- [ ] Sistema de guardar partidas persistente
- [ ] Más tipos de enemigos y objetos
- [ ] Sistema de habilidades especiales
- [ ] Multijugador básico
- [ ] Integración con base de datos
- [ ] Sistema de logros

---

**¡Disfruta tu aventura épica! ⚔️🐲**