'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Save,
  Key,
  Mail,
  Smartphone,
  Lock,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'profile'
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e1a] text-white">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-white/60">Manage your account preferences and settings.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-12 lg:gap-16">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 shrink-0">
              <nav className="flex flex-col gap-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === section.id
                        ? 'bg-[#6c3bf5]/10 text-[#6c3bf5] shadow-[inset_2px_0_0_#6c3bf5]'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* --- PROFILE TAB --- */}
                  {activeTab === 'profile' && (
                    <>
                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-6">Profile Information</h2>
                        
                        <div className="flex items-center gap-6 mb-8">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-purple-500/20">
                            M
                          </div>
                          <div>
                            <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08] mb-2">
                              Change Avatar
                            </Button>
                            <p className="text-xs text-white/40">Only JPG, GIF or PNG. 1MB max.</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/60">First Name</label>
                              <input
                                type="text"
                                defaultValue="Mahad"
                                className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/60">Last Name</label>
                              <input
                                type="text"
                                defaultValue="Developer"
                                className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60">Email Address</label>
                            <input
                              type="email"
                              defaultValue="mahad@example.com"
                              className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                         <h2 className="text-lg font-semibold text-white/90 mb-6">API Keys</h2>
                         <p className="text-sm text-white/40 mb-4">Manage your API keys for accessing the baas platform programmatically.</p>
                         
                         <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-4">
                            <div className="flex items-center gap-3">
                              <Key className="w-5 h-5 text-[#6c3bf5]" />
                              <div>
                                <p className="text-sm font-medium text-white/90">Production Key</p>
                                <p className="text-xs text-white/40 mt-1">pk_live_*************************</p>
                              </div>
                            </div>
                            <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]" size="sm">
                              Revoke
                            </Button>
                         </div>
                         
                         <Button variant="outline" className="w-full border-dashed border-white/[0.12] bg-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.02]">
                           Generate New API Key
                         </Button>
                      </div>
                    </>
                  )}

                  {/* --- NOTIFICATIONS TAB --- */}
                  {activeTab === 'notifications' && (
                    <>
                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-6">Notification Preferences</h2>
                        
                        <div className="space-y-6">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="p-2.5 rounded-lg bg-white/[0.04] h-fit">
                                <Mail className="w-5 h-5 text-white/60" />
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-white/90">Email Notifications</h3>
                                <p className="text-xs text-white/40 mt-1 max-w-sm">Receive digest emails about your infrastructure usage, warnings, and system health.</p>
                              </div>
                            </div>
                            <Switch defaultChecked className="data-[state=checked]:bg-[#6c3bf5]" />
                          </div>

                          <div className="h-px w-full bg-white/[0.06]" />

                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="p-2.5 rounded-lg bg-white/[0.04] h-fit">
                                <Smartphone className="w-5 h-5 text-white/60" />
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-white/90">Push Notifications</h3>
                                <p className="text-xs text-white/40 mt-1 max-w-sm">Get real-time push events when critical deployments succeed or fail.</p>
                              </div>
                            </div>
                            <Switch defaultChecked className="data-[state=checked]:bg-[#6c3bf5]" />
                          </div>

                          <div className="h-px w-full bg-white/[0.06]" />

                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="p-2.5 rounded-lg bg-white/[0.04] h-fit">
                                <Bell className="w-5 h-5 text-white/60" />
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-white/90">Marketing & Updates</h3>
                                <p className="text-xs text-white/40 mt-1 max-w-sm">Receive emails about new CodeEvo features and platform updates.</p>
                              </div>
                            </div>
                            <Switch className="data-[state=checked]:bg-[#6c3bf5]" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* --- SECURITY TAB --- */}
                  {activeTab === 'security' && (
                    <>
                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-6">Security Settings</h2>
                        
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 rounded-lg bg-[#10b981]/10 h-fit">
                                <Lock className="w-5 h-5 text-[#10b981]" />
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-white/90">Password</h3>
                                <p className="text-xs text-white/40 mt-1">Last changed 3 months ago</p>
                              </div>
                            </div>
                            <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]" size="sm">
                              Update
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 rounded-lg bg-[#f59e0b]/10 h-fit">
                                <Shield className="w-5 h-5 text-[#f59e0b]" />
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-white/90">Two-Factor Authentication</h3>
                                <p className="text-xs text-white/40 mt-1">Add an extra layer of security to your account.</p>
                              </div>
                            </div>
                            <Button className="bg-white/[0.08] text-white hover:bg-white/[0.12] border-0" size="sm">
                              Enable 2FA
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-4">Active Sessions</h2>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-3 items-center">
                              <Clock className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-sm font-medium text-white/90">Mac OS • Chrome</p>
                                <p className="text-xs text-white/40">San Francisco, USA • Current Session</p>
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] font-medium border border-[#10b981]/20">Active</span>
                          </div>
                          <div className="h-px w-full bg-white/[0.06]" />
                          <div className="flex items-center justify-between">
                            <div className="flex gap-3 items-center">
                              <Clock className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-sm font-medium text-white/90">Windows 11 • Edge</p>
                                <p className="text-xs text-white/40">New York, USA • 2 hours ago</p>
                              </div>
                            </div>
                            <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Revoke</button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* --- BILLING TAB --- */}
                  {activeTab === 'billing' && (
                    <>
                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-[#6c3bf5]/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-30 bg-[#6c3bf5] opacity-5 blur-[80px] w-64 h-64 -translate-y-1/2 translate-x-1/3 rounded-full pointer-events-none" />
                        
                        <div className="flex items-start justify-between relative z-10">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h2 className="text-xl font-bold text-white">Pro Plan</h2>
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#6c3bf5]/20 text-[#6c3bf5] font-bold border border-[#6c3bf5]/30">Active</span>
                            </div>
                            <p className="text-sm text-white/60 mb-6">Perfect for scaling applications and microservices.</p>
                            
                            <div className="space-y-2 mb-6">
                              {['Unlimited Agents', 'Up to 50 Microservices', '99.9% Uptime SLA', 'Priority Support'].map((feat, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                                  <span className="text-sm text-white/80">{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-3xl font-bold text-white">$49</span>
                            <span className="text-white/40 text-sm">/mo</span>
                          </div>
                        </div>

                        <div className="flex gap-3 relative z-10">
                          <Button className="bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white hover:shadow-lg hover:shadow-purple-500/20 border-0">
                            Upgrade Plan
                          </Button>
                          <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]">
                            Cancel Subscription
                          </Button>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-6">Payment Method</h2>
                        
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 rounded bg-white/[0.06] flex items-center justify-center border border-white/[0.1]">
                              <span className="font-bold text-xs italic tracking-widest opacity-80 text-white/80">VISA</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white/90">Visa ending in 4242</p>
                              <p className="text-xs text-white/40 mt-1">Expires 12/24</p>
                            </div>
                          </div>
                          <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]" size="sm">
                            Edit
                          </Button>
                        </div>
                        
                        <Button variant="outline" className="w-full border-dashed border-white/[0.12] bg-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.02]">
                          Add New Payment Method
                        </Button>
                      </div>
                      
                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-4">Billing History</h2>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white/90">Pro Plan - Monthly</p>
                              <p className="text-xs text-white/40">May 1, 2026</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-white/90">$49.00</span>
                              <Button variant="outline" className="h-7 text-xs bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]">Receipt</Button>
                            </div>
                          </div>
                          <div className="h-px w-full bg-white/[0.06]" />
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white/90">Pro Plan - Monthly</p>
                              <p className="text-xs text-white/40">Apr 1, 2026</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-white/90">$49.00</span>
                              <Button variant="outline" className="h-7 text-xs bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]">Receipt</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Save Changes button is global except for billing maybe? Let's keep it global for profile/notifications/security */}
                  {activeTab !== 'billing' && (
                    <div className="flex justify-end pt-4">
                      <Button className="bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white hover:shadow-lg hover:shadow-purple-500/20 border-0">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
