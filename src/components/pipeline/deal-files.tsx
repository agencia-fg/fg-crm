'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Paperclip, Upload, Trash2, FileText, FileImage, File, Loader2 } from 'lucide-react'

interface DealFile {
  id: string
  name: string
  size: number
  path: string
  created_at: string
  url: string
}

interface DealFilesProps {
  dealId: string
  tenantId: string
  initialFiles: DealFile[]
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext ?? '')) return <FileImage className="w-4 h-4 text-blue-400" />
  if (['pdf'].includes(ext ?? '')) return <FileText className="w-4 h-4 text-red-400" />
  return <File className="w-4 h-4 text-gray-400" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function DealFiles({ dealId, tenantId, initialFiles }: DealFilesProps) {
  const [files, setFiles] = useState(initialFiles)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo máximo: 10 MB'); return }

    setUploading(true)
    const path = `${tenantId}/${dealId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('deal-files')
      .upload(path, file)

    if (uploadError) {
      toast.error('Erro ao enviar arquivo')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('deal-files').getPublicUrl(path)

    const { data: record, error: dbError } = await supabase
      .from('deal_files')
      .insert({
        tenant_id: tenantId,
        deal_id: dealId,
        name: file.name,
        size: file.size,
        path,
        url: urlData.publicUrl,
      })
      .select()
      .single()

    if (dbError) {
      toast.error('Erro ao salvar referência do arquivo')
      setUploading(false)
      return
    }

    setFiles(prev => [...prev, { ...record, url: urlData.publicUrl }])
    toast.success('Arquivo enviado!')
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(file: DealFile) {
    await supabase.storage.from('deal-files').remove([file.path])
    await supabase.from('deal_files').delete().eq('id', file.id)
    setFiles(prev => prev.filter(f => f.id !== file.id))
    toast.success('Arquivo removido')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Arquivos
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.txt" />
      </div>

      {files.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
        >
          <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Clique para enviar um arquivo</p>
          <p className="text-xs text-gray-300 mt-0.5">PDF, Word, Excel, imagens — até 10MB</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
              {fileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <a href={file.url} target="_blank" rel="noreferrer"
                  className="text-sm font-medium text-gray-800 hover:text-indigo-600 truncate block transition-colors">
                  {file.name}
                </a>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => handleDelete(file)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 disabled:opacity-50 pt-1 transition-colors"
          >
            <Upload className="w-3 h-3" />
            Adicionar outro arquivo
          </button>
        </div>
      )}
    </div>
  )
}
