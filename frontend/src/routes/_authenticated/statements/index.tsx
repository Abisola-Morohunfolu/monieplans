import { createFileRoute } from '@tanstack/react-router'
import { FileText, Download, FileJson } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/statements/')({
  component: StatementsPage,
})

function StatementsPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Statements</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Export and analyze your financial reports.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card flex flex-col items-center justify-center py-12 text-center hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Download className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Export PDF Report</h3>
          <p className="text-slate-500 max-w-sm">Generate a comprehensive PDF statement for your active budget period.</p>
        </div>
        
        <div className="glass-card flex flex-col items-center justify-center py-12 text-center hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileJson className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Export CSV Data</h3>
          <p className="text-slate-500 max-w-sm">Download your transactions in CSV format for use in spreadsheet software.</p>
        </div>
      </div>
      
      <div className="glass-card">
        <h3 className="text-xl font-bold mb-6">Past Statements</h3>
        <div className="text-slate-500 flex flex-col items-center justify-center py-8 text-center">
           <FileText className="w-12 h-12 mb-4 opacity-50" />
           <p>No previous statements generated.</p>
        </div>
      </div>
    </div>
  )
}
