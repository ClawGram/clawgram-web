# OpenClaw VPS Setup Guide (Non-Technical)

This is a practical guide for your current setup:
- Hetzner VPS
- Docker Compose
- OpenClaw Gateway
- WhatsApp channel

Use this as your day-to-day runbook.

## 1) Connect to VPS

From PowerShell on your computer:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_oneplace root@YOUR_VPS_IP
```

## 2) Go to project folder

```bash
cd ~/openclaw
```

## 3) Basic health checks

```bash
docker compose ps
docker compose exec -T openclaw-gateway node dist/index.js channels status --probe
docker compose exec -T openclaw-gateway node dist/index.js models status --probe --probe-provider anthropic
```

## 4) Start, stop, restart, logs

```bash
docker compose up -d openclaw-gateway
docker compose stop openclaw-gateway
docker compose restart openclaw-gateway
docker compose logs -f --tail=120 openclaw-gateway
```

## 5) Update OpenClaw to latest main

### Normal update flow

```bash
cd ~/openclaw
git pull --rebase origin main
docker compose build openclaw-gateway
docker compose up -d --force-recreate openclaw-gateway
```

### If pull fails: "unstaged changes"

Your VPS has local Docker edits. Keep them locally, then pull:

```bash
cd ~/openclaw
git add Dockerfile docker-compose.yml
git commit -m "chore: local VPS docker setup"
git pull --rebase origin main
docker compose build openclaw-gateway
docker compose up -d --force-recreate openclaw-gateway
```

Important:
- This local commit stays on the VPS only.
- It does not change GitHub unless you run `git push`.

## 6) Set default model (Anthropic)

```bash
cd ~/openclaw
docker compose exec -T openclaw-gateway node dist/index.js config set agents.defaults.model.primary anthropic/claude-opus-4-6
docker compose restart openclaw-gateway
docker compose exec -T openclaw-gateway node dist/index.js models status --probe --probe-provider anthropic --json
```

Success signal: probe result shows `"status": "ok"`.

## 7) Plugin/skill operations

OpenClaw has two common "skill" paths:

1. Plugin in OpenClaw (channel/tool/provider plugin)
2. External binary tool in container (`codex`, `gog`, `wacli`, `gh`, etc.)

### 7.1 List plugins

```bash
cd ~/openclaw
docker compose exec -T openclaw-gateway node dist/index.js plugins list
docker compose exec -T openclaw-gateway node dist/index.js plugins list --enabled
```

### 7.2 Enable bundled plugin (no rebuild needed)

```bash
cd ~/openclaw
docker compose exec -T openclaw-gateway node dist/index.js plugins enable whatsapp
docker compose restart openclaw-gateway
```

### 7.3 Install plugin package/path (usually no rebuild needed)

```bash
cd ~/openclaw
docker compose exec -T openclaw-gateway node dist/index.js plugins install @openclaw/voice-call
docker compose restart openclaw-gateway
```

### 7.4 Add external binaries (rebuild required)

If a new skill needs a Linux binary in the container, you must:
1. Edit `Dockerfile`
2. Rebuild image
3. Recreate container

```bash
cd ~/openclaw
docker compose build openclaw-gateway
docker compose up -d --force-recreate openclaw-gateway
```

Verify binary exists:

```bash
docker compose exec -T openclaw-gateway sh -lc 'which codex && which gog && which wacli && which gh'
```

## 8) WhatsApp: quick fix commands

If WhatsApp shows unauthorized/401 or stops receiving messages:

```bash
cd ~/openclaw
docker compose exec -T openclaw-gateway node dist/index.js channels logout
docker compose exec -it openclaw-gateway node dist/index.js channels login --channel whatsapp --verbose
docker compose exec -T openclaw-gateway node dist/index.js channels status --probe
```

Success signal:
- `linked`
- `running`
- `connected`

## 9) Open Control UI from your computer

On your computer (PowerShell), keep this running in one terminal:

```powershell
ssh -N -L 18789:127.0.0.1:18789 -i $env:USERPROFILE\.ssh\id_ed25519_oneplace root@YOUR_VPS_IP
```

Then open:

```text
http://127.0.0.1:18789/
```

## 10) Backup your OpenClaw state

This backs up config, auth, sessions, workspace references:

```bash
cd /root
tar czf openclaw-backup-$(date +%F).tgz .openclaw
```

Copy backup to your computer:

```powershell
scp -i $env:USERPROFILE\.ssh\id_ed25519_oneplace root@YOUR_VPS_IP:/root/openclaw-backup-YYYY-MM-DD.tgz .
```

## 11) Safe defaults after testing

If you temporarily opened WhatsApp access for testing, lock it back down:

```bash
cd ~/openclaw
docker compose exec -T openclaw-gateway node dist/index.js config set channels.whatsapp.dmPolicy pairing
docker compose exec -T openclaw-gateway node dist/index.js config set channels.whatsapp.allowFrom '[]'
docker compose restart openclaw-gateway
```

## 12) Quick "is everything okay?" command set

```bash
cd ~/openclaw
docker compose ps
docker compose exec -T openclaw-gateway node dist/index.js channels status --probe
docker compose exec -T openclaw-gateway node dist/index.js models status --probe --probe-provider anthropic
```

