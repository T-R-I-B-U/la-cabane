# --- Étape 1 : Installation des dépendances ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# On installe TOUT (y compris devDeps comme vite)
RUN npm ci

# --- Étape 2 : Build de l'application ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Génère le dossier /dist
RUN npm run build

# --- Étape 3 : Image de production finale ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# On ne garde que le strict nécessaire pour l'exécution
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

# Ré-installer uniquement les dépendances de production
RUN npm install --omit=dev

EXPOSE 3001

CMD ["node", "server/index.js"]
