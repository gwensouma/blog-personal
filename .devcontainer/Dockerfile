# Dev container for this blog and its Claude Code agent team. Based on Anthropic's reference container
# (https://github.com/anthropics/claude-code/tree/main/.devcontainer), adapted to this project: Node 22, the GitHub CLI,
# Playwright's Chromium for e2e, Google Chrome for the Playwright MCP, and a default-deny egress firewall
# (init-firewall.sh). The image is built with full network access; the firewall applies only to the running container.
FROM node:22-bookworm

ARG TZ=Etc/UTC
ENV TZ="$TZ"

# Development tools, the firewall's tools (iptables, ipset, dig, aggregate, dnsmasq) and the GitHub CLI.
RUN apt-get update && apt-get install -y --no-install-recommends \
    less git procps sudo unzip gnupg2 jq nano \
    iptables ipset iproute2 dnsutils aggregate dnsmasq curl ca-certificates \
  && mkdir -p -m 755 /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Playwright browsers live outside the workspace, so `npm ci` finds them and they survive a fresh clone.
# PLAYWRIGHT_VERSION must match @playwright/test in package-lock.json; after a bump, rebuild the container (or run
# `npx playwright install chromium`, which the firewall allows). Chromium runs the e2e tests; Google Chrome is the
# Playwright MCP's default browser (the reviewer's checks) and exists only for amd64.
ARG PLAYWRIGHT_VERSION=1.64.0
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium \
  && if [ "$(dpkg --print-architecture)" = "amd64" ]; then npx -y "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chrome; fi \
  && chmod -R a+rX /ms-playwright \
  && rm -rf /var/lib/apt/lists/* /root/.npm

# Global npm installs go to a directory the non-root user owns, so Claude Code can update itself.
RUN mkdir -p /usr/local/share/npm-global /commandhistory /home/node/.claude \
  && touch /commandhistory/.bash_history \
  && chown -R node:node /usr/local/share/npm-global /commandhistory /home/node/.claude
ENV DEVCONTAINER=true
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
ENV EDITOR=nano VISUAL=nano

# The firewall script runs as root at container start; the node user may run exactly this script with sudo.
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod 755 /usr/local/bin/init-firewall.sh \
  && echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall \
  && chmod 0440 /etc/sudoers.d/node-firewall

USER node
RUN echo "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" >> /home/node/.bashrc

ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"
