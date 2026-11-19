const rm = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatRM = (n: number) => `RM${rm.format(Number(n) || 0)}`

/** Peratus perubahan; null bila tiada asas perbandingan. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Selamat pagi'
  if (h < 15) return 'Selamat tengah hari'
  if (h < 19) return 'Selamat petang'
  return 'Selamat malam'
}

export const longDate = (date = new Date()) =>
  date.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
