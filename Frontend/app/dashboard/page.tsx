'use client'

import { Navbar } from '@/components/navbar'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Activity,
  TrendingUp,
  GitBranch,
  Zap,
  Plus,
  ArrowRight,
  FolderOpen,
  Server,
  GitCommit
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { projectApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

const chartData = [
  { month: 'Jan', commits: 12, agents: 4, services: 3 },
  { month: 'Feb', commits: 19, agents: 5, services: 5 },
  { month: 'Mar', commits: 15, agents: 3, services: 4 },
  { month: 'Apr', commits: 22, agents: 6, services: 7 },
]

const recentActivity = [
  { id: 1, action: 'Added PaymentService', project: 'E-Commerce System', time: '2 min ago' },
  { id: 2, action: 'Committed to main', project: 'API Gateway', time: '15 min ago' },
  { id: 3, action: 'Agent run completed', project: 'Notification System', time: '1 hour ago' },
  { id: 4, action: 'Database connected', project: 'E-Commerce System', time: '2 hours ago' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    try {
      setIsCreating(true)
      const res = await projectApi.createProject(newProjectName, newProjectDesc)
      setIsOpen(false)
      router.push(`/${res.id}`)
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    projectApi.listProjects().then(data => {
      // Assuming paginated response with .content
      setProjects(data.content || [])
    }).catch(console.error)

    projectApi.getDashboardStats().then(setStats).catch(console.error)
  }, [])

  const statsData = [
    { label: 'Total Projects', value: stats?.totalProjects ?? 0, icon: FolderOpen, color: '#004aad', bg: '#004aad15' },
    { label: 'Active Projects', value: stats?.activeProjects ?? 0, icon: Activity, color: '#cb6ce6', bg: '#cb6ce615' },
    { label: 'Total Services', value: stats?.totalServiceNodes ?? 0, icon: Server, color: '#10b981', bg: '#10b98115' },
    { label: 'Git Commits', value: '47', icon: GitCommit, color: '#f59e0b', bg: '#f59e0b15' }, // placeholder for git
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e1a] text-white">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-white/60">Welcome back! Here&apos;s your system architecture overview.</p>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white hover:shadow-lg hover:shadow-purple-500/20 border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-[#0d1220] border-white/[0.06] text-white">
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                  <DialogDescription className="text-white/60">
                    Set up a new project workspace to build your system architecture.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-white/80">Project Name</label>
                    <Input
                      id="name"
                      placeholder="e.g. E-Commerce Backend"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="bg-white/[0.04] border-white/[0.06] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="desc" className="text-sm font-medium text-white/80">Description</label>
                    <textarea
                      id="desc"
                      placeholder="Briefly describe what this project does..."
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full min-h-[100px] rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)} className="border-white/[0.06] text-white hover:bg-white/[0.04] hover:text-white bg-transparent">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()} className="bg-[#6c3bf5] text-white hover:bg-[#5b2bd5]">
                    {isCreating ? 'Creating...' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsData.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/40 text-sm font-semibold uppercase tracking-wider mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-white/90">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04]" style={{ color: stat.color }}>
                    <stat.icon className="w-6 h-6 outline-none" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Line Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]"
            >
              <h2 className="text-lg font-semibold text-white/90 mb-4">Activity Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d1220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Line 
                    type="monotone" 
                    dataKey="commits" 
                    stroke="#6c3bf5" 
                    name="Commits"
                    strokeWidth={3}
                    dot={{ fill: '#6c3bf5', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="agents" 
                    stroke="#c74cf0"
                    name="Agent Runs"
                    strokeWidth={3}
                    dot={{ fill: '#c74cf0', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]"
            >
              <h2 className="text-lg font-semibold text-white/90 mb-4">Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Services', value: 40 },
                      { name: 'Databases', value: 30 },
                      { name: 'Queues', value: 30 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#6c3bf5" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#c74cf0" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0d1220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Recent Projects Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white/90">Recent Projects</h2>
              <Link href="/projects">
                <Button variant="outline" className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300">
                  View All Projects
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.length === 0 ? (
                <div className="col-span-full py-8 text-center text-white/40 border border-white/[0.06] rounded-xl bg-[#0d1220]/50 border-dashed">
                  No projects yet. Create one to get started!
                </div>
              ) : (
                projects.slice(0, 3).map((project, i) => (
                  <Link href={`/${project.id}`} key={project.id}>
                    <div className="group p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06] hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#6c3bf5]/20 to-[#c74cf0]/20 border border-purple-500/20">
                            <FolderOpen className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/[0.04] text-white/40 border-white/[0.06]'}`}>
                            {project.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h3 className="font-bold text-white/90 text-lg mb-2">{project.name}</h3>
                        <p className="text-sm text-white/50 mb-4 line-clamp-2">{project.description || 'No description provided.'}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-4 text-[13px] font-medium text-white/40 mb-4">
                          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-purple-400" /> {project.serviceCount ?? 0} Services</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                          <span className="text-[11px] font-medium text-white/30">
                            Updated {project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }) : 'just now'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-xl bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white/90">Recent Activity</h2>
              <Link href="/git">
                <Button variant="outline" className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300">
                  View Full Git History
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] border border-transparent hover:border-white/[0.06] rounded-xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] shadow-[0_0_8px_rgba(108,59,245,0.5)]" />
                    <div>
                      <p className="font-medium text-white/80 text-[14px]">{item.action}</p>
                      <p className="text-[12px] font-medium text-white/40 mt-0.5">{item.project}</p>
                    </div>
                  </div>
                  <p className="text-[12px] font-medium text-white/30 bg-white/[0.04] px-2.5 py-1 rounded-md">{item.time}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
