'use client'

import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/lib/cropImage'
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
  CheckCircle2,
  Loader2,
  Upload,
  Eye,
  EyeOff,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { userApi } from '@/lib/api'
import { toast } from 'sonner'

// ─── Password Change Modal ────────────────────────────────────────────────────

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await userApi.updatePassword({ oldPassword, newPassword })
      toast.success('Password updated successfully.')
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md mx-4 bg-[#0d1220] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Change Password</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">Current Password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pr-10 px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pr-10 px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-white/30">
              8–32 chars, must include uppercase, lowercase, number and special character (@$!%*?&)
            </p>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 font-medium bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white hover:shadow-lg hover:shadow-purple-500/20 border-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuthStore()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Sync if user changes (e.g. after rehydration)
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setEmail(user.email)
    }
  }, [user])

  const avatarUrl = user?.avatar ? userApi.avatarUrl(user.avatar) : null
  const initials = user
    ? user.firstName.charAt(0).toUpperCase()
    : '?'

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG or GIF files are allowed.')
      return
    }
    if (file.size > 1_048_576) {
      toast.error('File size must be under 1 MB.')
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || null)
      setCropModalOpen(true)
    })
    reader.readAsDataURL(file)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setAvatarLoading(true)
    setCropModalOpen(false)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0)
      if (!croppedImage) throw new Error('Failed to crop image')
      
      const updatedUser = await userApi.uploadAvatar(croppedImage)
      updateUser(updatedUser)
      toast.success('Avatar updated!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to upload avatar.')
    } finally {
      setAvatarLoading(false)
      setImageSrc(null)
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    try {
      const updatedUser = await userApi.removeAvatar()
      updateUser(updatedUser)
      toast.success('Avatar removed!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    setSaving(true)

    const nameChanged = firstName !== user?.firstName || lastName !== user?.lastName
    const emailChanged = email !== user?.email

    try {
      let latestUser = user!

      if (nameChanged) {
        latestUser = await userApi.updateName({ firstName, lastName })
        updateUser(latestUser)
      }

      if (emailChanged) {
        latestUser = await userApi.updateEmail({ email })
        updateUser(latestUser)
      }

      if (!nameChanged && !emailChanged) {
        toast.info('No changes to save.')
        return
      }

      setSaveSuccess(true)
      toast.success('Profile updated successfully.')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {cropModalOpen && imageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d1220] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                <h3 className="text-lg font-semibold text-white">Crop Image</h3>
                <button
                  onClick={() => setCropModalOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative w-full h-[300px] bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/60">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => {
                      setZoom(Number(e.target.value))
                    }}
                    className="flex-1 accent-[#6c3bf5]"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCropModalOpen(false)}
                    className="flex-1 bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCropSave}
                    disabled={avatarLoading}
                    className="flex-1 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white border-0"
                  >
                    {avatarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply & Save'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
        <h2 className="text-lg font-semibold text-white/90 mb-6">Profile Information</h2>

        <div className="flex items-center gap-6 mb-8">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-purple-500/20">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading}
                className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08] gap-2"
              >
                <Upload className="w-4 h-4" />
                {avatarLoading ? 'Uploading…' : 'Change Avatar'}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={avatarLoading}
                  className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-white/40">Only JPG, GIF or PNG. 1 MB max.</p>
          </div>
        </div>

        <div className="flex gap-6 mb-8 bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Member Since</p>
            <p className="text-sm font-medium text-white/90">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div className="w-px bg-white/[0.06]" />
          <div>
            <p className="text-xs text-white/40 mb-1">Last Sign In</p>
            <p className="text-sm font-medium text-white/90">
              {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A'}
            </p>
          </div>
        </div>

        <form id="profile-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/90 text-sm outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
            />
          </div>

          {saveError && (
            <p className="text-xs text-red-400 font-medium bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {saveError}
            </p>
          )}

          {/* Save Changes */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white hover:shadow-lg hover:shadow-purple-500/20 border-0 gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  return (
    <>
      <AnimatePresence>
        {showPasswordModal && (
          <PasswordModal onClose={() => setShowPasswordModal(false)} />
        )}
      </AnimatePresence>

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
                <p className="text-xs text-white/40 mt-1">Change your account password</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(true)}
              className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]"
              size="sm"
            >
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
    </>
  )
}

// ─── Main Settings Component ──────────────────────────────────────────────────

function SettingsContent() {
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
                  {activeTab === 'profile' && <ProfileTab />}

                  {activeTab === 'notifications' && (
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
                  )}

                  {activeTab === 'security' && <SecurityTab />}

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
                          <Button className="bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white hover:shadow-lg hover:shadow-purple-500/20 border-0">Upgrade Plan</Button>
                          <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]">Cancel Subscription</Button>
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
                          <Button variant="outline" className="bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]" size="sm">Edit</Button>
                        </div>
                        <Button variant="outline" className="w-full border-dashed border-white/[0.12] bg-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.02]">
                          Add New Payment Method
                        </Button>
                      </div>

                      <div className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white/90 mb-4">Billing History</h2>
                        <div className="space-y-4">
                          {[{ date: 'May 1, 2026' }, { date: 'Apr 1, 2026' }].map((item, i) => (
                            <div key={i}>
                              {i > 0 && <div className="h-px w-full bg-white/[0.06] mb-4" />}
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white/90">Pro Plan - Monthly</p>
                                  <p className="text-xs text-white/40">{item.date}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-white/90">$49.00</span>
                                  <Button variant="outline" className="h-7 text-xs bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]">Receipt</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0a0e1a] text-white flex items-center justify-center">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
