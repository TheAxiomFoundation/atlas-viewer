import { useState, useEffect, useMemo, useCallback } from 'react'
import { DocumentViewer } from './components/DocumentViewer'
import { RuleTree } from './components/RuleTree'
import { gridBg, appContainer } from './styles/global.css'
import { supabase } from './lib/supabase'
import type { Rule } from './lib/supabase'
import * as browserStyles from './components/DocumentBrowser.css'
import { motion } from 'motion/react'

const PAGE_SIZE = 50

interface ViewerDocument {
  citation: string
  title: string
  subsections: Array<{
    id: string
    text: string
    codeLines: number[]
  }>
  code: string
  hasRuleSpec: boolean
  format: string
  jurisdiction: string
  archPath: string | null
}

interface JurisdictionStats {
  us: number
  uk: number
  canada: number
  total: number
}

function transformRuleToViewerDoc(rule: Rule, children: Rule[]): ViewerDocument {
  const subsections = children.map((child, i) => ({
    id: String.fromCharCode(97 + i),
    text: child.body || child.heading || '',
    codeLines: [],
  }))

  // If no children, use the rule's body as a subsection
  if (subsections.length === 0 && rule.body) {
    const paragraphs = rule.body.split(/\n\n+/).filter(Boolean)
    paragraphs.forEach((para, i) => {
      subsections.push({
        id: String.fromCharCode(97 + i),
        text: para.trim(),
        codeLines: [],
      })
    })
  }

  if (subsections.length === 0) {
    subsections.push({
      id: 'a',
      text: rule.heading || 'No content available.',
      codeLines: [],
    })
  }

  return {
    citation: rule.source_path || rule.id,
    title: rule.heading || 'Untitled',
    subsections,
    code: '',
    hasRuleSpec: rule.has_rulespec,
    format: 'db',
    jurisdiction: rule.jurisdiction,
    archPath: rule.source_path,
  }
}

