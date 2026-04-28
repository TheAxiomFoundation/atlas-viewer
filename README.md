# Axiom app

**Browse legal sources with statute text and RuleSpec encoding split view.**

The Axiom app provides a visual interface for exploring encoded law: statutes, regulations, guidance, and RuleSpec encodings.

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

- [axiom-corpus](https://github.com/TheAxiomFoundation/axiom-corpus) — Source corpus and data services
- [rulespec-compile](https://github.com/TheAxiomFoundation/rulespec-compile) — RuleSpec compiler and DSL tooling
- [axiom-encode](https://github.com/TheAxiomFoundation/axiom-encode) — AI-powered statute encoding

## License

MIT
