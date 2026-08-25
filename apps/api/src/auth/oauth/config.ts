export type ProviderConfig = {
  authorizeUrl: string
  tokenUrl: string
  userinfoUrl: string | null
  scope: string
  tokenMethod: 'GET' | 'POST'
  tokenFields?: Record<string, string>
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    tokenMethod: 'POST',
    tokenFields: {
      client_id: '{{CLIENT_ID}}',
      client_secret: '{{CLIENT_SECRET}}',
      grant_type: 'authorization_code',
      code: '{{CODE}}',
      redirect_uri: '{{REDIRECT_URI}}',
    },
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    userinfoUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    scope: 'email public_profile',
    tokenMethod: 'GET',
    tokenFields: {
      client_id: '{{CLIENT_ID}}',
      client_secret: '{{CLIENT_SECRET}}',
      redirect_uri: '{{REDIRECT_URI}}',
      code: '{{CODE}}',
    },
  },
  linkedin: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userinfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scope: 'openid profile email',
    tokenMethod: 'POST',
    tokenFields: {
      client_id: '{{CLIENT_ID}}',
      client_secret: '{{CLIENT_SECRET}}',
      redirect_uri: '{{REDIRECT_URI}}',
      code: '{{CODE}}',
      grant_type: 'authorization_code',
    },
  },
}

export const buildAuthorizeUrl = (
  provider: string,
  clientId: string,
  redirectUri: string,
  state: string,
): string => {
  const cfg = PROVIDER_CONFIGS[provider]
  if (!cfg) throw new Error(`Unknown provider: ${provider}`)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    state,
  })
  return `${cfg.authorizeUrl}?${params.toString()}`
}

export const fetchToken = async (
  provider: string,
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in?: number; refresh_token?: string }> => {
  const cfg = PROVIDER_CONFIGS[provider]
  if (!cfg) throw new Error(`Unknown provider: ${provider}`)

  const fields: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    ...(cfg.tokenFields ?? {}),
  }

  const method: 'GET' | 'POST' = cfg.tokenMethod
  const url = cfg.tokenUrl

  const headers: Record<string, string> = {}
  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const body = method === 'POST' ? new URLSearchParams(fields).toString() : undefined

  const init: RequestInit = {
    method,
    ...(body ? { body } : {}),
    headers,
  }

  const resp = await fetch(url, init)
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`OAuth token exchange failed for ${provider}: ${resp.status} ${txt}`)
  }
  return (await resp.json()) as { access_token: string; expires_in?: number; refresh_token?: string }
}

export const fetchProfile = async (
  provider: string,
  accessToken: string,
): Promise<{ providerId: string; email?: string; name?: string; avatar?: string }> => {
  const cfg = PROVIDER_CONFIGS[provider]
  if (!cfg) throw new Error(`Unknown provider: ${provider}`)

  if (!cfg.userinfoUrl) throw new Error(`No userinfo URL for ${provider}`)

  const resp = await fetch(cfg.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`OAuth profile fetch failed for ${provider}: ${resp.status} ${txt}`)
  }
  const data = (await resp.json()) as Record<string, any>
  return normalizeProfile(provider, data)
}

const normalizeProfile = (
  provider: string,
  body: Record<string, any>,
): { providerId: string; email?: string; name?: string; avatar?: string } => {
  switch (provider) {
    case 'google': {
      const { email, name, picture, sub } = body
      return {
        providerId: sub ?? undefined,
        email: email ?? undefined,
        name: name ?? undefined,
        avatar: picture ?? undefined,
      }
    }
    case 'facebook': {
      const { id, name, email } = body
      return {
        providerId: id ?? undefined,
        email: email ?? undefined,
        name: name ?? undefined,
        avatar: `https://graph.facebook.com/${id}/picture?width=200`,
      }
    }
    case 'linkedin': {
      const { sub, localizedFirstName, localizedLastName, email, picture } = body
      return {
        providerId: sub ?? undefined,
        email: email ?? undefined,
        name: [
          localizedFirstName ?? undefined,
          localizedLastName ?? undefined,
        ]
          .filter(Boolean)
          .join(' ') ?? undefined,
        avatar:
          picture?.identifier?.imageUri?.url ?? undefined,
      }
    }
    default:
      return { providerId: '' }
  }
}