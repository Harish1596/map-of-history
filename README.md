# Siege of Antioch interactive map

A static-first proof of concept for exploring the Siege of Antioch through a
synchronized map, timeline, event narrative, and source citations.

## Development

```bash
npm install
npm run dev
```

The application uses no database or runtime API. Historical records live in
`public/data/antioch`, while geographic layers live in its `geometry` folder.
All browser-loaded JSON passes through the Zod schemas in `src/data/schemas.ts`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` produces a static export in `out/`.

To preview that production export locally:

```bash
npm start
```

The preview server uses only Node.js built-ins. Set `STATIC_HOST` or
`STATIC_PORT` to override its default `127.0.0.1:3000` address.
