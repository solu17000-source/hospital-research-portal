'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Download, Printer, Search, RefreshCw, Plus, Camera, CheckCircle, Copy, Share2 } from 'lucide-react'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import { DEMO_RESEARCH } from '@/lib/demo-data'
import { cn, truncate } from '@/lib/utils'
import Link from 'next/link'

export default function QRCodesPage() {
  const [selected, setSelected] = useState(DEMO_RESEARCH[0])
  const [search, setSearch] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const filtered = DEMO_RESEARCH.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.research_id.toLowerCase().includes(search.toLowerCase())
  )

  const qrData = `${typeof window !== 'undefined' ? window.location.origin : 'https://pmnh-research.gov.sa'}/research/${selected?.id}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrData)
    setCopied(true)
    toast.success('QR link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QR-${selected?.research_id}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('QR code downloaded!')
  }

  const handleDemoScan = () => {
    const randomResearch = DEMO_RESEARCH[Math.floor(Math.random() * DEMO_RESEARCH.length)]
    setScanResult(randomResearch.research_id)
    toast.success(`QR Code scanned: ${randomResearch.research_id}`)
    setTimeout(() => setScanResult(''), 5000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">QR Code & Barcode Management</h1>
          <p className="page-subtitle">Generate, manage and scan QR codes for research registration</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setScanMode(!scanMode)}
            className={cn('btn-secondary text-sm', scanMode && 'bg-blue-50 border-blue-300 text-blue-700')}>
            <Camera className="w-4 h-4" />
            {scanMode ? 'Close Scanner' : 'Scan QR Code'}
          </button>
          <Link href="/research/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            New Research + QR
          </Link>
        </div>
      </div>

      {/* QR Scanner Panel */}
      {scanMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="premium-card p-6"
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            QR Code Scanner
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-2xl h-64 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 border-2 border-white/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
                  <motion.div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"
                    animate={{ y: [0, 150, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                </div>
              </div>
              <p className="text-white/50 text-sm absolute bottom-4 left-0 right-0 text-center">
                Point camera at QR code
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Scanner Instructions</p>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span> Allow camera permissions when prompted</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span> Point camera at the research QR code</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span> The research form will open automatically</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span> Fill in data and submit — saves directly to database</li>
                </ol>
              </div>

              {scanResult && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-700">QR Code Detected!</p>
                    <p className="text-xs text-green-600">{scanResult}</p>
                  </div>
                </div>
              )}

              <button onClick={handleDemoScan} className="btn-primary w-full">
                <Camera className="w-4 h-4" />
                Simulate QR Scan (Demo)
              </button>
              <p className="text-xs text-gray-400 text-center">
                In production, the camera will activate automatically for real QR code scanning
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Research list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="premium-card p-4">
            <p className="font-bold text-gray-900 mb-3">Research Projects</p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search research..."
                className="form-input pl-9 text-sm" />
            </div>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {filtered.map(r => (
                <button key={r.id} onClick={() => setSelected(r)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    selected?.id === r.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  )}>
                  <p className="font-mono text-xs font-bold text-blue-600">{r.research_id}</p>
                  <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{r.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* QR Code display */}
        <div className="lg:col-span-2">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="premium-card p-6"
            >
              <div className="text-center mb-6">
                <h2 className="font-bold text-gray-900 text-lg">{selected.research_id}</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto line-clamp-2">{selected.title}</p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div ref={qrRef} className="p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
                  <QRCode
                    value={qrData}
                    size={220}
                    level="H"
                  />
                </div>
              </div>

              {/* QR data info */}
              <div className="bg-gray-50 rounded-xl p-3 mb-5 text-center">
                <p className="text-xs text-gray-500 mb-1">QR Code Data</p>
                <p className="font-mono text-xs text-gray-700 break-all">{qrData}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Scans', value: Math.floor(Math.random() * 50) + 5 },
                  { label: 'This Week', value: Math.floor(Math.random() * 10) + 1 },
                  { label: 'Submissions', value: Math.floor(Math.random() * 5) },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-xl font-bold text-blue-700">{s.value}</p>
                    <p className="text-xs text-blue-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={handleDownloadQR} className="btn-secondary text-sm">
                  <Download className="w-4 h-4" />
                  Download SVG
                </button>
                <button onClick={() => window.print()} className="btn-secondary text-sm">
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button onClick={handleCopy} className={cn('btn-secondary text-sm', copied && 'bg-green-50 border-green-300 text-green-700')}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button className="btn-secondary text-sm">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button onClick={() => toast.success('QR code regenerated!')} className="btn-secondary text-sm">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Scanning this QR code will open the research submission form for <strong>{selected.research_id}</strong>
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* QR Scan logs table */}
      <div className="premium-card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Recent QR Code Scans</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Research ID</th>
              <th>Scanned By</th>
              <th>Device</th>
              <th>Action</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'PMNH-2024-0001', by: 'Sara Al-Malki', device: 'iPhone 14', action: 'Opened Registration Form', time: '2h ago' },
              { id: 'PMNH-2024-0002', by: 'Dr. Khalid Al-Ghamdi', device: 'Samsung S24', action: 'Viewed Project', time: '5h ago' },
              { id: 'PMNH-2025-0005', by: 'Anonymous', device: 'iPad Air', action: 'Opened Registration Form', time: '1d ago' },
              { id: 'PMNH-2026-0008', by: 'Dr. Ibrahim Al-Dosari', device: 'Laptop Chrome', action: 'Submitted New Data', time: '2d ago' },
            ].map((log, i) => (
              <tr key={i}>
                <td><span className="font-mono text-xs font-bold text-blue-600">{log.id}</span></td>
                <td><span className="text-sm text-gray-700">{log.by}</span></td>
                <td><span className="text-xs text-gray-500">{log.device}</span></td>
                <td><span className="text-xs text-gray-700">{log.action}</span></td>
                <td><span className="text-xs text-gray-400">{log.time}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
