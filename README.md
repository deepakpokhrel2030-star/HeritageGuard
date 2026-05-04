# HeritageGuard — Global Cultural Archive

> COM682 Cloud Native Development · Coursework 2  
> Student: Deepak Pokhrel · B00916368

A cloud-native web application for documenting and preserving endangered cultural heritage sites worldwide. Built on Microsoft Azure with a pure HTML/CSS/JS frontend.

---

## Live Demo

Deployed on **Azure Static Web Apps** — auto-deploys on every push to `main`.

---

## Overview

HeritageGuard enables researchers, conservators, and institutions to upload, browse, and preserve high-fidelity records of endangered cultural heritage sites — including 4K video, LiDAR point clouds, 3D photogrammetric scans, photography, and condition survey documents.

---

## Features

- **Archive** — Browse and search 25+ heritage assets across 7 global regions
- **Filtering & Pagination** — Filter by type, location, or tag; 8 assets per page
- **Asset Detail** — Full metadata, technical specs, AI-generated tags, related assets
- **Video Player** — Embedded video playback for 4K documentary assets
- **Upload** — Drag-and-drop file upload with technical specification fields
- **Authentication** — Register, sign in, persistent session via localStorage
- **Profile** — Account settings and My Uploads tab
- **Admin Panel** — Manage users and all assets in tabular view
- **Responsive** — Works on desktop, tablet, and mobile
- **Browser History** — Back/forward navigation works correctly in the SPA

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 · CSS3 · Vanilla JavaScript (SPA) |
| Hosting | Azure Static Web Apps |
| REST API | Azure Logic Apps (HTTP trigger workflows) |
| File Storage | Azure Blob Storage |
| Database | Azure Cosmos DB (metadata) |
| CI/CD | GitHub Actions (auto-deploy on push) |

---

## Project Structure

```
HeritageGuard/
├── index.html              # Single-page application entry point
├── assets.json             # Sample dataset (25 heritage assets)
├── staticwebapp.config.json # Azure Static Web Apps routing config
├── css/
│   └── style.css           # All styles (design tokens, components, layout)
├── js/
│   ├── app.js              # SPA logic, navigation, auth, CRUD
│   ├── api.js              # Azure Logic Apps API calls
│   └── config.js           # API endpoint configuration
└── assets/
    ├── images/             # Static images
    └── icons/              # Icons
```

---

## Getting Started (Local)

No build step required — it's a static site.

```bash
# Clone the repository
git clone https://github.com/deepakpokhrel2030-star/HeritageGuard.git
cd HeritageGuard

# Serve locally (required for assets.json fetch to work)
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

---

## Azure Deployment

The site is deployed via **Azure Static Web Apps** connected to this GitHub repository. Every push to `main` triggers an automatic deployment through GitHub Actions.

### Manual setup steps
1. Azure Portal → Create resource → **Static Web App**
2. Connect to GitHub repo `deepakpokhrel2030-star/HeritageGuard`
3. Branch: `main` · App location: `/` · Build preset: `HTML`
4. Azure creates the Actions workflow automatically

### Connecting the backend
Once Azure Logic Apps workflows are created, add the endpoint URLs to `js/config.js`:

```js
const CONFIG = {
  ENDPOINTS: {
    getAssets:   'YOUR_LOGIC_APP_GET_ALL_URL',
    getAsset:    'YOUR_LOGIC_APP_GET_ONE_URL',
    createAsset: 'YOUR_LOGIC_APP_CREATE_URL',
    updateAsset: 'YOUR_LOGIC_APP_UPDATE_URL',
    deleteAsset: 'YOUR_LOGIC_APP_DELETE_URL',
  }
}
```

Set `USE_LIVE = true` in `js/app.js` to switch from the local `assets.json` to the live Azure API.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@heritaguard.org | admin1234 |
| Contributor | contributor@heritaguard.org | demo1234 |

---

## Design

- **Theme:** Obsidian & Gold — deep navy backgrounds with antique gold accents
- **Fonts:** Cormorant Garamond (headings) · Inter (UI)
- **Palette:** `#06080e` background · `#e0a824` gold · warm cream / cool lavender gradient

---

## Assessment Criteria (COM682 CW2)

| Criterion | Weight |
|---|---|
| Implementation | 35% |
| Azure Resources | 35% |
| Advanced Features | 20% |
| Video Quality | 10% |
