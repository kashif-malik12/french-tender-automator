# French Tender Automator (*Marchés Publics* & RFPs)

Plateforme autonome et conteneurisée d'aide à la réponse aux marchés publics français :
- **Module A — Veille BOAMP** : interroge l'API DILA BOAMP Open Data v2.1, filtre par départements / CPV / mots-clés et génère un score Go/No-Go (0–100) en 3 points (`source: DILA - BOAMP, Licence Ouverte 2.0`).
- **Module B — Base de Connaissances (`pgvector`)** : indexe vos anciens mémoires techniques, CV, certificats ISO/RGE/MASE et documents internes dans PostgreSQL + `pgvector` tout en conservant les binaires dans `/app/data/knowledge_base` (hors Git).
- **Module C — Ingestion DCE & Matrice de Conformité** : extrait et classe les pièces `.zip`, `.pdf`, `.docx`, `.xlsx` (RC, CCTP, CCAP, BPU, DPGF), détecte la date limite, les visites obligatoires, les lots, la pondération et signale les clauses financières/juridiques pour revue humaine.
- **Module D — Rédaction assistée & Export `.docx`** : éditeur côte à côte (Exigence CCTP + citations RAG vs Brouillon éditable) et export Word `.docx` avec marqueurs `[À COMPLÉTER PAR L'ÉQUIPE]`.

> **Frontière Human-in-the-Loop :** Aucun chiffrage BPU/DPGF engageant, aucune signature électronique (RGS/eIDAS) et aucun dépôt automatique sur les profils acheteurs (PLACE, Maximilien, AWS) ne sont exécutés par l'outil.

---

## Structure du dépôt

```text
french-tender-automator/
├── .env.example
├── .gitignore
├── Caddyfile
├── docker-compose.yml
├── README.md
├── .github/workflows/pages.yml  # Publication automatique du site vitrine sur GitHub Pages
├── docs/                        # Site statique GitHub Pages (index.html, styles.css)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── auth.py
│       ├── models/
│       ├── services/
│       ├── api/routes/
│       └── worker.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
```

---

## Démarrage local (Docker Compose)

1. Copier le modèle d'environnement et personnaliser les secrets :
   ```bash
   cp .env.example .env
   ```
   Renseignez impérativement :
   - `POSTGRES_PASSWORD`
   - `DATABASE_URL` (avec le même mot de passe)
   - `APP_BASIC_AUTH_USER` / `APP_BASIC_AUTH_PASS`
   - `JWT_SECRET_KEY`
   - Optionnel : `OPENAI_API_KEY` ou `GEMINI_API_KEY` (si vides, un mode heuristique/déterministe permet de tester tout le workflow hors ligne).

2. Lancer la stack complète :
   ```bash
   docker compose up --build -d
   ```

3. Vérifier l'état :
   ```bash
   docker compose ps
   curl http://127.0.0.1:8098/api/health
   ```
   Par défaut, Caddy écoute uniquement en local sur `127.0.0.1:8098` (configurable via `CADDY_BIND_IP` et `APP_HTTP_PORT`) afin de rester totalement isolé des autres services ou sous-domaines éventuels de la machine.

---

## Déploiement en Production (`tenders.tradister.com`)

L'application est déployée en production et accessible publiquement sur :
- **URL Publique :** `https://tenders.tradister.com`
- **Reverse Proxy & TLS :** Cloudflare Edge SSL (`tenders.tradister.com` CNAME `tradister.com`, Proxied) + Caddy hôte VPS (`127.0.0.1:8098`)
- **Port Interne :** `127.0.0.1:8098` (Caddy conteneurisé isolant les conteneurs `frontend:3000` et `backend:8000`)
- **Protection d'Accès :** Écran d'authentification protégé par mot de passe avec sessions chiffrées JWT (HS256). Identifiant : `admin`, mot de passe : mot de passe maître TRADISTER ou clé dédiée `.env`.
- **API Guard :** 100% des endpoints `/api/*` (sauf `/api/health` et `/api/auth/login`) exigent le token JWT Bearer ou Basic Auth.

---

## Déploiement sur un VPS Ubuntu dédié

1. Installer Docker Engine + Docker Compose plugin sur Ubuntu.
2. Cloner le dépôt et créer `.env` à partir de `.env.example`.
3. Pour exposer l'application en HTTPS automatique sur un VPS dédié :
   ```env
   SITE_ADDRESS=marches.votre-domaine.fr
   CADDY_BIND_IP=0.0.0.0
   APP_HTTP_PORT=80
   APP_HTTPS_PORT=443
   ```
4. Ouvrir les ports `80` et `443` dans `ufw` (`ufw allow 80,443/tcp`) et démarrer `docker compose up -d --build`.

---

## Site Web sur GitHub Pages (séparé, sans sous-domaine VPS)

Le dossier `docs/` contient le site web statique du projet ainsi que le workflow `.github/workflows/pages.yml`.
Après avoir poussé ce dépôt sur GitHub :
1. Ouvrez **Settings → Pages** sur votre dépôt GitHub.
2. Sélectionnez **Source: GitHub Actions**.
3. Le site sera publié directement sur `https://<votre-compte>.github.io/<nom-du-depot>/`.

---

## Sécurité

- `.gitignore` bloque `.env`, `/data/`, `uploads/`, `exports/`, `*.pdf`, `*.docx`, `*.xlsx`, `*.zip` et `*.sql`.
- Toutes les routes `/api/*` (hormis `/api/health` et `/api/auth/login`) exigent un jeton JWT ou un en-tête HTTP Basic Auth valide.
- Protection Zip Slip intégrée lors de la décompression des archives DCE `.zip`.
