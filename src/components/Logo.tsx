import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo">
      <span className="logo-dots"><i /><i /></span>
      MULA <b>SHOPEE</b>
    </Link>
  )
}
