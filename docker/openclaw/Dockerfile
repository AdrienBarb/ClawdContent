FROM ghcr.io/openclaw/openclaw:latest

# Install the Late API skill from ClawHub (retry on rate limit)
RUN for i in 1 2 3; do npx clawhub@latest install late-api --force && break || sleep 15; done

# Copy our custom entrypoint that generates openclaw.json from env vars
COPY entrypoint.sh /app/entrypoint.sh

USER root
RUN chmod +x /app/entrypoint.sh
USER node

ENTRYPOINT ["/app/entrypoint.sh"]
