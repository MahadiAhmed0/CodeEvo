import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Code2, GitMerge, Workflow } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden flex flex-col">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-[#6c3bf5]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#c74cf0]/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="relative w-32 h-8">
            <Image 
              src="/logo.png" 
              alt="CodeEvo" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/auth" 
            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/auth" 
            className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 mt-20 mb-32 max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
          <span className="flex h-2 w-2 rounded-full bg-[#6c3bf5]" />
          <span className="text-xs font-medium text-white/80">CodeEvo v1.0 is here</span>
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8">
          Build architectures at <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0]">
            the speed of thought
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
          Visual system modeling, AI-powered code generation, and seamless Git integration for distributed system architecture.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/auth" 
            className="flex items-center gap-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white px-8 py-4 rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(108,59,245,0.4)] transition-all duration-300"
          >
            Start Building Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/[0.08] transition-all duration-300"
          >
            View Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-3 gap-6 w-full mt-32 text-left">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors">
            <div className="w-12 h-12 rounded-lg bg-[#6c3bf5]/20 flex items-center justify-center mb-4 text-[#6c3bf5]">
              <Workflow className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Visual Modeling</h3>
            <p className="text-white/50 text-sm leading-relaxed">Design your system architecture visually with our drag-and-drop canvas.</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors">
            <div className="w-12 h-12 rounded-lg bg-[#c74cf0]/20 flex items-center justify-center mb-4 text-[#c74cf0]">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Generation</h3>
            <p className="text-white/50 text-sm leading-relaxed">Instantly generate boilerplate and boilerplate for your visually designed nodes.</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <GitMerge className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Git Integration</h3>
            <p className="text-white/50 text-sm leading-relaxed">Commit, push, and sync your architecture directly to your repositories.</p>
          </div>
        </div>
      </main>
    </div>
  )
}