# TODO: Later Setup (Codex + Gog)

This is for future sessions on your VPS (`~/openclaw`).

## Codex setup (one-time)

- [ ] Log into VPS:
  ```powershell
  ssh -i $env:USERPROFILE\.ssh\id_ed25519_oneplace root@YOUR_VPS_IP
  ```
- [ ] Ensure gateway is running:
  ```bash
  cd ~/openclaw
  docker compose ps
  ```
- [ ] Login to Codex inside container:
  ```bash
  docker compose exec -it openclaw-gateway codex login
  ```
- [ ] Verify Codex:
  ```bash
  docker compose exec -T openclaw-gateway codex --version
  docker compose exec -T openclaw-gateway sh -lc 'which codex'
  ```

## Gog (Gmail) setup (one-time)

- [ ] Prepare Google OAuth client credentials JSON on VPS (do not commit to git).
- [ ] Enter container shell:
  ```bash
  cd ~/openclaw
  docker compose exec -it openclaw-gateway sh
  ```
- [ ] Configure Gog credentials:
  ```bash
  gog auth credentials /path/to/client_secret.json
  ```
- [ ] Add Gmail account auth (inside container):
  ```bash
  gog auth add you@gmail.com --services gmail,calendar,drive,contacts,docs,sheets
  ```
- [ ] Verify auth:
  ```bash
  gog auth list
  ```
- [ ] Quick Gmail test:
  ```bash
  gog gmail search 'newer_than:7d' --max 5
  ```

## OpenClaw checks after setup

- [ ] Restart gateway:
  ```bash
  cd ~/openclaw
  docker compose restart openclaw-gateway
  ```
- [ ] Check model + channel health:
  ```bash
  docker compose exec -T openclaw-gateway node dist/index.js models status --probe --probe-provider anthropic
  docker compose exec -T openclaw-gateway node dist/index.js channels status --probe
  ```

## Notes

- Keep secrets in VPS files/env only. Never commit secrets to git.
- If you add new Linux binaries in Dockerfile later, rebuild image:
  ```bash
  cd ~/openclaw
  docker compose build openclaw-gateway
  docker compose up -d --force-recreate openclaw-gateway
  ```
