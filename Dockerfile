FROM registry2.iran.liara.ir/platforms/node-platform:release-2024-12-11T12-54-node14

# Install Chrome dependencies and verify installation
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    # Verify installation
    && google-chrome-stable --version \
    && ls -l /usr/bin/google-chrome-stable

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Create app directory
WORKDIR /app

# Create and set permissions for .wwebjs_auth directory
# Make sure the node user can access it
RUN mkdir -p /tmp/.wwebjs_auth/session && chown -R node:node /tmp/.wwebjs_auth && chmod -R 700 /tmp/.wwebjs_auth

# Copy package files
COPY --chown=node:node package*.json ./

# Switch to non-root user
USER node

# Install dependencies as non-root user
RUN npm install --production

# Copy app source as non-root user
COPY --chown=node:node . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 