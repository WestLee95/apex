import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Toaster } from 'react-hot-toast'

export const Layout = () => (
  <div className="min-h-screen bg-[#06060f] bg-grid-dark">
    <Sidebar />
    <main className="pl-16 lg:pl-60 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <Outlet />
      </div>
    </main>
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#0d0d1f',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          fontSize: '13px',
          fontFamily: 'DM Sans, sans-serif',
        },
        success: { iconTheme: { primary: '#d4a843', secondary: '#000' } },
      }}
    />
  </div>
)
