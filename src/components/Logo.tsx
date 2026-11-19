import { Link } from 'react-router-dom'

export default function Logo({ to = '/', height = 40 }: { to?: string; height?: number }) {
  return (
    <Link to={to} className="logo" aria-label="Mula Shopee">
      <img src="/logo-mulashopee.png" alt="Mula Shopee" height={height} style={{ height, width: 'auto' }} />
    </Link>
  )
}
