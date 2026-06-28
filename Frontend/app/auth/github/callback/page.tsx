'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { githubAuthApi } from '@/lib/api'
import { useGitHubStore } from '@/lib/github-store'
import { Loader2 } from 'lucide-react'

function GitHubCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setConnected } = useGitHubStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received from GitHub.')
      return
    }

    githubAuthApi.handleCallback(code)
      .then((result) => {
        return githubAuthApi.storeToken(result.accessToken, result.githubId, result.githubLogin, result.githubAvatar)
          .then(() => {
            setConnected(true, { login: result.githubLogin, avatarUrl: result.githubAvatar, id: result.githubId, profileUrl: `https://github.com/${result.githubLogin}` }, result.accessToken)
            router.replace(result.redirect || '/dashboard')
          })
      })
      .catch((err) => {
        setError(err.message || 'GitHub OAuth failed.')
      })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/auth')} className="text-purple-400 hover:text-purple-300">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <p>Connecting GitHub account...</p>
      </div>
    </div>
  )
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>}>
      <GitHubCallbackContent />
    </Suspense>
  )
}
