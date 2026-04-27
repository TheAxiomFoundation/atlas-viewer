import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import * as styles from './DocumentViewer.css'

interface Subsection {
  id: string
  text: string
  codeLines: number[]
}

interface Document {
  citation: string
  title: string
  subsections: Subsection[]
  code: string
  hasRuleSpec: boolean
  format: string
  jurisdiction: string
  archPath: string | null
}

interface DocumentViewerProps {
  document: Document
  onBack?: () => void
  totalDocs?: number
  currentIndex?: number
  onNavigate?: (index: number) => void
  onNavigateToPath?: (path: string) => void
}

type ViewMode = 'split' | 'statute' | 'rulespec'

export function DocumentViewer({
  document,
  onBack,
  totalDocs,
  currentIndex,
  onNavigate,
  onNavigateToPath,
}: DocumentViewerProps) {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null)
  // Default to 'statute' view for non-RuleSpec documents
  const [viewMode, setViewMode] = useState<ViewMode>(document.hasRuleSpec ? 'split' : 'statute')

  const handleSectionHover = useCallback((sectionId: string | null) => {
    setHighlightedSection(sectionId)
  }, [])

  const codeLines = document.code ? document.code.split('\n') : []

  const highlightedLines = highlightedSection
    ? document.subsections.find((s) => s.id === highlightedSection)?.codeLines ?? []
    : []

  // Get jurisdiction badge info
  const getJurisdictionBadge = () => {
    switch (document.jurisdiction) {
      case 'canada':
        return { text: '🍁 Canada', color: '#ff4444' }
      case 'uk':
        return { text: '🇬🇧 UK', color: '#00aaff' }
      default:
        if (document.jurisdiction.startsWith('us-')) {
          return { text: `🇺🇸 ${document.jurisdiction.replace('us-', '').toUpperCase()}`, color: '#4488ff' }
        }
        return { text: '🇺🇸 US', color: '#4488ff' }
    }
  }

  const jurisdictionBadge = getJurisdictionBadge()

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {onBack && (
            <button className={styles.backButton} onClick={onBack} title="Back to browser">
              ←
            </button>
          )}
          <div className={styles.logo}>
            <span className={styles.logoAccent}>{'{'}</span>
            Arch
            <span className={styles.logoAccent}>{'}'}</span>
          </div>
        </div>

        <div className={styles.headerCenter}>
          {onNavigate && currentIndex !== undefined && totalDocs && (
            <button
              className={styles.navButton}
              onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              ‹
            </button>
          )}
          <div className={styles.citation}>{document.citation}</div>
          {onNavigate && currentIndex !== undefined && totalDocs && (
            <button
              className={styles.navButton}
              onClick={() => onNavigate(Math.min(totalDocs - 1, currentIndex + 1))}
              disabled={currentIndex === totalDocs - 1}
            >
              ›
            </button>
          )}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${viewMode === 'statute' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('statute')}
          >
            Statute
          </button>
          {document.hasRuleSpec && (
            <>
              <button
                className={`${styles.viewButton} ${viewMode === 'split' ? styles.viewButtonActive : ''}`}
                onClick={() => setViewMode('split')}
              >
                Split
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === 'rulespec' ? styles.viewButtonActive : ''}`}
                onClick={() => setViewMode('rulespec')}
              >
                RuleSpec
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <AnimatePresence mode="wait">
          {/* Statute Panel */}
          {(viewMode === 'split' || viewMode === 'statute') && (
            <motion.div
              key="statute-panel"
              className={`${styles.panel} ${viewMode === 'split' ? styles.panelLeft : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>
                  <span className={styles.panelTitleAccent}>//</span>{' '}
                  {document.format === 'xml' ? 'XML Statute' : document.format === 'pdf' ? 'PDF Document' : 'Statute Text'}
                </span>
                <span className={styles.jurisdictionBadge} style={{ color: jurisdictionBadge.color }}>
                  {jurisdictionBadge.text}
                </span>
              </div>

              <div className={styles.panelContent}>
                <h1 className={styles.statuteTitle}>{document.title}</h1>

                {document.subsections.map((subsection, index) => (
                  <motion.div
                    key={subsection.id}
                    className={`${styles.subsection} ${
                      highlightedSection === subsection.id ? styles.subsectionHighlighted : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onMouseEnter={() => handleSectionHover(subsection.id)}
                    onMouseLeave={() => handleSectionHover(null)}
                  >
                    <div className={styles.subsectionId}>({subsection.id})</div>
                    <div className={styles.subsectionText}>
                      <HighlightedText text={subsection.text} />
                    </div>
                  </motion.div>
                ))}

                {/* Show source file path for non-RuleSpec documents */}
                {!document.hasRuleSpec && document.archPath && (
                  <div className={styles.sourceInfo}>
                    <span className={styles.sourceLabel}>Source file:</span>
                    <code className={styles.sourcePath}>{document.archPath}</code>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Divider */}
          {viewMode === 'split' && document.hasRuleSpec && <div className={styles.divider} />}

          {/* Code Panel - Only show for RuleSpec documents */}
          {document.hasRuleSpec && (viewMode === 'split' || viewMode === 'rulespec') && (
            <motion.div
              key="rulespec-panel"
              className={styles.panel}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>
                  <span className={styles.panelTitleAccent}>//</span> RuleSpec Encoding
                </span>
              </div>

              <div className={styles.panelContent}>
                <pre className={styles.codeBlock}>
                  {codeLines.map((line, index) => (
                    <CodeLine
                      key={index}
                      line={line}
                      lineNumber={index + 1}
                      highlighted={highlightedLines.includes(index + 1)}
                      onNavigateToPath={onNavigateToPath}
                    />
                  ))}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusItem}>
          <span className={styles.statusDot} />
          <span>Connected to Arch</span>
        </div>
        <div className={styles.statusItem}>
          <span>{document.subsections.length} subsections</span>
          {document.hasRuleSpec && (
            <>
              <span>|</span>
              <span>{codeLines.length} lines of RuleSpec</span>
            </>
          )}
          {!document.hasRuleSpec && (
            <>
              <span>|</span>
              <span>{document.format.toUpperCase()} source</span>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}

// Subcomponents

function HighlightedText({ text }: { text: string }) {
  // Highlight defined terms in quotes
  const parts = text.split(/("(?:[^"\\]|\\.)*")/g)

  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('"') && part.endsWith('"') ? (
          <span key={i} className={styles.highlightedTerm}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

interface CodeLineProps {
  line: string
  lineNumber: number
  highlighted: boolean
  onNavigateToPath?: (path: string) => void
}

function CodeLine({ line, highlighted, onNavigateToPath }: CodeLineProps) {
  // Apply syntax highlighting with clickable imports
  const highlightedLine = highlightCode(line, onNavigateToPath)

  return (
    <span className={`${styles.codeLine} ${highlighted ? styles.codeLineHighlighted : ''}`}>
      {highlightedLine}
      {'\n'}
    </span>
  )
}

function highlightCode(line: string, onNavigateToPath?: (path: string) => void): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let remaining = line
  let key = 0

  // Import path pattern: matches things like "26/62/a#agi" or "7/2014/a"
  const importPathPattern = /^(\d+\/[\w\/#]+)/

  const patterns: [RegExp, string | null][] = [
    // Comments
    [/^(#.*)/, styles.codeComment],
    // Keywords
    [/^(variable|parameter|formula|if|else|where|for|in|and|or|not|return|imports)\b/, styles.codeKeyword],
    // Types
    [/^(Money|Rate|Boolean|Integer|Date|Person|TaxUnit|Household|Year|Month)\b/, styles.codeType],
    // Strings
    [/^("[^"]*"|'[^']*')/, styles.codeString],
    // Numbers
    [/^(\d+\.?\d*)/, styles.codeNumber],
    // Variables (words after variable keyword or assignments)
    [/^([a-z_][a-z0-9_]*)\s*(?==)/, styles.codeVariable],
  ]

  while (remaining.length > 0) {
    let matched = false

    // Check for import paths first (like 26/62/a#agi)
    const importMatch = remaining.match(importPathPattern)
    if (importMatch && onNavigateToPath) {
      const path = importMatch[1]
      tokens.push(
        <span
          key={key++}
          className={styles.codeImportLink}
          onClick={(e) => {
            e.preventDefault()
            onNavigateToPath(path)
          }}
          title={`Go to ${path}`}
        >
          {path}
        </span>
      )
      remaining = remaining.slice(path.length)
      matched = true
    }

    if (!matched) {
      for (const [pattern, className] of patterns) {
        const match = remaining.match(pattern)
        if (match) {
          tokens.push(
            <span key={key++} className={className || undefined}>
              {match[1]}
            </span>
          )
          remaining = remaining.slice(match[1].length)
          matched = true
          break
        }
      }
    }

    if (!matched) {
      // Take one character and continue
      tokens.push(<span key={key++}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
    }
  }

  return tokens
}
