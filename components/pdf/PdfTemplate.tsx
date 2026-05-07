// components/pdf/PdfTemplate.tsx
import React from 'react'
import type { BunkerReport, TankRow, GravityRow } from '@/lib/types'
import { calcTotals, formatNumber } from '@/lib/calculations'

interface PdfTemplateProps {
  report: BunkerReport
}

interface TocEntry {
  title: string
  page: number
  targetId: string
  level?: 0 | 1
}

function PageShell({
  pageNumber,
  pageLabel,
  children,
}: {
  pageNumber: string
  pageLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="pdf-page" data-page-number={pageNumber} data-page-label={pageLabel}>
      <div className="page-container">{children}</div>
    </section>
  )
}

function PdfHeader() {
  return (
    <div className="flex justify-between items-end border-b primary-border pb-3 mb-8">
      <img
        src="/logo.png"
        alt="NAABSA Logo"
        className="object-contain"
        style={{ height: 'var(--pdf-logo-h, 24px)' }}
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
      />
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-[0.28em] text-slate-500 mb-1">NAABSA Survey Report</div>
        <h2 className="primary-text text-[22px] font-serif m-0 leading-none">MARINE SURVEYORS & CONSULTANTS</h2>
        <p className="text-[10px] mt-1 text-slate-500">Main Brazilian Ports</p>
      </div>
    </div>
  )
}

function PdfFooter({ page }: { page: string }) {
  return (
    <div className="mt-8 pt-3 border-t primary-border flex justify-between items-center text-[10px] text-slate-500">
      <div className="flex-1 text-center tracking-[0.08em]">naabsa.com | surveyors@naabsa.com</div>
      <div className="w-16 text-right font-bold primary-text">{page}</div>
    </div>
  )
}

function YellowVal({ children }: { children: React.ReactNode }) {
  return <span className="pdf-value">{children}</span>
}

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <h3
      id={`sec-${num.replace('.', '-')}`}
      className="primary-text text-[15px] font-bold mt-6 mb-3 editable-block uppercase tracking-[0.08em]"
    >
      {num}. {title}
    </h3>
  )
}

function SubSectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <h4
      id={`sec-${num.replace('.', '-')}`}
      className="text-black text-[13px] font-bold mt-5 mb-2 editable-block tracking-[0.04em]"
    >
      {num}. {title}
    </h4>
  )
}

function TocRow({ title, page, targetId, level = 0 }: TocEntry) {
  return (
    <div
      className="pdf-toc-row"
      data-pdf-link-target={targetId}
      style={{ paddingLeft: level === 1 ? 22 : 0 }}
    >
      <span className="pdf-toc-title">{title}</span>
      <span className="pdf-toc-dots" />
      <span className="pdf-toc-page">{page}</span>
    </div>
  )
}

function RenderTankTable({
  tanks,
  totals,
  metadata,
  tableLabel
}: {
  tanks: TankRow[],
  totals: ReturnType<typeof calcTotals>,
  metadata: { draftFore: number, draftAft: number, list: number, trimCorr: boolean },
  tableLabel?: string
}) {
  return (
    <div className="mt-3 mb-3">
      <table className="w-full text-[8.5px] border-collapse border border-slate-300 text-center leading-[1.1] editable-block overflow-hidden rounded-[10px]">
        <thead>
          {tableLabel && (
            <tr className="pdf-table-head font-bold border-b border-slate-300">
              <td colSpan={8} className="border-r border-slate-300 p-[2px] text-left font-bold">{tableLabel}</td>
              <td colSpan={2} className="border-r border-slate-300 p-[2px] text-left font-bold">FLOWMETER</td>
              <td colSpan={3} className="p-[2px] text-right font-bold">N/A &nbsp;&nbsp; mÂ³</td>
            </tr>
          )}
          <tr className="pdf-table-head font-bold border-b border-slate-300">
            <td colSpan={2} className="border-r border-slate-300 p-[2px] text-left">Draft Fore: <span className="font-normal">{metadata.draftFore?.toFixed(2) || '0.00'} m</span></td>
            <td colSpan={2} className="border-r border-slate-300 p-[2px] text-left">Draft Aft: <span className="font-normal">{metadata.draftAft?.toFixed(2) || '0.00'} m</span></td>
            <td colSpan={3} className="border-r border-slate-300 p-[2px] text-left">List: <span className="font-normal">{metadata.list?.toFixed(2) || '0.00'}</span></td>
            <td colSpan={3} className="border-r border-slate-300 p-[2px] text-left">Trim Correction Applied: <span className="font-normal">{metadata.trimCorr ? 'YES' : 'NO'}</span></td>
            <td colSpan={2} className="p-[2px]">METRIC TONS</td>
          </tr>
          <tr className="pdf-table-head">
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold w-[9%]">Tank nÂº</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Grade</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Sounding<br />/ Ullage<br />(m)</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Deg<br />Â°C</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Total Vol<br />Observed (mÂ³)</th>
            <th colSpan={2} className="border border-gray-400 p-[2px] font-bold">Free Water</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Gross Obs<br />Vol (mÂ³)</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">VCF TAB<br />54B</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Density (S.G.)<br />at 15Â° C</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Gross Std<br />Vol @15Â° C</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">IN VAC</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">IN AIR</th>
          </tr>
          <tr className="pdf-table-head">
            <th className="border border-gray-400 p-[2px] font-bold text-[7px]">Dip</th>
            <th className="border border-gray-400 p-[2px] font-bold text-[7px]">Vol</th>
          </tr>
        </thead>
        <tbody>
          {tanks.length === 0 ? (
            <tr><td colSpan={13} className="p-2 border border-slate-300">No tanks recorded</td></tr>
          ) : (
            tanks.map((t, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                <td className="border border-gray-400 p-[2px]">{t.tank_name}</td>
                <td className="border border-gray-400 p-[2px]">{t.grade}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.sounding_value)} {t.sounding_type === 'U' ? 'u' : 's'}</td>
                <td className="border border-gray-400 p-[2px]">{t.deg}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.total_vol_observed)}</td>
                <td className="border border-gray-400 p-[2px]">Nil</td>
                <td className="border border-gray-400 p-[2px]">0,000</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.gross_obs_vol)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.vcf_tab_54b, 4)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.density_sg, 4)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.gross_std_vol)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.in_vac)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.in_air)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold pdf-table-head">
            <td colSpan={4} className="border border-gray-400 text-center p-[2px]">Total</td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_gross_obs)}</td>
            <td colSpan={2} className="border border-gray-400 p-[2px]"></td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_gross_obs)}</td>
            <td colSpan={2} className="border border-gray-400 p-[2px]"></td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_gross_std)}</td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_in_vac)}</td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_in_air)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="text-[9px] mt-1 text-gray-600">Sound: (U)=Ullage / (S)=Deep Sounding</div>
    </div>
  )
}

