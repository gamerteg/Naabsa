async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.getElementsByTagName('img'))
  const pending = images.map((img) => {
    if (img.complete) return Promise.resolve()

    return new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
  })

  await Promise.all(pending)
}

function sanitizeClonedStyles(clonedDoc: Document) {
  const styles = clonedDoc.querySelectorAll('style')
  styles.forEach((style) => {
    if (!style.innerHTML) return

    style.innerHTML = style.innerHTML
      .replace(/oklch\([^)]+\)/g, 'transparent')
      .replace(/color-mix\([^)]+\)/g, 'transparent')
  })
}

function buildPageTargets(pageSurfaces: HTMLElement[]) {
  const pageById = new Map<string, number>()

  pageSurfaces.forEach((pageSurface, index) => {
    const pageNumber = index + 1
    const elementsWithId = pageSurface.querySelectorAll<HTMLElement>('[id]')

    elementsWithId.forEach((element) => {
      if (element.id && !pageById.has(element.id)) {
        pageById.set(element.id, pageNumber)
      }
    })
  })

  return pageById
}

function addInternalLinks(
  pdf: import('jspdf').jsPDF,
  pageSurface: HTMLElement,
  x: number,
  y: number,
  renderWidth: number,
  renderHeight: number,
  pageTargets: Map<string, number>
) {
  const pageRect = pageSurface.getBoundingClientRect()
  const scaleX = renderWidth / pageRect.width
  const scaleY = renderHeight / pageRect.height
  const linkElements = pageSurface.querySelectorAll<HTMLElement>('[data-pdf-link-target]')

  linkElements.forEach((element) => {
    const targetId = element.dataset.pdfLinkTarget
    if (!targetId) return

    const targetPage = pageTargets.get(targetId)
    if (!targetPage) return

    const rect = element.getBoundingClientRect()
    const width = rect.width * scaleX
    const height = rect.height * scaleY

    if (width <= 0 || height <= 0) return

    const linkX = x + (rect.left - pageRect.left) * scaleX
    const linkY = y + (rect.top - pageRect.top) * scaleY

    pdf.link(linkX, linkY, width, height, { pageNumber: targetPage })
  })
}

export async function generatePdfFromElement(
  elementId: string,
  filename: string,
  margins?: [number, number, number, number]
): Promise<void> {
  if (typeof window === 'undefined') return

  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const html2canvas = html2canvasModule.default
  const root = document.getElementById(elementId)

  if (!root) {
    throw new Error(`Element with id ${elementId} not found`)
  }

  const pageSurfaces = Array.from(
    root.querySelectorAll<HTMLElement>('.pdf-page .page-container')
  )

  if (!pageSurfaces.length) {
    throw new Error('No PDF pages were found to export')
  }

  await waitForImages(root)

  const [top, left, bottom, right] = margins ?? [10, 10, 15, 10]
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - left - right
  const contentHeight = pageHeight - top - bottom
  const pageTargets = buildPageTargets(pageSurfaces)

  for (let index = 0; index < pageSurfaces.length; index += 1) {
    const pageSurface = pageSurfaces[index]

    const canvas = await html2canvas(pageSurface, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: sanitizeClonedStyles,
    })

    const imgData = canvas.toDataURL('image/png')
    const aspectRatio = canvas.width / canvas.height

    let renderWidth = contentWidth
    let renderHeight = renderWidth / aspectRatio

    if (renderHeight > contentHeight) {
      renderHeight = contentHeight
      renderWidth = renderHeight * aspectRatio
    }

    const x = left + (contentWidth - renderWidth) / 2
    const y = top + (contentHeight - renderHeight) / 2

    if (index > 0) {
      pdf.addPage()
    }

    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST')
    addInternalLinks(pdf, pageSurface, x, y, renderWidth, renderHeight, pageTargets)
  }

  pdf.save(`${filename}.pdf`)
}
