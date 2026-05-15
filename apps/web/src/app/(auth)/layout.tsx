import { Layers } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <Layers size={13} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-[15px] font-semibold text-strong tracking-tight">ERPFlow</span>
      </div>
      {children}
    </div>
  )
}
