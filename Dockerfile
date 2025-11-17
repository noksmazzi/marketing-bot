# ---- Base image with Node + Playwright ----
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Install ffmpeg for video generation
USER root
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the bot files
COPY . .

# Environment
ENV NODE_ENV=production

# Run the bot
CMD ["node", "index.js"]
