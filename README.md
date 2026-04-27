# Atlas Viewer

**Browse legal sources with statute text and RuleSpec encoding split view.**

Atlas Viewer provides a visual interface for exploring the Axiom Foundation Atlas - a comprehensive map of government legal sources including statutes, regulations, and IRS guidance.

## Features

- **Split view** — Statute text on the left, RuleSpec encoding on the right
- **Citation navigation** — Jump to any section by citation (e.g., "26 USC 32")
- **Full-text search** — Search across all statutes and regulations
- **Hierarchical browsing** — Navigate through titles, sections, and subsections
- **RuleSpec preview** — See machine-readable encodings alongside source text

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

- [atlas](https://github.com/TheAxiomFoundation/atlas) — Source document archive
- [rulespec](https://github.com/TheAxiomFoundation/rulespec) — Rules as Code DSL
- [autorulespec](https://github.com/TheAxiomFoundation/autorulespec) — AI-powered statute encoding

## License

MIT
