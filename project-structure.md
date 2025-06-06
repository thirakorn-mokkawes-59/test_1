# Project Structure – DEXPI-Enabled Web P&ID Application

```
pid-dexpi-web/
├── package.json               # Root NPM manifest – workspaces for client & server
├── pnpm-workspace.yaml        # (or yarn workspaces) – manages monorepo packages
├── turbo.json                 # Optional: Turborepo pipeline for builds/lint/tests
├── README.md                  # High-level project overview & setup instructions
├── .editorconfig              # Consistent editor settings
├── .eslintrc.cjs              # JS/TS lint rules (shared)
├── .prettierrc                # Code style config
├── .gitignore
│
├── client/                    # Front-end (React + TypeScript)
│   ├── public/                # Static assets served as-is
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── index.tsx          # React entry point
│   │   ├── App.tsx            # App shell & routing
│   │   ├── main.css           # Tailwind / global styles
│   │   │
│   │   ├── components/        # Re-usable, presentation-only UI atoms/molecules
│   │   │   ├── Toolbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Modal.tsx
│   │   │
│   │   ├── features/          # Domain-driven slices
│   │   │   ├── canvas/        # Drawing & editing P&ID diagrams
│   │   │   │   ├── Canvas.tsx # SVG.js wrapper & event handling
│   │   │   │   ├── hooks.ts   # React hooks for zoom/pan/selection
│   │   │   │   └── shapes/    # Symbol glyph definitions (SVG paths)
│   │   │   │       ├── Pump.tsx
│   │   │   │       ├── Valve.tsx
│   │   │   │       └── Instrument.tsx
│   │   │   │
│   │   │   ├── dexpi/         # DEXPI model, validation, import/export helpers
│   │   │   │   ├── DexpiContext.tsx   # React context providing model state
│   │   │   │   ├── model.ts           # TS interfaces mirroring DEXPI schema
│   │   │   │   ├── xmlSerializer.ts   # JSON⇄DEXPI-XML conversion
│   │   │   │   └── validators.ts      # Schema & business-rule checks
│   │   │   │
│   │   │   └── file-io/       # UX around opening / saving diagrams
│   │   │       ├── ExportMenu.tsx     # Export as SVG / DEXPI XML
│   │   │       └── importDexpi.ts     # Parse uploaded XML
│   │   │
│   │   ├── routes/            # React Router pages
│   │   │   ├── EditorPage.tsx
│   │   │   └── AboutPage.tsx
│   │   │
│   │   └── types/             # Shared TypeScript declarations
│   │
│   ├── vite.config.ts         # Fast dev server & bundler settings
│   └── tsconfig.json
│
├── server/                    # Back-end (Node.js + Express)
│   ├── src/
│   │   ├── index.ts           # HTTP server bootstrap
│   │   ├── routes/
│   │   │   ├── exportSvg.ts   # Optional server-side SVG clean-up
│   │   │   └── health.ts
│   │   └── dexpi/
│   │       ├── schema/        # Bundled XSD/OWL files for validation
│   │       └── validate.ts    # Fast XML validation service
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                      # Architecture & design docs
│   ├── dexpi-overview.md      # Short intro & links to official spec
│   └── decisions/             # ADRs for tech decisions
│
└── tests/
    ├── client/                # React component tests (Vitest / Jest)
    └── server/                # API tests (Supertest)
```

## Key Directory Purpose

| Path | Purpose |
|------|---------|
| `client/` | All front-end source. Uses SVG.js to render & edit diagrams; maintains app-state in React context and serializes to DEXPI. |
| `client/src/features/dexpi/` | Encapsulates DEXPI schema mapping, validation logic, and XML serialization—keeps domain model separate from UI. |
| `client/src/features/canvas/shapes/` | Individual P&ID symbol components built from SVG primitives. Easy to extend with new equipment. |
| `server/` | Optional back-end layer for heavy XML validation, future multi-user collaboration, and secure file storage. Project works in pure SPA mode if server is not deployed. |
| `docs/` | Living documentation for onboard developers; keeps architectural decisions discoverable. |

## Suggested Development Workflow

1. `pnpm install` – install root, client, and server dependencies.  
2. `pnpm dev` – concurrently start Vite dev server and optional Express server.  
3. Draw diagram ➜ “Export DEXPI” → generates `diagram.dexpi.xml`.  
4. “Export SVG” uses in-memory SVG canvas; backend route available for advanced optimization if needed.

## Next Steps

1. Populate **DEXPI model** (`client/src/features/dexpi/model.ts`) with full class hierarchy or generate types from official XSD with `xsd2ts`.  
2. Build out **symbol palette** and **connection rules** (e.g., no pipe-to-pump suction without matching port).  
3. Implement **schema validation** in both client (lightweight) and server (Xerces / libxml).  
4. Add **unit tests** for import/export round-trip integrity.

This structure balances rapid front-end iteration with a clean separation for standards compliance and future scalability.
