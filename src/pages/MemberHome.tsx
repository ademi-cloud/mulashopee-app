import { Link } from 'react-router-dom'
import Paywall from '../components/Paywall'
import { useAuth } from '../lib/auth'
import { greeting, longDate } from '../lib/format'

export default function MemberHome() {
  const { profile } = useAuth()
  const name = profile?.full_name || profile?.email?.split('@')[0] || ''
  const hasAccess = profile?.is_member || profile?.is_admin

  return (
    <>
      <h1 className="page-title">{greeting()}, {name}</h1>
      <p className="muted">{longDate()} · selamat datang ke Ruang Ahli Mula Shopee.</p>
      {hasAccess ? (
        <div className="grid-2 mt">
          <Link to="/ahli/video" className="card card-link">
            <h3>Video</h3>
            <p className="muted">Tonton modul ikut turutan, dari buka kedai hingga Shopee Ads.</p>
          </Link>
          <Link to="/ahli/ebook" className="card card-link">
            <h3>Ebook & Template</h3>
            <p className="muted">Senarai semak, template dan kalkulator untung.</p>
          </Link>
        </div>
      ) : (
        <div className="mt"><Paywall /></div>
      )}
    </>
  )
}
