#!/bin/sh
set -e

echo "🌱 Initialisation / migration de la base de données SQLite..."
prisma db push --skip-generate

echo "🚀 Démarrage de What's Up Plant sur le port ${PORT:-3000}..."
exec node server.js

