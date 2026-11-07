import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { checkoutUrl } from '../lib/supabase'

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
        <div className="card price-card">
          <div>
            <h2>Satu bayaran, akses penuh</h2>
            <ul className="checklist">
              {perks.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
          <div className="price-box">
            <span className="muted">Harga pelancaran</span>
            <strong className="price">RM97</strong>
            <a className="btn btn-primary btn-lg" href={checkoutUrl}>Beli sekarang</a>
            <small className="muted">Guna email yang sama semasa bayar dan daftar akaun.</small>
          </div>
        </div>
      </section>

      <footer className="container footer muted">© {new Date().getFullYear()} Mula Shopee</footer>
    </div>
  )
}
