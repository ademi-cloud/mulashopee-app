import { checkoutUrl } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Paywall() {
  const { profile, refreshProfile } = useAuth()
  return (
    <div className="card paywall">
      <h2>Akses kursus belum aktif</h2>
      <p>
        Akaun <b>{profile?.email}</b> belum ada rekod pembayaran. Selesaikan pembayaran menggunakan
        <b> email yang sama</b>, dan akses akan dibuka secara automatik.
      </p>
      <div className="row">
        <a className="btn btn-primary" href={checkoutUrl}>Beli kursus Mula Shopee</a>
        <button className="btn btn-outline" onClick={() => void refreshProfile()}>Saya dah bayar, semak semula</button>
      </div>
    </div>
  )
}
