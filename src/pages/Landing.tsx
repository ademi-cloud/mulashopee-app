import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { checkoutUrl, coachingUrl, serviceUrl } from '../lib/supabase'

const freeItems = [
  { icon: '📘', title: 'Ebook mula jual', text: 'Senarai semak buka kedai, setting wajib dan upload produk pertama.' },
  { icon: '▶', title: 'Video langkah demi langkah', text: 'Dari daftar Shopee Seller hingga dapat jualan pertama.' },
  { icon: '📣', title: 'Cara guna marketing tools', text: 'Voucher, Shopee Ads asas, Live dan Video — cara guna yang betul.' },
]

const upgrades = [
  { title: 'Shopee AI Toolkit', text: 'Prompt, template dan tools AI untuk percepatkan kerja kedai.', price: 'RM17', was: 'RM97', note: 'Super Early Bird · tempat terhad', href: checkoutUrl },
  { title: 'Rakaman Shopee Ads Advanced', text: 'Kuasai Shopee GMV Max: rakaman penuh + bonus.', price: 'RM59', href: 'https://mulashopee.bcl.my/form/rakaman-kuasai-shopee-gmv-max' },
  { title: 'Rakaman Affiliate Marketing Advanced', text: 'Strategi Shopee Affiliate tahap lanjutan.', price: null, href: null },
]

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav container">
        <Logo />
        <Link to="/login" className="btn btn-outline btn-sm">Log masuk ahli</Link>
      </header>

      <section className="hero container">
        <span className="pill">Percuma untuk penjual baru Shopee</span>
        <h1>Mula jual di Shopee <span className="accent">percuma</span>, dengan langkah yang jelas.</h1>
        <p className="lead">
          Ebook, video dan panduan marketing tools untuk buka kedai dan dapat jualan pertama.
          Tiada caj. Daftar dan terus mula belajar.
        </p>
        <div className="row">
          <Link className="btn btn-primary btn-lg" to="/login?daftar=1">Daftar percuma</Link>
          <a className="btn btn-outline btn-lg" href="#percuma">Apa yang percuma?</a>
        </div>
      </section>

      <section id="percuma" className="container section">
        <h2>Percuma — tiada apa-apa caj</h2>
        <div className="grid-3">
          {freeItems.map((f) => (
            <div key={f.title} className="card">
              <span className="list-icon">{f.icon}</span>
              <h3 className="mt-sm">{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="row mt">
          <Link className="btn btn-primary" to="/login?daftar=1">Daftar & akses sekarang</Link>
        </div>
      </section>

      <section id="upgrade" className="container section">
        <h2>Upgrade bila awak dah bersedia</h2>
        <p className="muted section-lead">Bayar hanya untuk skill yang awak perlukan. Sekali bayar, akses seumur hidup.</p>
        <div className="grid-3">
          {upgrades.map((u) => (
            <div key={u.title} className="card offer">
              <h3>{u.title}</h3>
              {u.note && <span className="pill">{u.note}</span>}
              {u.price ? (
                <strong className="price">{u.price} {u.was && <s className="price-sub">{u.was}</s>}</strong>
              ) : (
                <strong className="price price-text">Akan datang</strong>
              )}
              <p className="muted">{u.text}</p>
              {u.href ? (
                <a className="btn btn-primary" href={u.href}>Dapatkan</a>
              ) : (
                <span className="btn btn-outline" aria-disabled>Akan datang</span>
              )}
            </div>
          ))}
        </div>
        <p className="muted mt-sm">Guna email yang sama semasa bayar dan daftar akaun — akses dibuka secara automatik.</p>
      </section>

      <section id="harga" className="container section">
        <h2>Perlukan bantuan lebih?</h2>
        <p className="muted section-lead">Tiga peringkat: belajar sendiri, kami bimbing, atau kami uruskan untuk awak.</p>
        <div className="grid-3">
          <div className="card offer">
            <span className="tier">Do it yourself</span>
            <h3>Belajar sendiri</h3>
            <strong className="price price-text">Percuma + upgrade</strong>
            <ul className="checklist">
              <li>Ebook & video mula jual — percuma</li>
              <li>Cara guna marketing tools — percuma</li>
              <li>Rakaman advanced & AI Toolkit — berbayar</li>
            </ul>
            <Link className="btn btn-outline" to="/login?daftar=1">Daftar percuma</Link>
          </div>
          <div className="card offer offer-main">
            <span className="tier">Done with you</span>
            <h3>Personal Coaching</h3>
            <strong className="price">RM2,000 <span className="price-sub">/ RM5,000</span></strong>
            <ul className="checklist">
              <li>Personal Coaching — RM2,000</li>
              <li>Group Coaching — RM5,000</li>
              <li>Semakan kedai & pelan tindakan</li>
              <li>Termasuk semua kandungan berbayar</li>
            </ul>
            <a className="btn btn-primary" href={coachingUrl}>Bayar & daftar coaching</a>
          </div>
          <div className="card offer">
            <span className="tier">Done for you</span>
            <h3>Service Marketing Shopee</h3>
            <strong className="price">2%–5% <span className="price-sub">daripada jualan</span></strong>
            <ul className="checklist">
              <li>Kami urus marketing & iklan kedai Shopee awak</li>
              <li>Isi borang percuma dengan maklumat kedai</li>
              <li>Kami hubungi untuk bincang & cadangkan kadar</li>
            </ul>
            <a className="btn btn-outline" href={serviceUrl}>Tempah perbincangan percuma</a>
          </div>
        </div>
      </section>

      <footer className="container footer muted">© {new Date().getFullYear()} Mula Shopee</footer>
    </div>
  )
}
