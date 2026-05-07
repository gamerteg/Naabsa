'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PdfTemplate } from './PdfTemplate'
import { generatePdfFromElement } from './PdfGenerator'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport } from '@/lib/types'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit2,
  Image as ImageIcon,
  LayoutTemplate,
  Maximize,
  Palette,
  Ruler,
  Table2,
  Type,
  ZoomIn,
} from 'lucide-react'

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const PDF_QA_CHECKS = [
  'Capa e dados principais',
  'Tabelas de medicao',
  'Figuras finais e diferencas',
  'Fotos por categoria',
  'Anexos e protestos',
  'Numeracao, rodape e links',
]

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  decimals?: number
  onChange: (value: number) => void
}

interface PageMeta {
  index: number
  pageNumber: string
  label: string
  hasOverflow: boolean
  overflowPx: number
  changedBlocks: number
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      style={{
        border: '1px solid rgba(168,196,220,0.16)',
        borderRadius: 12,
        background: 'rgba(10,22,40,0.54)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--navy-100)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          {title}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </section>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  decimals = 0,
  onChange,
}: SliderProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.64)', fontSize: 'var(--text-xs)' }}>{label}</span>
        <span
          style={{
            color: '#fff',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 8px',
            borderRadius: 999,
            minWidth: 62,
            textAlign: 'center',
          }}
        >
          {decimals > 0 ? value.toFixed(decimals) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: 'var(--red-600)', cursor: 'pointer' }}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const toneStyles =
    tone === 'success'
      ? {
          color: '#d1fae5',
          border: '1px solid rgba(16,185,129,0.32)',
          background: 'rgba(16,185,129,0.12)',
        }
      : tone === 'warning'
        ? {
            color: '#fee2e2',
            border: '1px solid rgba(239,68,68,0.28)',
            background: 'rgba(239,68,68,0.12)',
          }
        : {
            color: 'var(--navy-100)',
            border: '1px solid rgba(168,196,220,0.16)',
            background: 'rgba(255,255,255,0.04)',
          }

  return (
    <div
      style={{
        ...toneStyles,
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', opacity: 0.78, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 'var(--text-lg)', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

export function PdfLayoutEditor({ report }: { report: BunkerReport }) {
  const router = useRouter()
  const toast = useToast()

  const [logoHeight, setLogoHeight] = useState(24)
  const [pageMargin, setPageMargin] = useState(64)
  const [fontSize, setFontSize] = useState(12)
  const [primaryColor, setPrimaryColor] = useState('#003366')
  const [editMode, setEditMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [lineHeight, setLineHeight] = useState(1.6)
  const [paraSpacing, setParaSpacing] = useState(16)
  const [titleSize, setTitleSize] = useState(15)
  const [titleMarginTop, setTitleMarginTop] = useState(24)
  const [titleMarginBottom, setTitleMarginBottom] = useState(8)

  const [coverPhotoWidth, setCoverPhotoWidth] = useState(100)
  const [coverPhotoHeight, setCoverPhotoHeight] = useState(350)
  const [coverPhotoMb, setCoverPhotoMb] = useState(28)
  const [coverTitleMt, setCoverTitleMt] = useState(16)
  const [coverTitleMb, setCoverTitleMb] = useState(24)
  const [coverContactsMt, setCoverContactsMt] = useState(40)

  const [tableFontSize, setTableFontSize] = useState(9)
  const [cellPadding, setCellPadding] = useState(2)

  const [pdfMarginTop, setPdfMarginTop] = useState(10)
  const [pdfMarginLeft, setPdfMarginLeft] = useState(10)
  const [pdfMarginBottom, setPdfMarginBottom] = useState(15)
  const [pdfMarginRight, setPdfMarginRight] = useState(10)

  const [previewZoom, setPreviewZoom] = useState(100)
  const [selectedPage, setSelectedPage] = useState(1)
  const [pages, setPages] = useState<PageMeta[]>([])
  const [contentHeight, setContentHeight] = useState(PAGE_HEIGHT)

  const previewViewportRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const originalHtmlRef = useRef(new WeakMap<HTMLElement, string>())

  const syncPageMeta = useCallback(() => {
    const root = contentRef.current
    if (!root) return

    const pageElements = Array.from(root.querySelectorAll<HTMLElement>('.pdf-page'))
    if (!pageElements.length) {
      setPages([])
      setContentHeight(PAGE_HEIGHT)
      return
    }

    const nextPages = pageElements.map((pageEl, index) => {
      const pageContent = pageEl.querySelector<HTMLElement>('.page-content')
      const editableBlocks = Array.from(pageEl.querySelectorAll<HTMLElement>('.editable-block'))

      editableBlocks.forEach((block) => {
        if (!originalHtmlRef.current.has(block)) {
          originalHtmlRef.current.set(block, block.innerHTML)
        }
      })

      const changedBlocks = editableBlocks.filter(
        (block) => originalHtmlRef.current.get(block) !== block.innerHTML
      ).length

      const overflowPx = pageContent
        ? Math.max(0, pageContent.scrollHeight - pageContent.clientHeight)
        : 0

      const pageNumber = pageEl.dataset.pageNumber || String(index + 1)
      const label = pageEl.dataset.pageLabel || `Page ${index + 1}`

      pageEl.dataset.pageIndex = String(index + 1)

      return {
        index: index + 1,
        pageNumber,
        label,
        hasOverflow: overflowPx > 0,
        overflowPx,
        changedBlocks,
      }
    })

    setPages(nextPages)
    setContentHeight(root.scrollHeight)
    setSelectedPage((current) => {
      if (!nextPages.length) return 1
      if (current > nextPages.length) return nextPages.length
      if (current < 1) return 1
      return current
    })
  }, [])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return

    syncPageMeta()

    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(syncPageMeta)
    })

    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    })

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(syncPageMeta)
    })

    resizeObserver.observe(root)
    Array.from(root.querySelectorAll<HTMLElement>('.page-content')).forEach((element) => {
      resizeObserver.observe(element)
    })

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [syncPageMeta])

  useEffect(() => {
    syncPageMeta()
  }, [
    syncPageMeta,
    logoHeight,
    pageMargin,
    fontSize,
    primaryColor,
    lineHeight,
    paraSpacing,
    titleSize,
    titleMarginTop,
    titleMarginBottom,
    coverPhotoWidth,
    coverPhotoHeight,
    coverPhotoMb,
    coverTitleMt,
    coverTitleMb,
    coverContactsMt,
    tableFontSize,
    cellPadding,
    pdfMarginTop,
    pdfMarginLeft,
    pdfMarginBottom,
    pdfMarginRight,
  ])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return

    const pageElements = Array.from(root.querySelectorAll<HTMLElement>('.pdf-page'))

    pageElements.forEach((pageEl, index) => {
      const pageIndex = index + 1
      const pageMeta = pages[index]
      const isActivePage = pageIndex === selectedPage

      pageEl.dataset.active = isActivePage ? 'true' : 'false'
      pageEl.dataset.overflow = pageMeta?.hasOverflow ? 'true' : 'false'
      pageEl.dataset.edited = pageMeta && pageMeta.changedBlocks > 0 ? 'true' : 'false'

      pageEl.querySelectorAll<HTMLElement>('.editable-block').forEach((block) => {
        const isEditable = editMode && isActivePage

        block.contentEditable = isEditable ? 'true' : 'false'
        block.style.outline = isEditable ? '1.5px dashed rgba(45,106,159,0.7)' : ''
        block.style.cursor = isEditable ? 'text' : ''
        block.style.minHeight = isEditable ? '1em' : ''
        block.style.backgroundColor = isEditable ? 'rgba(45,106,159,0.05)' : ''
      })
    })
  }, [editMode, pages, selectedPage])

  function focusPage(pageIndex: number) {
    setSelectedPage(pageIndex)

    const viewport = previewViewportRef.current
    const root = contentRef.current
    const pageEl = root?.querySelector<HTMLElement>(`.pdf-page[data-page-index="${pageIndex}"]`)

    if (!viewport || !pageEl) return

    const nextTop = Math.max(0, (pageEl.offsetTop * previewZoom) / 100 - 28)
    viewport.scrollTo({ top: nextTop, behavior: 'smooth' })
  }

  function handlePreviewClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const pageEl = target.closest<HTMLElement>('.pdf-page')
    const pageIndex = pageEl?.dataset.pageIndex

    if (!pageIndex) return
    setSelectedPage(Number(pageIndex))
  }

  async function handleExport() {
    setIsGenerating(true)
    setEditMode(false)

    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const filename = `NAABSA_BunkerSurvey_${report.vessel_name.replace(/\s+/g, '_')}_${report.ref_number}`

      await generatePdfFromElement('pdf-content', filename, [
        pdfMarginTop,
        pdfMarginLeft,
        pdfMarginBottom,
        pdfMarginRight,
      ])

      await fetch(`/api/reports/${report.id}/pdf-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          overflow_count: overflowCount,
          changed_blocks: changedCount,
        }),
      }).catch(() => undefined)

      toast('success', 'PDF gerado com paginas fixas e exportacao controlada.')
    } catch {
      toast('error', 'Falha ao gerar PDF. Revise o documento e tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const overflowCount = pages.filter((page) => page.hasOverflow).length
  const changedCount = pages.reduce((total, page) => total + page.changedBlocks, 0)
  const activePageMeta = pages.find((page) => page.index === selectedPage)

  const cssVars = {
    '--pdf-logo-h': `${logoHeight}px`,
    '--pdf-margin': `${pageMargin}px`,
    '--pdf-font-size': `${fontSize}px`,
    '--pdf-primary': primaryColor,
    '--pdf-line-h': String(lineHeight),
    '--pdf-para-sp': `${paraSpacing}px`,
    '--pdf-title-size': `${titleSize}px`,
    '--pdf-table-font': `${tableFontSize}px`,
    '--pdf-cell-pad': `${cellPadding}px`,
    '--pdf-title-mt': `${titleMarginTop}px`,
    '--pdf-title-mb': `${titleMarginBottom}px`,
    '--pdf-cover-photo-w': `${coverPhotoWidth}%`,
    '--pdf-cover-photo-h': `${coverPhotoHeight}px`,
    '--pdf-cover-photo-mb': `${coverPhotoMb}px`,
    '--pdf-cover-title-mt': `${coverTitleMt}px`,
    '--pdf-cover-title-mb': `${coverTitleMb}px`,
    '--pdf-cover-contacts-mt': `${coverContactsMt}px`,
  } as React.CSSProperties

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #07111f 0%, #0d1b2e 100%)',
      }}
    >
      <header
        className="no-print"
        style={{
          minHeight: 74,
          padding: '18px 24px',
          borderBottom: '1px solid rgba(168,196,220,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(7,17,31,0.88)',
          backdropFilter: 'blur(18px)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--navy-100)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(168,196,220,0.18)',
            borderRadius: 999,
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: 'rgba(168,196,220,0.76)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            PDF Layout Studio
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 700,
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {report.vessel_name} [{report.ref_number}]
          </div>
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              background:
                overflowCount > 0 ? 'rgba(239,68,68,0.14)' : 'rgba(16,185,129,0.14)',
              color: overflowCount > 0 ? '#fecaca' : '#d1fae5',
              border:
                overflowCount > 0
                  ? '1px solid rgba(239,68,68,0.28)'
                  : '1px solid rgba(16,185,129,0.24)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {overflowCount > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            {overflowCount > 0 ? `${overflowCount} pagina(s) com overflow` : 'Documento pronto para exportar'}
          </div>

          <button
            type="button"
            onClick={() => setEditMode((current) => !current)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 999,
              border: `1px solid ${editMode ? 'var(--red-600)' : 'rgba(168,196,220,0.18)'}`,
              background: editMode ? 'var(--red-600)' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
            }}
          >
            <Edit2 size={15} />
            {editMode ? 'Edicao da pagina ativa' : 'Ativar edicao controlada'}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #c8102e 0%, #e33a52 100%)',
              color: '#fff',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              opacity: isGenerating ? 0.7 : 1,
              boxShadow: '0 12px 30px rgba(200,16,46,0.28)',
            }}
          >
            <Download size={15} />
            {isGenerating ? 'Gerando PDF...' : 'Gerar PDF'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside
          className="no-print"
          style={{
            width: 360,
            flexShrink: 0,
            overflowY: 'auto',
            padding: 18,
            borderRight: '1px solid rgba(168,196,220,0.12)',
            background:
              'linear-gradient(180deg, rgba(10,22,40,0.96) 0%, rgba(10,22,40,0.88) 100%)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <MetricCard label="Paginas" value={String(pages.length || 0)} />
            <MetricCard
              label="Alertas"
              value={String(overflowCount)}
              tone={overflowCount > 0 ? 'warning' : 'success'}
            />
            <MetricCard label="Blocos editados" value={String(changedCount)} />
            <MetricCard label="Zoom" value={`${previewZoom}%`} />
          </div>

          <Section title="Checklist de emissao" icon={<CheckCircle2 size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PDF_QA_CHECKS.map((label) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.78)', fontSize: 'var(--text-sm)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--red-600)' }} />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Pagina ativa" icon={<LayoutTemplate size={14} />}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(168,196,220,0.16)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      color: 'rgba(168,196,220,0.76)',
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Pagina {selectedPage}
                  </div>
                  <div style={{ color: '#fff', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                    {activePageMeta?.label || 'Carregando...'}
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: activePageMeta?.hasOverflow ? '#fecaca' : '#d1fae5',
                    border: activePageMeta?.hasOverflow
                      ? '1px solid rgba(239,68,68,0.28)'
                      : '1px solid rgba(16,185,129,0.24)',
                    background: activePageMeta?.hasOverflow
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(16,185,129,0.12)',
                  }}
                >
                  {activePageMeta?.hasOverflow ? 'Ajuste necessario' : 'Dentro da area util'}
                </div>
              </div>

              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                {editMode
                  ? 'Somente a pagina selecionada fica editavel. As demais permanecem bloqueadas para evitar efeito cascata.'
                  : 'Clique em uma pagina na lista ou no preview para trabalhar naquela area.'}
              </div>

              {activePageMeta?.hasOverflow && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(127,29,29,0.28)',
                    color: '#fecaca',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.5,
                  }}
                >
                  Esta pagina excede a area util em aproximadamente {activePageMeta.overflowPx}px.
                  Reduza conteudo ou ajuste tipografia/margens antes de exportar.
                </div>
              )}
            </div>
          </Section>

          <div style={{ height: 14 }} />
          <Section title="Navegacao por pagina" icon={<Maximize size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pages.map((page) => (
                <button
                  key={page.index}
                  type="button"
                  onClick={() => focusPage(page.index)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border:
                      page.index === selectedPage
                        ? '1px solid rgba(45,106,159,0.6)'
                        : page.hasOverflow
                          ? '1px solid rgba(239,68,68,0.25)'
                          : '1px solid rgba(168,196,220,0.14)',
                    background:
                      page.index === selectedPage
                        ? 'linear-gradient(135deg, rgba(45,106,159,0.22) 0%, rgba(10,22,40,0.92) 100%)'
                        : page.hasOverflow
                          ? 'rgba(127,29,29,0.22)'
                          : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: 'rgba(168,196,220,0.7)',
                          fontSize: 'var(--text-xs)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {page.pageNumber}
                      </div>
                      <div style={{ marginTop: 4, fontWeight: 700 }}>{page.label}</div>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 'var(--text-xs)',
                        color: page.hasOverflow ? '#fecaca' : 'rgba(255,255,255,0.64)',
                      }}
                    >
                      {page.hasOverflow ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                      {page.changedBlocks > 0 ? `${page.changedBlocks} edit.` : 'ok'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Edicao" icon={<Edit2 size={14} />}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              O editor agora trabalha por pagina. A exportacao respeita exatamente a altura de cada folha A4,
              sem empurrar a pagina seguinte quando voce altera a de cima.
            </div>
            <button
              type="button"
              onClick={() => setEditMode((current) => !current)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 999,
                cursor: 'pointer',
                border: `1px solid ${editMode ? 'var(--red-600)' : 'rgba(168,196,220,0.16)'}`,
                background: editMode ? 'var(--red-600)' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {editMode ? 'Desativar edicao controlada' : 'Editar somente a pagina ativa'}
            </button>
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Logo" icon={<ImageIcon size={14} />}>
            <Slider label="Altura da logo" value={logoHeight} min={12} max={80} onChange={setLogoHeight} />
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Capa" icon={<LayoutTemplate size={14} />} defaultOpen={false}>
            <Slider label="Largura da foto" value={coverPhotoWidth} min={50} max={100} unit="%" onChange={setCoverPhotoWidth} />
            <Slider label="Altura da foto" value={coverPhotoHeight} min={150} max={550} onChange={setCoverPhotoHeight} />
            <Slider label="Espaco apos foto" value={coverPhotoMb} min={4} max={80} onChange={setCoverPhotoMb} />
            <Slider label="Espaco acima do titulo" value={coverTitleMt} min={4} max={80} onChange={setCoverTitleMt} />
            <Slider label="Espaco abaixo do titulo" value={coverTitleMb} min={4} max={80} onChange={setCoverTitleMb} />
            <Slider label="Espaco antes dos contatos" value={coverContactsMt} min={4} max={300} onChange={setCoverContactsMt} />
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Pagina" icon={<Maximize size={14} />}>
            <Slider label="Margem interna" value={pageMargin} min={10} max={80} onChange={setPageMargin} />
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Tipografia" icon={<Type size={14} />}>
            <Slider label="Tamanho base" value={fontSize} min={8} max={16} onChange={setFontSize} />
            <Slider label="Tamanho titulos" value={titleSize} min={11} max={24} onChange={setTitleSize} />
            <Slider label="Espaco acima do titulo" value={titleMarginTop} min={4} max={60} onChange={setTitleMarginTop} />
            <Slider label="Espaco abaixo do titulo" value={titleMarginBottom} min={2} max={24} onChange={setTitleMarginBottom} />
            <Slider label="Altura da linha" value={lineHeight} min={1} max={2} step={0.05} unit="" decimals={2} onChange={setLineHeight} />
            <Slider label="Espaco entre paragrafos" value={paraSpacing} min={0} max={40} onChange={setParaSpacing} />
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Paleta" icon={<Palette size={14} />}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                style={{
                  width: 44,
                  height: 32,
                  border: '1px solid rgba(168,196,220,0.24)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              />
              <span style={{ color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700 }}>{primaryColor.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['#003366', '#0A1628', '#1A3A5C', '#C8102E', '#1A1A1A'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  title={color}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: primaryColor === color ? '2px solid #fff' : '2px solid transparent',
                    background: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </Section>

          <div style={{ height: 14 }} />
          <Section title="Tabelas" icon={<Table2 size={14} />} defaultOpen={false}>
            <Slider label="Fonte da tabela" value={tableFontSize} min={6} max={12} onChange={setTableFontSize} />
            <Slider label="Padding das celulas" value={cellPadding} min={1} max={6} onChange={setCellPadding} />
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Margens do PDF" icon={<Ruler size={14} />} defaultOpen={false}>
            <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 'var(--text-xs)', lineHeight: 1.6, marginBottom: 10 }}>
              Estas margens afetam somente a exportacao final em PDF.
            </div>
            <Slider label="Superior" value={pdfMarginTop} min={0} max={30} unit="mm" onChange={setPdfMarginTop} />
            <Slider label="Esquerda" value={pdfMarginLeft} min={0} max={30} unit="mm" onChange={setPdfMarginLeft} />
            <Slider label="Inferior" value={pdfMarginBottom} min={0} max={30} unit="mm" onChange={setPdfMarginBottom} />
            <Slider label="Direita" value={pdfMarginRight} min={0} max={30} unit="mm" onChange={setPdfMarginRight} />
          </Section>

          <div style={{ height: 14 }} />

          <Section title="Zoom do preview" icon={<ZoomIn size={14} />} defaultOpen={false}>
            <Slider label="Zoom" value={previewZoom} min={50} max={150} unit="%" onChange={setPreviewZoom} />
            <button
              type="button"
              onClick={() => setPreviewZoom(100)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(168,196,220,0.16)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Resetar para 100%
            </button>
          </Section>
        </aside>

        <main
          ref={previewViewportRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            padding: '28px 32px 40px',
            background:
              'radial-gradient(circle at top, rgba(45,106,159,0.2) 0%, rgba(10,22,40,0.92) 42%, #08111d 100%)',
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: '0 auto 18px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  color: 'rgba(168,196,220,0.76)',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                Preview paginado
              </div>
              <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginTop: 6 }}>
                Edicao isolada por pagina
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <MetricCard label="Pagina ativa" value={String(selectedPage)} />
              <MetricCard
                label="Status"
                value={overflowCount > 0 ? 'Revisar overflow' : 'Tudo consistente'}
                tone={overflowCount > 0 ? 'warning' : 'success'}
              />
            </div>
          </div>

          <div
            style={{
              width: PAGE_WIDTH,
              margin: '0 auto',
              position: 'relative',
              height: `${Math.round(contentHeight * previewZoom / 100)}px`,
            }}
          >
            <div
              ref={contentRef}
              onClickCapture={handlePreviewClick}
              className="pdf-editor-preview"
              data-edit-mode={editMode ? 'true' : 'false'}
              style={{
                ...cssVars,
                width: PAGE_WIDTH,
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: 'top left',
              }}
            >
              <style>{`
                .pdf-editor-preview .pdf-page {
                  padding: 12px;
                  border-radius: 24px;
                  cursor: pointer;
                  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, opacity 160ms ease;
                }
                .pdf-editor-preview .pdf-page .page-container {
                  border-radius: 12px;
                }
                .pdf-editor-preview .pdf-page[data-active="false"] {
                  background: rgba(255,255,255,0.03);
                  box-shadow: inset 0 0 0 1px rgba(168,196,220,0.08);
                }
                .pdf-editor-preview .pdf-page[data-active="true"] {
                  background: linear-gradient(135deg, rgba(45,106,159,0.18) 0%, rgba(255,255,255,0.03) 100%);
                  box-shadow: 0 24px 60px rgba(3,7,18,0.38), inset 0 0 0 1px rgba(45,106,159,0.32);
                  transform: translateY(-2px);
                }
                .pdf-editor-preview .pdf-page[data-overflow="true"] {
                  background: linear-gradient(135deg, rgba(127,29,29,0.34) 0%, rgba(255,255,255,0.03) 100%);
                  box-shadow: 0 24px 60px rgba(127,29,29,0.24), inset 0 0 0 1px rgba(239,68,68,0.25);
                }
                .pdf-editor-preview[data-edit-mode="true"] .pdf-page[data-active="false"] {
                  opacity: 0.72;
                }
                .pdf-editor-preview .pdf-page[data-edited="true"]::after {
                  content: 'Edited';
                  position: absolute;
                  top: 18px;
                  right: 22px;
                  padding: 3px 9px;
                  border-radius: 999px;
                  background: rgba(45,106,159,0.9);
                  color: #fff;
                  font: 700 10px/1 Barlow Semi Condensed, sans-serif;
                  letter-spacing: 0.06em;
                  text-transform: uppercase;
                }
                .pdf-editor-preview .pdf-page[data-overflow="true"]::before {
                  content: 'Overflow';
                  position: absolute;
                  top: 18px;
                  left: 22px;
                  padding: 3px 9px;
                  border-radius: 999px;
                  background: rgba(220,38,38,0.92);
                  color: #fff;
                  font: 700 10px/1 Barlow Semi Condensed, sans-serif;
                  letter-spacing: 0.06em;
                  text-transform: uppercase;
                }
              `}</style>
              <PdfTemplate report={report} />
            </div>
          </div>

          <div
            className="no-print"
            style={{
              maxWidth: 1180,
              margin: '24px auto 0',
              padding: '14px 16px',
              borderRadius: 14,
              border: '1px solid rgba(168,196,220,0.14)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.78)',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.6,
            }}
          >
            O preview trabalha com pagina real A4 e exporta cada folha individualmente.
            Conteudo que ultrapassa a area util fica sinalizado para ajuste e nao desloca mais a proxima pagina.
          </div>
        </main>
      </div>
    </div>
  )
}
