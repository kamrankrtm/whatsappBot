FROM registry2.iran.liara.ir/platforms/node-platform:release-2024-12-11T12-54-node14

# Removed the initial cache buster

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
    unzip \
    # Removed gnupg and google-chrome-stable installation steps
    && rm -rf /var/lib/apt/lists/*

# Removed PUPPETEER_SKIP_CHROMIUM_DOWNLOAD and PUPPETEER_EXECUTABLE_PATH ENV variables

# Create app directory
WORKDIR /app
# Ensure node user owns the workdir
RUN chown -R node:node /app

# Create target directory for Chromium
RUN mkdir -p /app/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux

# Manually download and extract specific Chromium revision
ENV CHROMIUM_REVISION=1045629
RUN wget --no-verbose https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/${CHROMIUM_REVISION}/chrome-linux.zip -O /tmp/chrome-linux.zip \
    && unzip /tmp/chrome-linux.zip -d /app/node_modules/puppeteer-core/.local-chromium/linux-${CHROMIUM_REVISION}/ \
    && chmod +x /app/node_modules/puppeteer-core/.local-chromium/linux-${CHROMIUM_REVISION}/chrome-linux/chrome \
    && rm /tmp/chrome-linux.zip \
    # Set ownership for downloaded files as well
    && chown -R node:node /app/node_modules

# Create and set permissions for .wwebjs_auth directory
# Make sure the node user can access it
RUN mkdir -p /tmp/.wwebjs_auth/session && chown -R node:node /tmp/.wwebjs_auth && chmod -R 700 /tmp/.wwebjs_auth

# Copy package files
COPY --chown=node:node package*.json ./

# Switch to non-root user
USER node

# Install dependencies (Chromium should already be there)
# No need for cache bust here as Chromium download is separate
RUN npm install --production

# Copy app source as non-root user
COPY --chown=node:node . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 