// Where is this visitor?
//
// Vercel attaches geo headers to every request at the edge, so we can tell a
// visitor outside Karnataka that we don't serve them yet WITHOUT asking for
// location permission and without handing their IP to a third-party lookup.
//
// Fails open: if the headers are missing (local dev, an odd proxy), the visitor
// is treated as served. Never block a real customer over a missing header.
export default function handler(req, res) {
  const country = String(req.headers['x-vercel-ip-country'] || '').toUpperCase()
  const region  = String(req.headers['x-vercel-ip-country-region'] || '').toUpperCase()
  let city = ''
  try { city = decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')) } catch { city = '' }

  const known  = Boolean(country)
  // IN-KA is Karnataka.
  const served = !known || (country === 'IN' && region === 'KA')

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ country, region, city, known, served })
}