function App() {
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
  const [selectedChildren, setSelectedChildren] = useState<Rule[]>([])
  const [showBrowser, setShowBrowser] = useState(true)
  const [search, setSearch] = useState('')
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [stats, setStats] = useState<JurisdictionStats>({ us: 0, uk: 0, canada: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree')

  // Fetch jurisdiction stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usResp, ukResp, canadaResp] = await Promise.all([
          supabase.from('rules').select('*', { count: 'exact', head: true }).eq('jurisdiction', 'us'),
          supabase.from('rules').select('*', { count: 'exact', head: true }).eq('jurisdiction', 'uk'),
          supabase.from('rules').select('*', { count: 'exact', head: true }).eq('jurisdiction', 'canada'),
        ])
        const usCount = usResp.count || 0
        const ukCount = ukResp.count || 0
        const canadaCount = canadaResp.count || 0
        setStats({
          us: usCount,
          uk: ukCount,
          canada: canadaCount,
          total: usCount + ukCount + canadaCount,
        })
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
  }, [])

  // Fetch rules
  const fetchRules = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    setError(null)

    try {
      // Skip exact count to avoid timeout on large tables - use stats instead
      let query = supabase
        .from('rules')
        .select('*')
        .is('parent_id', null)
        .order('jurisdiction')
        .order('source_path')
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (jurisdictionFilter) {
        query = query.eq('jurisdiction', jurisdictionFilter)
      }

      if (search) {
        query = query.textSearch('fts', search, { type: 'websearch' })
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setRules(append ? [...rules, ...(data || [])] : (data || []))
      // Use stats for total count instead of exact count
      setPage(pageNum)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rules'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [jurisdictionFilter, search, rules])

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setRules([])
    setPage(0)
    fetchRules(0)
  }, [jurisdictionFilter, search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch children when a rule is selected
  const selectRule = useCallback(async (rule: Rule) => {
    setSelectedRule(rule)
    setShowBrowser(false)

    try {
      const { data: children } = await supabase
        .from('rules')
        .select('*')
        .eq('parent_id', rule.id)
        .order('ordinal')

      setSelectedChildren(children || [])
    } catch (err) {
      console.error('Failed to fetch children:', err)
      setSelectedChildren([])
    }
  }, [])

  // Derive totalCount from stats based on current filter
  const effectiveTotalCount = useMemo(() => {
    if (jurisdictionFilter === 'us') return stats.us
    if (jurisdictionFilter === 'uk') return stats.uk
    if (jurisdictionFilter === 'canada') return stats.canada
    return stats.total
  }, [jurisdictionFilter, stats])

  const loadMore = useCallback(() => {
    // Load more if we got a full page of results (there might be more)
    if (!loading && rules.length > 0 && rules.length % PAGE_SIZE === 0) {
      fetchRules(page + 1, true)
    }
  }, [loading, rules.length, page, fetchRules])

  const currentDoc = useMemo(
    () => selectedRule ? transformRuleToViewerDoc(selectedRule, selectedChildren) : null,
    [selectedRule, selectedChildren]
  )

  // Browser view
  if (showBrowser) {
    return (
      <>
        <div className={gridBg} />
        <div className={appContainer}>
          <div className={browserStyles.container}>
            <header className={browserStyles.header}>
              <div className={browserStyles.logo}>
                <span className={browserStyles.logoAccent}>{'{'}</span>
                Arch
                <span className={browserStyles.logoAccent}>{'}'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => setViewMode(viewMode === 'tree' ? 'flat' : 'tree')}
                  style={{
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {viewMode === 'tree' ? '🌲 Tree' : '📋 Flat'}
                </button>
                <div className={browserStyles.stats}>
                  {rules.length.toLocaleString()} of {effectiveTotalCount.toLocaleString()} rules
                </div>
              </div>
            </header>

            {/* Stats bar */}
            <div className={browserStyles.statsBar}>
              <button
                className={`${browserStyles.statButton} ${!jurisdictionFilter ? browserStyles.statButtonActive : ''}`}
                onClick={() => setJurisdictionFilter(null)}
              >
                All ({stats.total.toLocaleString()})
              </button>
              <button
                className={`${browserStyles.statButton} ${jurisdictionFilter === 'us' ? browserStyles.statButtonActive : ''}`}
                onClick={() => setJurisdictionFilter('us')}
              >
                US ({stats.us.toLocaleString()})
              </button>
              <button
                className={`${browserStyles.statButton} ${jurisdictionFilter === 'uk' ? browserStyles.statButtonActive : ''}`}
                onClick={() => setJurisdictionFilter('uk')}
              >
                UK ({stats.uk.toLocaleString()})
              </button>
              <button
                className={`${browserStyles.statButton} ${jurisdictionFilter === 'canada' ? browserStyles.statButtonActive : ''}`}
                onClick={() => setJurisdictionFilter('canada')}
              >
                Canada ({stats.canada.toLocaleString()})
              </button>
            </div>

            <div className={browserStyles.searchContainer}>
              <input
                type="text"
                className={browserStyles.searchInput}
                placeholder="Search statutes... (e.g., 'earned income' or 'criminal code')"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ color: '#ff4466', padding: '1rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div className={browserStyles.content}>
              {viewMode === 'tree' ? (
                <RuleTree rules={rules} onSelect={selectRule} />
              ) : (
                rules.map((rule) => (
                  <motion.button
                    key={rule.id}
                    className={browserStyles.docItem}
                    onClick={() => selectRule(rule)}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className={browserStyles.docBadge} style={{ color: getJurisdictionColor(rule.jurisdiction) }}>
                      {rule.jurisdiction.toUpperCase()}
                    </span>
                    <span className={browserStyles.docCitation}>{rule.source_path || rule.id}</span>
                    <span className={browserStyles.docTitle}>{rule.heading || 'Untitled'}</span>
                  </motion.button>
                ))
              )}

              {loading && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>
                  Loading...
                </div>
              )}

              {!loading && rules.length > 0 && rules.length % PAGE_SIZE === 0 && (
                <button
                  onClick={loadMore}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    marginTop: '0.5rem',
                  }}
                >
                  Load More ({rules.length.toLocaleString()} loaded)
                </button>
              )}

              {!loading && rules.length === 0 && !error && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No rules found. Try a different search term.
                </div>
              )}
            </div>

            <footer className={browserStyles.footer}>
              <span className={browserStyles.footerText}>
                Select a rule to view details
              </span>
            </footer>
          </div>
        </div>
      </>
    )
  }

  // Viewer view
  return (
    <>
      <div className={gridBg} />
      <div className={appContainer}>
        <DocumentViewer
          document={currentDoc!}
          onBack={() => setShowBrowser(true)}
          totalDocs={effectiveTotalCount}
          currentIndex={rules.findIndex(r => r.id === selectedRule?.id)}
          onNavigate={(index) => {
            if (rules[index]) selectRule(rules[index])
          }}
          onNavigateToPath={() => {}}
        />
      </div>
    </>
  )
}

function getJurisdictionColor(jurisdiction: string): string {
  switch (jurisdiction) {
    case 'us': return '#ff4466'
    case 'uk': return '#00d4ff'
    case 'canada': return '#ff8800'
    default: return '#888'
  }
}

export default App
