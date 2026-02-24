FROM ghcr.io/openclaw/openclaw:latest

# Install the Late API skill from ClawHub
RUN npx clawhub@latest install late-api

# Copy our custom entrypoint that generates openclaw.json from env vars
COPY entrypoint.sh /app/entrypoint.sh

USER root
RUN chmod +x /app/entrypoint.sh
USER node

ENTRYPOINT ["/app/entrypoint.sh"]
