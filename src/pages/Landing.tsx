import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { checkoutUrl, coachingUrl, serviceUrl } from '../lib/supabase'

const modules = [
  { n: '01', title: 'Buka Kedai', text: 'Daftar Shopee Seller, setting kedai, shipping dan bank dengan betul dari hari pertama.' },
  { n: '02', title: 'Produk & SEO', text: 'Gambar, tajuk, variasi dan harga yang buat produk mudah dijumpai dan dibeli.' },
  { n: '03', title: 'Trafik', text: 'Shopee Ads bajet kecil, Shopee Live dan Video untuk jualan berterusan.' },
  { n: '04', title: 'Untung Sebenar', text: 'Kira komisen, fi transaksi dan kos supaya setiap jualan betul-betul untung.' },
]

const perks = [
  'Video langkah demi langkah',
  'Ebook & template siap guna',
  'Kalkulator untung & fi Shopee',
  'Akses seumur hidup + kemas kini',
]

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav container">
        <Logo />
        <Link to="/login" className="btn btn-outline btn-sm">Log masuk ahli</Link>
      </header>

      <section className="hero container">
        <span className="pill">Kursus Shopee untuk pemula</span>
        <h1>Mula jual di Shopee <span className="accent">dari kosong</span>, dengan langkah yang jelas.</h1>
        <p className="lead">
          Mula Shopee ialah ruang belajar lengkap: video, ebook dan template untuk buka kedai,
          dapat jualan pertama, dan kekal untung.
        </p>
        <div className="row">
          <a className="btn btn-primary btn-lg" href={checkoutUrl}>Sertai sekarang</a>
          <a className="btn btn-outline btn-lg" href="#modul">Lihat modul</a>
        </div>
      </section>

      <section id="modul" className="container section">
        <h2>Apa yang awak akan belajar</h2>
        <div className="grid-4">
          {modules.map((m) => (
            <div key={m.n} className="card">
              <span className="muted mono">{m.n}</span>
              <h3>{m.title}</h3>
              <p className="muted">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="harga" className="container section">
        <h2>Pilih cara awak nak mula</h2>
        <p className="muted section-lead">Tiga peringkat: belajar sendiri, kami bimbing, atau kami uruskan untuk awak.</p>
        <div className="grid-3">
          <div className="card offer offer-main">
            <span className="tier">Do it yourself</span>
            <h3>Shopee AI Toolkit</h3>
            <span className="pill">Super Early Bird · tempat terhad</span>
            <strong className="price">RM17 <s className="price-sub">RM97</s></strong>
            <small className="muted">Early Bird RM47 · Harga biasa RM97</small>
            <ul className="checklist">
              {perks.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <a className="btn btn-primary" href={checkoutUrl}>Beli sekarang</a>
            <small className="muted">Guna email yang sama semasa bayar dan daftar akaun.</small>
          </div>
          <div className="card offer">
            <span className="tier">Done with you</span>
            <h3>Personal Coaching</h3>
            <strong className="price">RM2,000 <span className="price-sub">/ RM5,000</span></strong>
            <ul className="checklist">
              <li>Personal Coaching — RM2,000</li>
              <li>Group Coaching — RM5,000</li>
              <li>Semakan kedai & pelan tindakan</li>
              <li>Termasuk akses Shopee AI Toolkit</li>
            </ul>
            <a className="btn btn-outline" href={coachingUrl}>Bayar & daftar coaching</a>
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
