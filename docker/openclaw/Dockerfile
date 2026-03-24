FROM ghcr.io/openclaw/openclaw:latest

# Install the Zernio CLI binary globally (the bot calls `zernio` commands directly)
RUN npm install -g @zernio/cli && zernio --version

# Install the Zernio CLI skill from ClawHub (reference docs for the bot)
RUN for i in 1 2 3 4 5; do npx clawhub@latest install zernio-cli --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done && \
    test -d /app/skills/zernio-cli && echo "zernio-cli skill installed successfully" || (echo "FATAL: zernio-cli skill not installed" && exit 1)

# Install content quality pipeline skills
RUN for i in 1 2 3 4 5; do npx clawhub@latest install humanizer --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done
RUN for i in 1 2 3 4 5; do npx clawhub@latest install de-ai-ify --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done
RUN for i in 1 2 3 4 5; do npx clawhub@latest install copywriting --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done
RUN for i in 1 2 3 4 5; do npx clawhub@latest install content-creator-skill --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done
RUN for i in 1 2 3 4 5; do npx clawhub@latest install social-content --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done

# Copy our custom entrypoint that generates openclaw.json from env vars
COPY entrypoint.sh /app/entrypoint.sh

USER root
RUN chmod +x /app/entrypoint.sh
USER node

ENTRYPOINT ["/app/entrypoint.sh"]
