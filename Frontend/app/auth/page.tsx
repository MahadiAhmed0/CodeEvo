'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Github, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false)
      router.push('/dashboard')
    }, 1000)
  }

  const handleOAuth = () => {
    setIsLoading(true)
    // Simulate oauth redirect
    setTimeout(() => {
      setIsLoading(false)
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col md:flex-row overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6c3bf5]/20 blur-[120px] rounded-full pointer-events-none md:hidden" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#c74cf0]/20 blur-[120px] rounded-full pointer-events-none md:hidden" />

      {/* Left side: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 z-10 relative">
        <Link href="/" className="absolute top-8 left-6 sm:left-12 lg:left-24 z-20 hover:opacity-80 transition-opacity">
          <div className="relative w-32 h-8">
            <Image src="/logo.png" alt="CodeEvo" fill className="object-contain object-left" priority />
          </div>
        </Link>

        <div className="w-full max-w-sm mx-auto mt-8">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-white/60 text-sm">
              {isLogin 
                ? 'Enter your credentials to access your workspace' 
                : 'Join CodeEvo to start building architectures visually'}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl flex mb-8">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                isLogin ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                !isLogin ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-8">
            <button 
              onClick={handleOAuth}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            <button 
              onClick={handleOAuth}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#24292e] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2c3137] transition-colors border border-white/10 disabled:opacity-50"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-white/[0.08] flex-1" />
            <span className="text-xs text-white/40 uppercase font-medium">Or continue with email</span>
            <div className="h-px bg-white/[0.08] flex-1" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLogin ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'}`}>
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-white/80">Full Name</label>
                <input 
                  id="name" 
                  type="text" 
                  required={!isLogin}
                  placeholder="John Doe"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/80">Email address</label>
              <input 
                id="email" 
                type="email" 
                required
                placeholder="john@example.com"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-white/80">Password</label>
                {isLogin && (
                  <Link href="#" className="text-xs text-[#c74cf0] hover:text-purple-400 transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLogin ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'}`}>
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">Confirm Password</label>
                <input 
                  id="confirmPassword" 
                  type="password" 
                  required={!isLogin}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 mt-1 font-medium bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{error}</p>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white px-4 py-3 rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(108,59,245,0.3)] transition-all duration-300 mt-6 disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center md:text-left">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white/80 transition-colors">
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to landing page
            </Link>
          </div>
        </div>
      </div>

      {/* Right side: Visual/Hero */}
      <div className="hidden md:flex flex-1 relative bg-[#06080d] border-l border-white/[0.06] items-center justify-center overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#6c3bf5]/20 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#c74cf0]/15 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Abstract Grid/Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="relative z-10 max-w-md text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(108,59,245,0.4)] mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="3.27 6.96 12 12.01 20.73 6.96" />
              <line strokeLinecap="round" strokeLinejoin="round" x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-4">Start designing your next big idea</h3>
          <p className="text-white/60 leading-relaxed">
            Join thousands of developers using CodeEvo to visualize, build, and deploy distributed architectures.
          </p>
        </div>
      </div>
    </div>
  )
}
