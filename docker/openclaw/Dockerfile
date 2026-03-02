FROM ghcr.io/openclaw/openclaw:latest

# Install the Late API skill from ClawHub (retry on rate limit)
RUN for i in 1 2 3 4 5; do npx clawhub@latest install late-api --force && break || echo "Attempt $i failed, retrying in 60s..." && sleep 60; done && \
    test -d /app/skills/late-api && echo "late-api skill installed successfully" || (echo "FATAL: late-api skill not installed" && exit 1)

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
