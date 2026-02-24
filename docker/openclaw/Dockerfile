FROM ghcr.io/openclaw/openclaw:latest

# Copy our custom entrypoint that generates openclaw.json from env vars
COPY entrypoint.sh /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
