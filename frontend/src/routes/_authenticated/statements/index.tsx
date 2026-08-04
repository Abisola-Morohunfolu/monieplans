import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { FileText, Download, Upload, FileJson } from 'lucide-react'
import { useStatements, useUploadStatement } from '../../../hooks/useStatements'

export const Route = createFileRoute('/_authenticated/statements/')({
  component: StatementsPage,
})

function StatementsPage() {
  const { data: statements, isLoading } = useStatements()
  const uploadStatement = useUploadStatement()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadStatement.mutateAsync(file)
    } catch {
      // handle error
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Statements</h2>
          <p className="text-text-secondary mt-1">Import bank statements and generate reports.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="card flex flex-col items-center justify-center py-12 text-center cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-sage/20 text-forest rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">
            {uploading ? 'Uploading...' : 'Upload Bank Statement'}
          </h3>
          <p className="text-text-secondary max-w-sm">Import your bank CSV to auto-categorize and track transactions.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="card flex flex-col items-center justify-center py-12 text-center group">
          <div className="w-16 h-16 bg-sage/20 text-forest rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileJson className="w-8 h-8" />
          </div>
          <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">Export CSV Data</h3>
          <p className="text-text-secondary max-w-sm">Download your transactions in CSV format for use in spreadsheet software.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-heading text-xl font-semibold mb-6 text-text-primary">Past Statements</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-text-secondary">Loading...</p>
          </div>
        ) : !statements || statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="w-12 h-12 mb-4 text-sage/50" />
            <p className="text-text-secondary">No previous statements generated.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <div key={stmt.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-text-primary/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-forest">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">{stmt.fileName}</p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(stmt.createdAt).toLocaleDateString()} - {stmt.transactionCount} transactions
                    </p>
                  </div>
                </div>
                <span className="badge-sage">{stmt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
