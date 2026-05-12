# 🐳 dockerized-env

A cute, opinionated dev environment in a container. One `docker run` and you get a fully-loaded workspace with all your favorite CLI tools.

<p align="center">
  <img src="screenshot.jpg" alt="tmux with Crush and lazygit side by side" width="720" />
</p>

> tmux doing what tmux does best — Crush and lazygit running side by side like they were meant to be.

## What's inside

| Tool | Why you'll love it |
|------|--------------------|
| **[Crush](https://github.com/charmbracelet/crush)** | An adorable AI coding assistant that lives in your terminal. Ask it to build, refactor, debug, it just does it. |
| **Oh My Zsh** | Pretty prompts, sensible defaults, and a warm fuzzy feeling every time you open a shell. |
| **Tailscale SSH** | Connect from anywhere on your tailnet with `ssh root@my-dev-env`. No SSH keys to manage, no ports to expose, no networking headaches. |
| **Neovim** | The latest release. Auto-fetches a config from a Gist on every start, or mount your own. |
| **tmux** | Persistent sessions. Detach, reattach, split panes, and pretend you're a hacker in a movie. |
| **lazygit** | Git but make it fun. Staging, committing, rebasing, diffing, all from a gorgeous TUI. |
| **Node.js 24 + TypeScript** | `tsc`, `ts-node`, `tsx`, `eslint`, `http-server` and others |
| **Deno** | Because why not have a second runtime? |
| **[Glow](https://github.com/charmbracelet/glow)** | Read markdown files right in your terminal, beautifully rendered. `glow README.md` and swoon. |
| **ripgrep, fd, fzf, jq** | Commonly used linux utils. |
| **git** | Obviously. |

## Quick start

```sh
# Build
docker build -t dev-env .

# Run (persists your home directory across restarts)
docker run -it --rm -v dev-env-home:/root dev-env
```

That's it. You're in a zsh shell with everything ready to go.

## Git credentials (optional)

To `git push`/`pull` private repos, mount your SSH key and git config into the container:

```sh
docker run -it --rm \
  -v dev-env-home:/root \
  -v ~/.ssh:/root/.ssh:ro \
  -v ~/.gitconfig:/root/.gitconfig:ro \
  dev-env
```

- **`~/.ssh`** — your SSH key for authenticating with GitHub, GitLab, etc. Mounted read-only so the container can't modify it.
- **`~/.gitconfig`** — your name, email, and any git preferences. Without this, commits will use default/generic values.

Both are optional — the container works fine without them for local-only work.

## SSH from anywhere with Tailscale

No need to manage SSH keys, open ports, or worry about connectivity. Tailscale gives your container a stable identity on your private network and handles auth + encryption automatically.

```sh
docker run -it --rm \
  -v dev-env-home:/root \
  -v tailscale-state:/var/lib/tailscale \
  -e TS_AUTHKEY=tskey-auth-xxxxx \
  -e TS_HOSTNAME=my-dev-env \
  dev-env

volumes:
  ws_01_ts_state:
```

Then from any device on your tailnet:

```sh
ssh root@my-dev-env
```

State is persisted in the `tailscale-state` volume — omit `TS_AUTHKEY` on subsequent runs.

## Using Crush

Then just run `crush` and start chatting. Config lives in your /root path, so it will persist between reboots.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TS_AUTHKEY` | Tailscale auth key. Required on first run; optional after that if state is persisted. Generate one at [tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys). |
| `TS_HOSTNAME` | Hostname for the Tailscale node (e.g. `my-dev-env` → SSH via `ssh root@my-dev-env`) |

## Crush (AI Coding Assistant)

The image includes [Crush](https://github.com/charmbracelet/crush) — an cute looking AI coding assistant.

## Neovim Config

On startup, the container fetches a neovim config from a [GitHub Gist](https://gist.github.com/limxingzhi/fa3be5045caded9d4e09f2423dbfcec7). If the fetch fails, it falls back to a default config bundled in the image.

To use your own config, mount it:

```sh
docker run -it --rm -v ./my-init.lua:/root/.config/nvim/init.lua dev-env
```

## docker-compose

```yaml
services:
  workspace:
    image: ghcr.io/limxingzhi/dockerized-env:latest
    container_name: workspace
    volumes:
      - dev-home:/root
      - ~/.ssh:/root/.ssh:ro
      - ~/.gitconfig:/root/.gitconfig:ro
      - tailscale-state:/var/lib/tailscale
    environment:
      - TS_AUTHKEY=tskey-auth-keygoeshere
      - TS_HOSTNAME=my-dev-env
    network_mode: host

volumes:
  dev-home:
  tailscale-state:
```

## Handy aliases

Built into every shell:

| Alias | Command |
|-------|---------|
| `n` | `npm` |
| `nr` | `npm run` |
| `tat <name>` | Switch to or create a tmux session by name |

## Multi-architecture

Images are built for **linux/amd64** and **linux/arm64** and published to GHCR on every push to `main`.

## Notes

- Designed to be disposable — safe to rebuild anytime
- Two volumes: `/root` (workspace + configs), `/var/lib/tailscale` (Tailscale state)
- Tailscale uses **userspace networking** — no `--cap-add` or special permissions needed
- Tailscale SSH requires an [ACL policy](https://login.tailscale.com/admin/acls) allowing SSH access
- Image tags: `latest` + date-based (`YYYY.MM.DD`)
