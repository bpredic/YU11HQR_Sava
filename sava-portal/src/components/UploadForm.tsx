'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/components/TranslationsProvider'
import { Spinner } from '@/components/ui/spinner'

type UploadResult = {
  logFileId: number
  filename: string
  fileType: string
  totalQsos: number
  newQsos: number
  duplicateQsos: number
  firstQsoAt: string
  lastQsoAt: string
  parseErrors: string[]
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const t = useT()

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/activator/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? t.upload.uploadFailed)
        return
      }

      setResult(data)
      toast.success(t.upload.uploadedSuccess(data.newQsos))
      router.refresh()
    } catch {
      setUploadError(t.upload.networkError)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">{t.upload.clickToSelect}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.upload.supported}</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".log,.adi,.adif"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {uploadError && (
              <Alert variant="destructive" className="text-sm">{uploadError}</Alert>
            )}

            <Button type="submit" className="w-full" disabled={!file || uploading}>
              {uploading && <Spinner className="mr-2 h-4 w-4" />}
              {uploading ? t.upload.uploading : t.upload.uploadLogFile}
            </Button>

            {uploading && (
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full origin-left animate-[indeterminate_1.4s_ease-in-out_infinite]" />
                </div>
                <p className="text-xs text-muted-foreground text-center">{t.upload.processingHint}</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline">{result.fileType.toUpperCase()}</Badge>
              <span className="text-sm font-mono">{result.filename}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-2xl font-bold">{result.totalQsos}</div>
                <div className="text-xs text-muted-foreground">{t.upload.totalQsos}</div>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{result.newQsos}</div>
                <div className="text-xs text-muted-foreground">{t.upload.newAdded}</div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{result.duplicateQsos}</div>
                <div className="text-xs text-muted-foreground">{t.upload.duplicates}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t.upload.firstQso}: </span>
                <span className="font-mono">{new Date(result.firstQsoAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t.upload.lastQso}: </span>
                <span className="font-mono">{new Date(result.lastQsoAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
