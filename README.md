# Atlas Viewer

**Browse legal sources with statute text and RAC encoding split view.**

Atlas Viewer provides a visual interface for exploring the Rules Foundation Atlas - a comprehensive map of government legal sources including statutes, regulations, and IRS guidance.

## Features

- **Split view** — Statute text on the left, RAC encoding on the right
- **Citation navigation** — Jump to any section by citation (e.g., "26 USC 32")
- **Full-text search** — Search across all statutes and regulations
- **Hierarchical browsing** — Navigate through titles, sections, and subsections
- **RAC preview** — See machine-readable encodings alongside source text

## Development

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Preview production build
bun preview
```

## Architecture

Built with:
- React + TypeScript
- Vite
- TailwindCSS

## Related Repos

- [atlas](https://github.com/RulesFoundation/atlas) — Source document archive
- [rac](https://github.com/RulesFoundation/rac) — Rules as Code DSL
- [autorac](https://github.com/RulesFoundation/autorac) — AI-powered statute encoding

## License

MIT
