import process from 'node:process'

const account = process.env.CLOUDFLARE_ACCOUNT_ID
const token = process.env.CLOUDFLARE_API_TOKEN
const zone = process.env.CLOUDFLARE_ZONE_ID
const pr = process.env.AST_PR_NUMBER
const mode = process.argv[2]

if (!account || !token || !['deploy', 'cleanup'].includes(mode))
  throw new Error('Missing Cloudflare configuration')
if (pr && !/^\d+$/.test(pr))
  throw new Error('Invalid PR number')
if (mode === 'cleanup' && !pr)
  throw new Error('Production deletion is forbidden')

const service = pr ? `ast-pr-${pr}` : 'ast-explorer'
const hostname = pr ? `pr${pr}-dev.ast.migos.club` : 'ast.migos.club'
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`

async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json()
  if (!response.ok || !data.success)
    throw new Error(`${method} ${path}: ${JSON.stringify(data.errors)}`)
  return data.result
}

const domains = await request('/workers/domains')
const existing = domains.find((item) => item.hostname === hostname)

if (mode === 'deploy') {
  if (!existing || existing.service !== service) {
    if (!zone)
      throw new Error('CLOUDFLARE_ZONE_ID required to attach domain')
    await request('/workers/domains', 'PUT', {
      hostname,
      service,
      zone_id: zone,
    })
  }
  console.log(`Deployed: https://${hostname}`)
} else {
  if (existing)
    await request(`/workers/domains/${existing.id}`, 'DELETE')
  await request(`/workers/scripts/${service}`, 'DELETE')
  console.log(`Removed preview: ${hostname}`)
}