function DifferenceBlock({ title1, fig1, title2, fig2, diff }: { title1: string, fig1: number, title2: string, fig2: number, diff: number }) {
  return (
    <div className="text-[12px] font-bold mt-4 font-mono w-[300px]">
      <div className="flex justify-between">
        <span>{title1}</span>
        <span>: <YellowVal>{formatNumber(fig1)}</YellowVal> mt</span>
      </div>
      <div className="flex justify-between">
        <span>{title2}</span>
        <span>: <YellowVal>{formatNumber(fig2)}</YellowVal> mt</span>
      </div>
      <div className="flex justify-between">
        <span>Difference (mt).....</span>
        <span>: {diff < 0
          ? <span style={{ color: '#CC0000', fontWeight: 'bold' }}>{formatNumber(diff)} mt</span>
          : <><YellowVal>{diff > 0 ? '+' : ''}{formatNumber(diff)}</YellowVal> mt</>
        }</span>
      </div>
    </div>
  )
}

function GravitiesTable({ gravities }: { gravities: GravityRow[] }) {
  return (
    <div className="flex justify-center my-4">
      <table className="text-[12px] border-collapse border border-black text-center w-[300px] editable-block">
        <thead>
          <tr className="font-bold border-b border-black bg-[#FFD700]">
            <th className="border-r border-black p-1">Temperature Â°C</th>
            <th className="p-1">Specific Gravity</th>
          </tr>
        </thead>
        <tbody>
          {gravities && gravities.length > 0 ? gravities.map((g, i) => (
            <tr key={i}>
              <td className="border-r border-black p-1">{g.temperature_c}</td>
              <td className="p-1 font-bold"><YellowVal>{formatNumber(g.specific_gravity, 4)}</YellowVal></td>
            </tr>
          )) : (
             <tr>
               <td className="border-r border-black p-1 bg-gray-50">15</td>
               <td className="p-1 bg-gray-50">--</td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function PdfTemplate({ report }: PdfTemplateProps) {
  const data = report.form_data

  // Safe handlers
  const safeStr = (s?: string | null) => s || '---'
  const safeNum = (n?: number | null) => (n !== undefined && n !== null ? n : 0)

  // Tank totals
  const openVesselTanks = data.vessel_tanks_open || []
  const closeVesselTanks = data.vessel_tanks_close || []
  const openBargeTanks = data.barge_tanks_open || []
  const closeBargeTanks = data.barge_tanks_close || []
  
  const openVesselTotals = calcTotals(openVesselTanks)
  const closeVesselTotals = calcTotals(closeVesselTanks)
  const openBargeTotals = calcTotals(openBargeTanks)
  const closeBargeTotals = calcTotals(closeBargeTanks)

  // Filters for photos
  const vesselPhotos = (data.photos || []).filter(p => p.category === 'vessel_tanks')
  const samplePhotos = (data.photos || []).filter(p => p.category === 'sampling')
  const bargePhotos = (data.photos || []).filter(p => p.category === 'barge_tanks')

  // Chunk array into groups of n (for 2×2 photo grid = 4 per page)
  function chunkPhotos<T>(arr: T[], n = 4): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
    return out
  }

  const vesselPhotoChunks = chunkPhotos(vesselPhotos)
  const bargePhotoChunks = chunkPhotos(bargePhotos)
  const samplePhotoChunks = chunkPhotos(samplePhotos)

  const firstPhotoPage = 7
  const vesselPhotoStartPage = vesselPhotoChunks.length > 0 ? firstPhotoPage : null
  const bargePhotoStartPage =
    bargePhotoChunks.length > 0 ? firstPhotoPage + vesselPhotoChunks.length : null
  const samplePhotoStartPage =
    samplePhotoChunks.length > 0
      ? firstPhotoPage + vesselPhotoChunks.length + bargePhotoChunks.length
      : null
  const attachmentPageNumber =
    firstPhotoPage + vesselPhotoChunks.length + bargePhotoChunks.length + samplePhotoChunks.length
  const totalPages = attachmentPageNumber
  const photographicReportPage =
    vesselPhotoStartPage ?? bargePhotoStartPage ?? samplePhotoStartPage ?? attachmentPageNumber
  const samplingPage = samplePhotoStartPage ?? attachmentPageNumber
  const pageText = (page: number) => `${page} / ${totalPages}`

  const tocEntries: TocEntry[] = [
    { title: '1. Background', page: 3, targetId: 'sec-1' },
    { title: "2. Vessel's details (Ship's Particulars)", page: 3, targetId: 'sec-2' },
    { title: '3. Bunker Quantity Survey', page: 3, targetId: 'sec-3' },
    { title: '4. Opening soundings', page: 3, targetId: 'sec-4' },
    { title: "4.1. Vessel's tanks", page: 3, targetId: 'sec-4-1', level: 1 },
    { title: '4.2. Gross volume (m³)', page: 4, targetId: 'sec-4-2', level: 1 },
    { title: '4.3. Temperatures', page: 4, targetId: 'sec-4-3', level: 1 },
    { title: '4.4. Specific gravities', page: 4, targetId: 'sec-4-4', level: 1 },
    { title: "4.5. Barge's tanks", page: 4, targetId: 'sec-4-5', level: 1 },
    { title: '4.6. Gross volume (m³)', page: 5, targetId: 'sec-4-6', level: 1 },
    { title: '4.7. Temperature', page: 5, targetId: 'sec-4-7', level: 1 },
    { title: '4.8. Specific gravities', page: 5, targetId: 'sec-4-8', level: 1 },
    { title: '5. Closing soundings', page: 5, targetId: 'sec-5' },
    { title: "5.1. Vessel's tanks", page: 5, targetId: 'sec-5-1', level: 1 },
    { title: "5.2. Barge's tanks", page: 5, targetId: 'sec-5-2', level: 1 },
    { title: '6. Final figures', page: 6, targetId: 'sec-6' },
    { title: '7. Photographic report', page: photographicReportPage, targetId: 'sec-7' },
    ...(vesselPhotoStartPage
      ? [{ title: "7.1. Vessel's tanks", page: vesselPhotoStartPage, targetId: 'sec-7-1', level: 1 as const }]
      : []),
    ...(bargePhotoStartPage
      ? [{ title: "7.2. Barge's tanks", page: bargePhotoStartPage, targetId: 'sec-7-2', level: 1 as const }]
      : []),
    { title: '7.3. Sampling', page: samplingPage, targetId: 'sec-7-3', level: 1 },
    { title: '8. Attachments', page: attachmentPageNumber, targetId: 'sec-8' },
  ]

  // Subcomponents for Pages
  const CoverPage = () => (
    <div className="min-h-[1050px] flex flex-col">
      <PdfHeader />
      
      <div className="text-[10px] mb-8 flex justify-between">
        <div>
          433 Ana Costa Avenue<br/>
          Suite 81 - Santos/Brazil<br/>
          11060-003
        </div>
        <div className="text-right">
          Telephone: +55 13 33940655<br/>
          email: surveyors@naabsa.com<br/>
          www.naabsa.com
        </div>
      </div>

      <div className="text-center" style={{ marginTop: 'var(--pdf-cover-title-mt, 16px)', marginBottom: 'var(--pdf-cover-title-mb, 24px)' }}>
        <h1 className="text-black text-3xl font-bold m-0">Survey Report</h1>
        <p className="text-sm">Ref:{safeStr(data.ref_number)}</p>
        
        <p className="text-sm mt-6 mb-1">Bunker Quantity Survey</p>
        <h2 className="text-3xl font-bold m-0">MV {safeStr(data.vessel_name).toUpperCase()}</h2>
        <p className="text-sm">at {safeStr(data.port)} Port</p>
      </div>

      <div className="mx-auto relative bg-gray-100" style={{ width: 'var(--pdf-cover-photo-w, 100%)', height: 'var(--pdf-cover-photo-h, 350px)', marginBottom: 'var(--pdf-cover-photo-mb, 28px)' }}>
        {data.cover_photo_url ? (
          <img src={data.cover_photo_url} alt={`${safeStr(data.vessel_name)} cover`} className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No cover photo</div>
        )}
        <div className="absolute top-0 right-0 bg-white p-1">
          <img src="/logo.png" alt="NAABSA" style={{ height: 'var(--pdf-logo-h, 24px)' }} />
        </div>
        <div className="absolute bottom-0 w-full bg-black/60 text-white text-right px-2 py-1 text-xs">
          {safeStr(data.vessel_name).toUpperCase()} - {safeStr(data.port).toUpperCase()} PORT
        </div>
      </div>

      <div className="w-[90%] mx-auto editable-block pdf-panel" style={{ marginTop: 'var(--pdf-cover-contacts-mt, auto)', marginBottom: 28 }}>
        <h3 className="primary-text inline-block font-bold text-[13px] mb-3 uppercase tracking-[0.08em]">Person / Companies Contacted</h3>
        <table className="w-full text-[11px] border-none">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-1/3 py-1"><YellowVal>Costumer</YellowVal></td>
              <td className="py-1">
                <div className="font-bold pdf-value inline-block">{safeStr(data.customer_company)}</div><br/>
                <div className="pdf-value inline-block">{safeStr(data.customer_contact)}</div>
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1"><YellowVal>Undersigned Surveyor</YellowVal></td>
              <td className="py-1">
                <div className="font-bold pdf-value inline-block">{safeStr(data.surveyor_company)}</div><br/>
                <div className="pdf-value inline-block">{safeStr(data.surveyor_name)}</div>
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1"><YellowVal>Suppliers</YellowVal></td>
              <td className="py-1">
                <div className="font-bold pdf-value inline-block">{safeStr(data.supplier_company)}</div><br/>
                <div className="pdf-value inline-block">{safeStr(data.supplier_contact)}</div>
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1"><YellowVal>Vessel&apos;s Command</YellowVal></td>
              <td className="py-1">
                <div className="font-bold pdf-value inline-block">Master / Chief Engineer</div><br/>
                <div className="pdf-value inline-block">Capt. {safeStr(data.vessel_master)} / {safeStr(data.vessel_chief_engineer)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PdfFooter page={pageText(1)} />
    </div>
  )

  const TOCPage = () => (
    <div id="toc" className="min-h-[1050px] flex flex-col">
      <PdfHeader />
      
      <h3 className="bg-[#FFFF00] inline-block px-1 font-bold text-[15px] mb-6">Contents</h3>
      
      <div className="mx-8 space-y-1 text-[13px] flex-grow">
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">1. Background</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>3</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">2. Vessel&apos;s details (Ship&apos;s Particulars)</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>3</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">3. Bunker Quantity Survey</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>3</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">4. Opening soundings</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>3</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">4.1. Vessel&apos;s tanks</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>3</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">4.2. Gross Volume (m³)</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>4</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">4.3. Temperatures</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>4</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">4.4. Specific gravities</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>4</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">4.5. Barge&apos;s tanks</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>4</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">5. Closing soundings</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>5</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">5.1. Vessel&apos;s tanks</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>5</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">5.2. Barge&apos;s tanks</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>5</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">6. Final figures</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>6</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">7. Photographic Report</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>6</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">7.1. Vessel&apos;s tanks</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>6</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">7.2. Barge&apos;s tanks</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>7</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1 pl-6">
          <span className="shrink-0 mr-1">7.3. Sampling</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>8</span>
        </div>
        <div className="flex bg-[#FFFF00] mb-1">
          <span className="shrink-0 mr-1">8. Attachment</span>
          <div className="grow border-b-2 border-dotted border-black mb-1 mx-1"></div>
          <span>8</span>
        </div>
      </div>

      <PdfFooter page="2" />
    </div>
  )

  const TOCPageModern = () => (
    <div id="toc" className="min-h-[1050px] flex flex-col">
      <PdfHeader />

      <div className="pdf-toc-card flex-grow">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="primary-text font-bold text-[20px] m-0">Table of Contents</h3>
            <p className="text-[11px] text-slate-500 mt-2 mb-0 tracking-[0.04em]">
              Click any entry in the exported PDF to jump straight to that section.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 font-bold tracking-[0.18em] uppercase">Report Map</div>
        </div>

        <div className="space-y-1 text-[13px]">
          {tocEntries.map((entry) => (
            <TocRow key={entry.targetId} {...entry} />
          ))}
        </div>
      </div>

      <PdfFooter page={pageText(2)} />
    </div>
  )

  const _RenderTankTable = ({
    tanks,
    totals,
    metadata,
    tableLabel
  }: {
    tanks: TankRow[],
    totals: ReturnType<typeof calcTotals>,
    metadata: { draftFore: number, draftAft: number, list: number, trimCorr: boolean },
    tableLabel?: string
  }) => (
    <div className="mt-2 mb-2">
      <table className="w-full text-[8.5px] border-collapse border border-gray-400 text-center leading-[1.1] editable-block">
        <thead>
          {tableLabel && (
            <tr className="bg-[#FFD700] font-bold border-b border-gray-400">
              <td colSpan={8} className="border-r border-gray-400 p-[2px] text-left font-bold">{tableLabel}</td>
              <td colSpan={2} className="border-r border-gray-400 p-[2px] text-left font-bold">FLOWMETER</td>
              <td colSpan={3} className="p-[2px] text-right font-bold">N/A &nbsp;&nbsp; m³</td>
            </tr>
          )}
          <tr className="bg-[#FFD700] font-bold border-b border-gray-400">
            <td colSpan={2} className="border-r border-gray-400 p-[2px] text-left">Draft Fore: <span className="font-normal">{metadata.draftFore?.toFixed(2) || '0.00'} m</span></td>
            <td colSpan={2} className="border-r border-gray-400 p-[2px] text-left">Draft Aft: <span className="font-normal">{metadata.draftAft?.toFixed(2) || '0.00'} m</span></td>
            <td colSpan={3} className="border-r border-gray-400 p-[2px] text-left">List: <span className="font-normal">{metadata.list?.toFixed(2) || '0.00'}</span></td>
            <td colSpan={3} className="border-r border-gray-400 p-[2px] text-left">Trim Correction Applied: <span className="font-normal">{metadata.trimCorr ? 'YES' : 'NO'}</span></td>
            <td colSpan={2} className="p-[2px]">METRIC TONS</td>
          </tr>
          <tr className="bg-[#FFD700]">
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold w-[9%]">Tank nº</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Grade</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Sounding<br/>/ Ullage<br/>(m)</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Deg<br/>°C</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Total Vol<br/>Observed (m³)</th>
            <th colSpan={2} className="border border-gray-400 p-[2px] font-bold">Free Water</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Gross Obs<br/>Vol (m³)</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">VCF TAB<br/>54B</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Density (S.G.)<br/>at 15° C</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">Gross Std<br/>Vol @15° C</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">IN VAC</th>
            <th rowSpan={2} className="border border-gray-400 p-[2px] font-bold">IN AIR</th>
          </tr>
          <tr className="bg-[#FFD700]">
            <th className="border border-gray-400 p-[2px] font-bold text-[7px]">Dip</th>
            <th className="border border-gray-400 p-[2px] font-bold text-[7px]">Vol</th>
          </tr>
        </thead>
        <tbody>
          {tanks.length === 0 ? (
            <tr><td colSpan={13} className="p-2 border border-gray-400">No tanks recorded</td></tr>
          ) : (
            tanks.map((t, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-[#F9F9F9]' : ''}>
                <td className="border border-gray-400 p-[2px]">{t.tank_name}</td>
                <td className="border border-gray-400 p-[2px]">{t.grade}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.sounding_value)} {t.sounding_type === 'U' ? 'u' : 's'}</td>
                <td className="border border-gray-400 p-[2px]">{t.deg}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.total_vol_observed)}</td>
                <td className="border border-gray-400 p-[2px]">Nil</td>
                <td className="border border-gray-400 p-[2px]">0,000</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.gross_obs_vol)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.vcf_tab_54b, 4)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.density_sg, 4)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.gross_std_vol)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.in_vac)}</td>
                <td className="border border-gray-400 p-[2px]">{formatNumber(t.in_air)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-[#FFD700]">
            <td colSpan={4} className="border border-gray-400 text-center p-[2px]">Total</td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_gross_obs)}</td>
            <td colSpan={2} className="border border-gray-400 p-[2px]"></td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_gross_obs)}</td>
            <td colSpan={2} className="border border-gray-400 p-[2px]"></td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_gross_std)}</td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_in_vac)}</td>
            <td className="border border-gray-400 p-[2px]">{formatNumber(totals.total_in_air)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="text-[9px] mt-1 text-gray-600">Sound: (U)=Ullage / (S)=Deep Sounding</div>
    </div>
  )

  const _DifferenceBlock = ({ title1, fig1, title2, fig2, diff }: { title1: string, fig1: number, title2: string, fig2: number, diff: number }) => (
    <div className="text-[12px] font-bold mt-4 font-mono w-[300px]">
      <div className="flex justify-between">
        <span>{title1}</span>
        <span>: <YellowVal>{formatNumber(fig1)}</YellowVal> mt</span>
      </div>
      <div className="flex justify-between">
        <span>{title2}</span>
        <span>: <YellowVal>{formatNumber(fig2)}</YellowVal> mt</span>
      </div>
      <div className="flex justify-between">
        <span>Difference (mt).....</span>
        <span>: {diff < 0
          ? <span style={{ color: '#CC0000', fontWeight: 'bold' }}>{formatNumber(diff)} mt</span>
          : <><YellowVal>{diff > 0 ? '+' : ''}{formatNumber(diff)}</YellowVal> mt</>
        }</span>
      </div>
    </div>
  )

  const _GravitiesTable = ({ gravities }: { gravities: GravityRow[] }) => (
    <div className="flex justify-center my-4">
      <table className="text-[12px] border-collapse border border-black text-center w-[300px] editable-block">
        <thead>
          <tr className="font-bold border-b border-black bg-[#FFD700]">
            <th className="border-r border-black p-1">Temperature °C</th>
            <th className="p-1">Specific Gravity</th>
          </tr>
        </thead>
        <tbody>
          {gravities && gravities.length > 0 ? gravities.map((g, i) => (
            <tr key={i}>
              <td className="border-r border-black p-1">{g.temperature_c}</td>
              <td className="p-1 font-bold"><YellowVal>{formatNumber(g.specific_gravity, 4)}</YellowVal></td>
            </tr>
          )) : (
             <tr>
               <td className="border-r border-black p-1 bg-gray-50">15</td>
               <td className="p-1 bg-gray-50">--</td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  void TOCPage
  void _RenderTankTable
  void _DifferenceBlock
  void _GravitiesTable

  return (
    <div id="pdf-content" className="w-[794px] mx-auto bg-white text-black" style={{ fontSize: 'var(--pdf-font-size, 12px)', fontFamily: "Georgia, 'Times New Roman', Times, serif" }}>
      <style>{`
        #pdf-content * { box-sizing: border-box; }
        #pdf-content { background: transparent; }
        .primary-text { color: var(--pdf-primary, #003366); }
        .primary-border { border-color: var(--pdf-primary, #003366); }
        .primary-bg { background-color: var(--pdf-primary, #003366); }
        .pdf-page { width: 794px; margin: 0 auto 28px; position: relative; }
        .pdf-page:last-child { margin-bottom: 0; }
        .page-container {
          height: 1123px;
          min-height: 1123px;
          max-height: 1123px;
          padding: var(--pdf-margin, 40px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: linear-gradient(180deg, #ffffff 0%, #ffffff 88%, #f8fbff 100%);
        }
        .page-content { flex: 1 1 auto; min-height: 0; overflow: hidden; }
        .pdf-value {
          display: inline-block;
          padding: 1px 8px 2px;
          border-radius: 999px;
          background: rgba(0, 51, 102, 0.08);
          border: 1px solid rgba(0, 51, 102, 0.16);
          color: #0e3152;
          line-height: 1.35;
        }
        .pdf-panel {
          padding: 18px 20px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.72) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .pdf-toc-card {
          padding: 24px 28px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .pdf-toc-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 34px;
          padding: 4px 0;
          cursor: pointer;
        }
        .pdf-toc-title {
          color: #0f172a;
        }
        .pdf-toc-dots {
          flex: 1 1 auto;
          border-bottom: 1px dashed rgba(100, 116, 139, 0.65);
          transform: translateY(2px);
        }
        .pdf-toc-page {
          min-width: 28px;
          text-align: right;
          font-weight: 700;
          color: var(--pdf-primary, #003366);
        }
        .pdf-table-head {
          background: #eaf1f8 !important;
          color: #0f3558;
        }
        #pdf-content table.editable-block thead tr,
        #pdf-content table.editable-block tfoot tr {
          background: #eaf1f8 !important;
          color: #0f3558 !important;
        }
        #pdf-content table.editable-block,
        #pdf-content table.editable-block td,
        #pdf-content table.editable-block th {
          border-color: #cbd5e1 !important;
        }
        /* Tipografia vars */
        #pdf-content p, #pdf-content li { line-height: var(--pdf-line-h, 1.4); margin-bottom: var(--pdf-para-sp, 8px); color: #111827; }
        #pdf-content h3.editable-block { font-size: var(--pdf-title-size, 15px) !important; margin-top: var(--pdf-title-mt, 24px) !important; margin-bottom: var(--pdf-title-mb, 8px) !important; }
        #pdf-content h4.editable-block { font-size: calc(var(--pdf-title-size, 15px) - 2px) !important; margin-top: calc(var(--pdf-title-mt, 24px) * 0.67) !important; margin-bottom: var(--pdf-title-mb, 8px) !important; }
        /* Tabelas vars */
        #pdf-content table.editable-block td, #pdf-content table.editable-block th { font-size: var(--pdf-table-font, 8.5px) !important; padding: var(--pdf-cell-pad, 2px) !important; }
      `}</style>

      {/* PAGE 1 - Cover */}
      <PageShell pageNumber="1" pageLabel="Cover page">
        {CoverPage()}
      </PageShell>

      {/* PAGE 2 - TOC */}
      <PageShell pageNumber="2" pageLabel="Table of contents">
        {TOCPageModern()}
      </PageShell>

      {/* PAGE 3 */}
      <PageShell pageNumber="3" pageLabel="Sections 1 to 4.1">
        <PdfHeader />
        <div className="page-content">
          <SectionTitle num="1" title="Background" />
          <p className="mb-4 text-justify leading-relaxed editable-block">
            The <YellowVal>{safeStr(data.vessel_name)}</YellowVal> called to <YellowVal>{safeStr(data.port)}</YellowVal> to load cargo. 
            Complying with the appointment service from Messrs. <YellowVal>{safeStr(data.customer_company)}</YellowVal>, we did attend to carry out Bunker Quantity Survey to ascertain the total quantity of fuel delivered.
            {data.background_text && <><br/>{data.background_text}</>}
          </p>

          <SectionTitle num="2" title="Vessel´s details (Ship´s Particulars)" />
          <div className="font-bold text-[12px] w-[300px] ml-4 flex flex-col gap-1">
            <div className="flex"><span className="w-28">Flag</span><span>: <YellowVal>{safeStr(data.flag)}</YellowVal></span></div>
            <div className="flex"><span className="w-28">Port registry</span><span>: <YellowVal>{safeStr(data.port_registry)}</YellowVal></span></div>
            <div className="flex"><span className="w-28">Callsign</span><span>: <YellowVal>{safeStr(data.callsign)}</YellowVal></span></div>
            <div className="flex"><span className="w-28">IMO number</span><span>: <YellowVal>{safeStr(data.imo_number)}</YellowVal></span></div>
            <div className="flex"><span className="w-28">Type</span><span>: <YellowVal>{safeStr(data.vessel_type)}</YellowVal></span></div>
            <div className="flex"><span className="w-28">Delivered</span><span>: <YellowVal>{safeStr(data.delivered_year)}</YellowVal></span></div>
            <div className="flex"><span className="w-28">LOA</span><span>: <YellowVal>{safeStr(data.loa)}</YellowVal> m</span></div>
          </div>

          <SectionTitle num="3" title="Bunker Quantity Survey" />
          <p className="mb-4 text-justify leading-relaxed editable-block">
            The undersigned surveyor boarded the vessel on <YellowVal>{safeStr(data.boarding_date)} at {safeStr(data.boarding_time)}</YellowVal> l/t, prior to the arrival of the bunker barge.
            We introduced ourselves as Bunker Surveyors and proceeded to the ship&apos;s office for an initial meeting. During this meeting, we ensured that all safety checklists had been duly verified by the Chief Engineer and the Barge Inspector.
          </p>

          <SectionTitle num="4" title="Opening soundings" />
          <SubSectionTitle num="4.1" title="Vessel's tanks" />
          <p className="mb-2 text-justify editable-block">
            The opening soundings of the vessel&apos;s tanks were carried out by the <YellowVal>{safeStr(data.vessel_engineer_open)}</YellowVal> for each tank on <YellowVal>{safeStr(data.sounding_date_open)}</YellowVal> from <YellowVal>{safeStr(data.sounding_time_start_open)}</YellowVal> to <YellowVal>{safeStr(data.sounding_time_end_open)}</YellowVal> local time. The measurements were taken in accordance with standard procedures to ensure accurate assessment of the pre-bunker fuel quantities in the vessel&apos;s tanks.
          </p>

          <RenderTankTable 
            tanks={openVesselTanks} 
            totals={openVesselTotals} 
            metadata={{
              draftFore: safeNum(data.draft_fore_open),
              draftAft: safeNum(data.draft_aft_open),
              list: safeNum(data.list_open),
              trimCorr: Boolean(data.trim_correction_applied)
            }} 
          />

          <DifferenceBlock 
            title1="Logbook (VLSFO)."
            fig1={safeNum(data.logbook_figure)}
            title2="NAABSA figures..."
            fig2={safeNum(data.naabsa_figure)}
            diff={safeNum(data.difference_open_vessel)}
          />

        </div>
        <PdfFooter page={pageText(3)} />
      </PageShell>

      {/* PAGE 4 */}
      <PageShell pageNumber="4" pageLabel="Sections 4.2 to 4.5">
        <PdfHeader />
        <div className="page-content">
          <SubSectionTitle num="4.2" title="Gross volume - m³" />
          <p className="mb-4">Interpolated according to the vessel´s sounding table presented at time of calculations. Trim and Heel correction were applied accordingly.</p>
          
          <SubSectionTitle num="4.3" title="Temperatures" />
          <div className="mb-4 text-[12px]">
            Storage tanks – <YellowVal>{safeStr(data.storage_tanks_temp_source) || 'Vessel´s thermometer.'}</YellowVal><br/>
            Service and Settling tanks – {safeStr(data.service_settling_temp_source) || 'Display on ECR.'}<br/>
            Overflow tank – {safeStr(data.overflow_temp_source) || 'Sea Water temp.'}<br/>
            Engine Room Temp: <YellowVal>{safeNum(data.engine_room_temp)}º</YellowVal> C / Sea Water Temp: <YellowVal>{safeNum(data.sea_water_temp)}º</YellowVal> C
          </div>

          <SubSectionTitle num="4.4" title="Specific Gravities" />
          <p className="text-center mb-2">Applied according to the vessel´s records for bunkering analysis presented by Chief Engineer at time of survey and the current BDN issued by suppliers.</p>
          <GravitiesTable gravities={data.vessel_gravities_open || []} />

          <SubSectionTitle num="4.5" title="Barge's tanks" />
          <p className="mb-2 text-justify">
            The opening soundings of the Barge&apos;s tanks were carried out by the barge´s operator for each tank on <YellowVal>{safeStr(data.barge_sounding_date)}</YellowVal> from <YellowVal>{safeStr(data.barge_sounding_time_start)}</YellowVal> to <YellowVal>{safeStr(data.barge_sounding_time_end)}</YellowVal> local time. The measurements were taken in accordance with standard procedures to ensure accurate assessment of the pre-bunker fuel quantities in the barge&apos;s tanks.
          </p>
          
          <RenderTankTable
            tanks={openBargeTanks}
            totals={openBargeTotals}
            tableLabel="BEFORE TRANSFER"
            metadata={{
              draftFore: safeNum(data.draft_fore_barge_open),
              draftAft: safeNum(data.draft_aft_barge_open),
              list: safeNum(data.list_barge_open),
              trimCorr: true
            }}
          />
          
          <div className="flex justify-between mt-4 font-mono text-[12px] font-bold">
            <div className="w-[300px]">
              <div className="flex justify-between">
                <span>Barge&apos;s inspector figures.....</span>
                <span>: <YellowVal>{formatNumber(safeNum(data.barge_inspector_figure_open))}</YellowVal> mt</span>
              </div>
              <div className="flex justify-between">
                <span>Surveyor&apos;s figures..............</span>
                <span>: <YellowVal>{formatNumber(safeNum(data.surveyor_figure_barge_open))}</YellowVal> mt</span>
              </div>
              <div className="flex justify-between">
                <span>Difference.........................</span>
                <span>: <YellowVal>{safeNum(data.difference_barge_open) > 0 ? '+' : ''}{formatNumber(safeNum(data.difference_barge_open))}</YellowVal> mt</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Flowmeter readings.............</span>
                <span>: <YellowVal>{safeStr(data.flowmeter_status_open).toUpperCase() || 'N/A'}</YellowVal></span>
              </div>
            </div>
          </div>
        </div>
        <PdfFooter page={pageText(4)} />
      </PageShell>

      {/* PAGE 5 */}
      <PageShell pageNumber="5" pageLabel="Sections 4.6 to 5.2">
        <PdfHeader />
        <div className="page-content">
          <SubSectionTitle num="4.6" title="Gross volume - m³" />
          <p className="mb-4">Interpolated according to the barge´s sounding table presented at time of calculations. The trim correction was applied accordingly.</p>
          
          <SubSectionTitle num="4.7" title="Temperature" />
          <p className="mb-4">Storage tanks – <YellowVal>{safeStr(data.barge_temp_method) || 'Glass thermometer.'}</YellowVal></p>

          <SubSectionTitle num="4.8" title="Specific Gravities" />
          <p className="text-center mb-2">According to the BDN issued by suppliers.</p>
          <GravitiesTable gravities={data.barge_gravities_open || []} />

          <SectionTitle num="5" title="Closing soundings" />
          <SubSectionTitle num="5.1" title="Vessel's tanks" />
          <p className="mb-2 text-justify">
            The final sounding on the vessel&apos;s tanks took place immediately after the Barge&apos;s Inspector confirmed that the total amount ordered had been transferred from the barge tanks to the vessel&apos;s tanks on <YellowVal>{safeStr(data.closing_date)}</YellowVal> from <YellowVal>{safeStr(data.closing_time_start)}</YellowVal> to <YellowVal>{safeStr(data.closing_time_end)}</YellowVal> l/t being the following figures disclosed:
          </p>

          <RenderTankTable 
            tanks={closeVesselTanks} 
            totals={closeVesselTotals} 
            metadata={{
              draftFore: safeNum(data.draft_fore_close),
              draftAft: safeNum(data.draft_aft_close),
              list: safeNum(data.list_close),
              trimCorr: Boolean(data.trim_correction_applied)
            }} 
          />

          <div className="text-[12px] font-bold mt-4 font-mono w-[350px]">
            <p className="mb-1 font-[Arial] text-black text-[13px]">Total quantity supplied as per the vessel&apos;s tanks:</p>
            <div className="flex justify-between">
              <span>Initial quantity disclosed.......</span>
              <span>: <YellowVal>{formatNumber(safeNum(data.initial_quantity))}</YellowVal> mt</span>
            </div>
            <div className="flex justify-between">
              <span>Final Quantity disclosed.........</span>
              <span>: <YellowVal>{formatNumber(safeNum(data.final_quantity))}</YellowVal> mt</span>
            </div>
            <div className="flex justify-between">
              <span>Difference..........................</span>
              <span>: <YellowVal>{safeNum(data.difference_vessel_closing) > 0 ? '+' : ''}{formatNumber(safeNum(data.difference_vessel_closing))}</YellowVal> mt</span>
            </div>
          </div>

          <SubSectionTitle num="5.2" title="Barge's tanks" />
          <p className="mb-2 text-justify">
            The final sounding on the barge&apos;s tanks took place after the confirmation of transfer on <YellowVal>{safeStr(data.closing_barge_date)}</YellowVal> at <YellowVal>{safeStr(data.closing_barge_time_start)}</YellowVal> to <YellowVal>{safeStr(data.closing_barge_time_end)}</YellowVal> l/t being the following figures disclosed:
          </p>
          
        </div>
        <PdfFooter page={pageText(5)} />
      </PageShell>

      {/* PAGE 6 */}
      <PageShell pageNumber="6" pageLabel="Final figures">
        <PdfHeader />
        <div className="page-content">
          <RenderTankTable
            tanks={closeBargeTanks}
            totals={closeBargeTotals}
            tableLabel="AFTER RECEIVING"
            metadata={{
              draftFore: safeNum(data.draft_fore_barge_open),
              draftAft: safeNum(data.draft_aft_barge_open),
              list: safeNum(data.list_barge_open),
              trimCorr: true
            }}
          />
          
          <div className="w-[300px] mt-4 font-mono text-[12px] font-bold">
            <div className="flex justify-between">
              <span>Barge&apos;s inspector figures.....</span>
              <span>: <YellowVal>{formatNumber(safeNum(data.barge_inspector_figure_close))}</YellowVal> mt</span>
            </div>
            <div className="flex justify-between">
              <span>Surveyor&apos;s figures..............</span>
              <span>: <YellowVal>{formatNumber(safeNum(data.surveyor_figure_barge_close))}</YellowVal> mt</span>
            </div>
            <div className="flex justify-between">
              <span>Difference.........................</span>
              <span>: <YellowVal>{safeNum(data.difference_barge_close) > 0 ? '+' : ''}{formatNumber(safeNum(data.difference_barge_close))}</YellowVal> mt</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Flowmeter readings.............</span>
              <span>: <YellowVal>{safeStr(data.flowmeter_close).toUpperCase() || 'N/A'}</YellowVal></span>
            </div>
          </div>

          <SectionTitle num="6" title="Final figures" />
          <div className="font-mono text-[13px] mb-4">
            <div className="flex">
              <span className="w-48">BDN.............................:</span>
              <span><YellowVal>{formatNumber(safeNum(data.bdn_figure))}</YellowVal> mt (Barge&apos;s tanks)</span>
            </div>
            <div className="flex">
              <span className="w-48">Surveyor........................:</span>
              <span><YellowVal>{formatNumber(safeNum(data.surveyor_final_figure))}</YellowVal> mt (Ship´s tanks)</span>
            </div>
            <div className="flex">
              <span className="w-48">Difference......................:</span>
              <span>{safeNum(data.final_difference_mt) > 0 ? '+' : ''}<YellowVal>{formatNumber(safeNum(data.final_difference_mt))}</YellowVal> mt or <YellowVal>{formatNumber(safeNum(data.final_difference_pct), 3)}</YellowVal>%</span>
            </div>
          </div>

          {data.letter_of_protest ? (
            <p className="mb-4 text-justify editable-block">
              Due to the huge difference between the BDN and the quantities ascertained through to the vessel´s tanks the Master and the undersigned surveyor issued Letters of Protest against the suppliers.<br/><br/>
              {data.protest_description}
            </p>
          ) : (
             <p className="mb-4 editable-block">No Letters of Protest were issued.</p>
          )}

          {data.second_sounding_done && (
            <p className="mb-4 text-justify editable-block">
              Owing to the significant difference between BDN and vessel&apos;s figures a second sounding was carried out
              <YellowVal>{safeStr(data.second_sounding_date)}</YellowVal> from <YellowVal>{safeStr(data.second_sounding_time_range)}</YellowVal> and the difference observed after bunkering was confirmed.
            </p>
          )}

          <p className="font-bold text-[13px] mb-8">
            ROB after bunkering....................: <YellowVal>{formatNumber(safeNum(data.rob_after_bunkering))}</YellowVal> MT / Trim <YellowVal>{formatNumber(safeNum(data.rob_trim))}</YellowVal> m
          </p>

        </div>
        <PdfFooter page={pageText(6)} />
      </PageShell>

      {/* PAGES 7-N — Section 7: Photographic Report (vessel, barge, sampling) */}

      {/* 7.1 Vessel photos — 4 per page (2×2) */}
      {vesselPhotoChunks.length > 0 && vesselPhotoChunks.map((pagePhotos, pageIdx) => (
        <React.Fragment key={`vessel-${pageIdx}`}>
          <PageShell
            pageNumber={String((vesselPhotoStartPage ?? firstPhotoPage) + pageIdx)}
            pageLabel={pageIdx === 0 ? "7.1 Vessel's tanks" : "7.1 Vessel's tanks (cont.)"}
          >
            <PdfHeader />
            <div className="page-content">
              {pageIdx === 0 && (
                <>
                  <SectionTitle num="7" title="Photographic report" />
                  <SubSectionTitle num="7.1" title="Vessel's tanks – opening/closing soundings" />
                </>
              )}
              <div className="grid grid-cols-2 gap-2 mx-4">
                {pagePhotos.map(p => (
                  <div key={p.id} className="relative mb-2">
                    <img src={p.url} alt={p.caption || 'Vessel tank photo'} className="w-full h-52 object-cover" crossOrigin="anonymous" />
                    <div className="absolute top-1 right-1 bg-white p-[2px]">
                      <img src="/logo.png" alt="NAABSA" style={{ height: 'calc(var(--pdf-logo-h,24px)*0.6)' }} />
                    </div>
                    <div className="absolute bottom-0 w-full bg-black/60 text-white text-center py-1 text-[8px] uppercase">
                      {safeStr(data.vessel_name)} - {safeStr(data.port)} PORT - {p.caption}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <PdfFooter page={pageText((vesselPhotoStartPage ?? firstPhotoPage) + pageIdx)} />
          </PageShell>
        </React.Fragment>
      ))}

      {/* 7.2 Barge photos — 4 per page (2×2) */}
      {bargePhotoChunks.length > 0 && bargePhotoChunks.map((pagePhotos, pageIdx) => (
        <React.Fragment key={`barge-${pageIdx}`}>
          <PageShell
            pageNumber={String((bargePhotoStartPage ?? firstPhotoPage) + pageIdx)}
            pageLabel={pageIdx === 0 ? "7.2 Barge's tanks" : "7.2 Barge's tanks (cont.)"}
          >
            <PdfHeader />
            <div className="page-content">
              {pageIdx === 0 && vesselPhotoChunks.length === 0 && (
                <SectionTitle num="7" title="Photographic report" />
              )}
              {pageIdx === 0 && <SubSectionTitle num="7.2" title="Barge's tanks" />}
              <div className="grid grid-cols-2 gap-2 mx-4">
                {pagePhotos.map(p => (
                  <div key={p.id} className="relative mb-2">
                    <img src={p.url} alt={p.caption || 'Barge tank photo'} className="w-full h-52 object-cover" crossOrigin="anonymous" />
                    <div className="absolute top-1 right-1 bg-white p-[2px]">
                      <img src="/logo.png" alt="NAABSA" style={{ height: 'calc(var(--pdf-logo-h,24px)*0.6)' }} />
                    </div>
                    <div className="absolute bottom-0 w-full bg-black/60 text-white text-center py-1 text-[8px] uppercase">
                      {safeStr(data.vessel_name)} - {safeStr(data.port)} PORT - {p.caption}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <PdfFooter page={pageText((bargePhotoStartPage ?? firstPhotoPage) + pageIdx)} />
          </PageShell>
        </React.Fragment>
      ))}

      {/* 7.3 Sampling photos — 4 per page (2×2) */}
      {samplePhotoChunks.map((pagePhotos, pageIdx) => (
        <React.Fragment key={`sample-${pageIdx}`}>
          <PageShell
            pageNumber={String((samplePhotoStartPage ?? attachmentPageNumber) + pageIdx)}
            pageLabel={pageIdx === 0 ? '7.3 Sampling' : '7.3 Sampling (cont.)'}
          >
            <PdfHeader />
            <div className="page-content">
              {pageIdx === 0 && vesselPhotoChunks.length === 0 && bargePhotoChunks.length === 0 && (
                <SectionTitle num="7" title="Photographic report" />
              )}
              {pageIdx === 0 && <SubSectionTitle num="7.3" title="Sampling" />}
              <div className="grid grid-cols-2 gap-2 mx-4">
                {pagePhotos.map(p => (
                  <div key={p.id} className="relative mb-2">
                    <img src={p.url} alt={p.caption || 'Sampling photo'} className="w-full h-52 object-cover" crossOrigin="anonymous" />
                    <div className="absolute top-1 right-1 bg-white p-[2px]">
                      <img src="/logo.png" alt="NAABSA" style={{ height: 'calc(var(--pdf-logo-h,24px)*0.6)' }} />
                    </div>
                    <div className="absolute bottom-0 w-full bg-black/60 text-white text-center py-1 text-[8px] uppercase">
                      {safeStr(data.vessel_name)} - {safeStr(data.port)} PORT - {p.caption}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <PdfFooter page={pageText((samplePhotoStartPage ?? attachmentPageNumber) + pageIdx)} />
          </PageShell>
        </React.Fragment>
      ))}

      {/* Section 8: Attachment — always last page */}
      <PageShell pageNumber={String(attachmentPageNumber)} pageLabel="Attachments and stamp">
        <PdfHeader />
        <div className="page-content">
          {/* Show 7.3 placeholder if no sampling photos were uploaded */}
          {samplePhotos.length === 0 && (
            <>
              <SectionTitle num="7" title="Photographic report" />
              <SubSectionTitle num="7.3" title="Sampling" />
              <p className="text-gray-400 text-[11px] mb-8">No sampling photos uploaded.</p>
            </>
          )}

          <SectionTitle num="8" title="Attachments" />
          <ul className="list-none pl-6 space-y-1 mb-12 text-[12px]">
            {data.attachments?.filter(a => a.checked).map((a, i) => (
              <li key={i}>- {a.label}</li>
            ))}
            {(!data.attachments || data.attachments.filter(a => a.checked).length === 0) && (
              <li>- No attachments provided.</li>
            )}
          </ul>

          <div className="mt-8 relative">
            <div className="absolute right-10 bottom-0 w-32 h-32 rounded-full border-2 border-black/30 flex items-center justify-center opacity-70">
              <div className="text-center w-full h-full flex flex-col justify-center items-center rounded-full border border-black/20 transform -rotate-12 bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-black/10 p-2">
                <p className="font-bold text-gray-700 text-[10px] tracking-tighter w-full text-center leading-tight">
                  MARINE SURVEYORS & CONSULTANTS
                </p>
                <p className="font-black text-blue-900 text-lg my-1">NAABSA</p>
                <p className="text-[7px] text-gray-600 break-words text-center border-t border-gray-400 pt-1">
                  surveyors@naabsa.com.br
                </p>
              </div>
            </div>
          </div>
        </div>
        <PdfFooter page={pageText(attachmentPageNumber)} />
      </PageShell>

    </div>
  )
}
