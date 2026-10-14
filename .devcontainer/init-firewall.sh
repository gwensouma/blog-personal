#!/bin/bash
# Default-deny egress firewall for the dev container, adapted from Anthropic's reference
# (https://github.com/anthropics/claude-code/blob/main/.devcontainer/init-firewall.sh).
# Runs as root at every container start (postStartCommand); re-running it with `sudo /usr/local/bin/init-firewall.sh`
# resets everything. CDN hosts (Google Fonts, Cloudflare) answer with a different IP on each query, so resolving them
# once is not enough: a local dnsmasq answers every DNS query in the container and adds each resolved address of an
# allowed domain (or its subdomains) to the allowlist as it goes.
# To allow a new host, add it to ALLOWED_DOMAINS below in its own PR, then rebuild or re-run the script.
set -euo pipefail
IFS=$'\n\t'

ALLOWED_DOMAINS=(
  # Anthropic: inference, sign-in, token refresh, claude.ai MCP connectors, updates, docs lookups.
  "api.anthropic.com"
  "claude.ai"
  "claude.com"
  "platform.claude.com"
  "mcp-proxy.anthropic.com"
  "downloads.claude.ai"
  "code.claude.com"
  # GitHub hosts outside the api.github.com/meta ranges below (release notes, raw files, release assets).
  "raw.githubusercontent.com"
  "objects.githubusercontent.com"
  "codeload.github.com"
  # npm registry: npm ci, npx (the Playwright MCP), Claude Code's own updates.
  "registry.npmjs.org"
  # Playwright browser downloads, for `npx playwright install` after a version bump.
  "cdn.playwright.dev"
  "playwright.download.prss.microsoft.com"
  # next/font/google in app/layout.tsx downloads the fonts at build time; `next build` fails without these.
  "fonts.googleapis.com"
  "fonts.gstatic.com"
  # VS Code server and extensions inside the container.
  "marketplace.visualstudio.com"
  "vscode.blob.core.windows.net"
  "update.code.visualstudio.com"
)

# A re-run starts from an open network: stop the old dnsmasq, point DNS back at the container's own resolver and
# reset the DROP policies (a flush alone keeps them).
pkill -x dnsmasq 2>/dev/null || true
[ -f /etc/resolv.conf.orig ] || cp /etc/resolv.conf /etc/resolv.conf.orig
cat /etc/resolv.conf.orig > /etc/resolv.conf
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT
if ip6tables -L >/dev/null 2>&1; then
  ip6tables -P INPUT ACCEPT
  ip6tables -P FORWARD ACCEPT
  ip6tables -P OUTPUT ACCEPT
fi

# Keep Docker's internal DNS rules (user-defined networks) before flushing.
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

if [ -n "$DOCKER_DNS_RULES" ]; then
  echo "Restoring Docker DNS rules..."
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
else
  echo "No Docker DNS rules to restore"
fi

# DNS, SSH (git over ssh) and loopback first.
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

ipset create allowed-domains hash:net

echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
  echo "ERROR: Failed to fetch GitHub IP ranges"
  exit 1
fi
if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
  echo "ERROR: GitHub API response missing required fields"
  exit 1
fi
while read -r cidr; do
  if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
    echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
    exit 1
  fi
  ipset add allowed-domains "$cidr" -exist
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[] | select(contains(":") | not)' | aggregate -q)

for domain in "${ALLOWED_DOMAINS[@]}"; do
  echo "Resolving $domain..."
  ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
  if [ -z "$ips" ]; then
    echo "ERROR: Failed to resolve $domain"
    exit 1
  fi
  while read -r ip; do
    if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
      echo "ERROR: Invalid IP from DNS for $domain: $ip"
      exit 1
    fi
    ipset add allowed-domains "$ip" -exist
  done < <(echo "$ips")
done

# Local DNS: dnsmasq forwards to Docker's resolver and adds every answer for an allowed domain to the ipset.
UPSTREAM_DNS=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf.orig)
IPSET_DOMAINS=$(IFS=/; echo "${ALLOWED_DOMAINS[*]}")
mkdir -p /etc/dnsmasq.d
cat > /etc/dnsmasq.d/allowlist.conf <<EOF
no-resolv
server=$UPSTREAM_DNS
listen-address=127.0.0.1
bind-interfaces
user=root
ipset=/$IPSET_DOMAINS/allowed-domains
EOF
dnsmasq --conf-file=/etc/dnsmasq.d/allowlist.conf
grep -v '^nameserver' /etc/resolv.conf.orig > /tmp/resolv.conf || true
echo "nameserver 127.0.0.1" >> /tmp/resolv.conf
cat /tmp/resolv.conf > /etc/resolv.conf

# The host network (VS Code port forwarding, Docker Desktop).
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
  echo "ERROR: Failed to detect host IP"
  exit 1
fi
HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

# IPv6 is not allowlisted, so drop it all except loopback (skipped where the kernel has no IPv6 tables).
if ip6tables -L >/dev/null 2>&1; then
  ip6tables -F
  ip6tables -A INPUT -i lo -j ACCEPT
  ip6tables -A OUTPUT -o lo -j ACCEPT
  ip6tables -P INPUT DROP
  ip6tables -P FORWARD DROP
  ip6tables -P OUTPUT DROP
fi

echo "Firewall configured. Verifying..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
  echo "ERROR: Firewall verification failed - was able to reach https://example.com"
  exit 1
fi
echo "OK: https://example.com is blocked"
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
  echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
  exit 1
fi
echo "OK: https://api.github.com is reachable"
