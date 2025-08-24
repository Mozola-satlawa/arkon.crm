import { useState } from 'react'

async function fileToBase64(file) {
  const buf = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export default function FileUploader({ clientId, dealId }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [lastDoc, setLastDoc] = useState(null)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) return
    setBusy(true)
    setError('')

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dealId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const doc = await res.json()
      setLastDoc(doc)
      setFile(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload() {
    if (!lastDoc?.storage_key) return
    const r = await fetch('/.netlify/functions/get-file-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: lastDoc.storage_key })
    })
    const { url } = await r.json()
    window.open(url, '_blank')
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h4>Upload dokumentu</h4>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={!file || busy} style={{ marginLeft: 8 }}>
        {busy ? 'Wgrywam…' : 'Wyślij'}
      </button>
      {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
      {lastDoc && (
        <div style={{ marginTop: 12 }}>
          Zapisano: <strong>{lastDoc.filename}</strong>{' '}
          <button onClick={handleDownload}>Pobierz</button>
        </div>
      )}
    </div>
  )
}