FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY scheduler/requirements.txt /scheduler/requirements.txt
RUN python3 -m venv /opt/scheduler && /opt/scheduler/bin/pip install --no-cache-dir -r /scheduler/requirements.txt
ENV SCHEDULER_PYTHON=/opt/scheduler/bin/python
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY scheduler /scheduler
EXPOSE 3000
CMD ["node","dist/index.js"]
