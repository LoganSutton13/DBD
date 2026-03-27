FROM node:20-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install from lockfile (deterministic)
RUN npm ci --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Make sure .dockerignore excludes node_modules
# Then install fresh in container
RUN npm ci --legacy-peer-deps

ENV PORT=8000
EXPOSE 8000

CMD ["npm", "start"]

