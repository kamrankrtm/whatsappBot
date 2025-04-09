FROM registry2.iran.liara.ir/platforms/node-platform:release-2024-12-11T12-54-node14

# Force subsequent layers to rebuild (Keep this for now, might not be needed later)
RUN echo "Forcing layer rebuild $(date)"

# Install common system dependencies for Chrome/Puppeteer (Chromium will be downloaded by Puppeteer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    # Removed gnupg and google-chrome-stable installation steps
    && rm -rf /var/lib/apt/lists/*

# Removed PUPPETEER_SKIP_CHROMIUM_DOWNLOAD and PUPPETEER_EXECUTABLE_PATH ENV variables

# Create app directory
WORKDIR /app

# Create and set permissions for .wwebjs_auth directory
# Make sure the node user can access it
RUN mkdir -p /tmp/.wwebjs_auth/session && chown -R node:node /tmp/.wwebjs_auth && chmod -R 700 /tmp/.wwebjs_auth

# Copy package files
COPY --chown=node:node package*.json ./

# Switch to non-root user
USER node

# Install dependencies as non-root user (Puppeteer will download Chromium here)
RUN npm install --production

# Copy app source as non-root user
COPY --chown=node:node . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 