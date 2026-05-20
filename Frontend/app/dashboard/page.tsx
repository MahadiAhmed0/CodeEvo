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

const statsData = [
  { label: 'Total Projects', value: '4', icon: FolderOpen, color: '#004aad', bg: '#004aad15' },
  { label: 'Active Agents', value: '2', icon: Zap, color: '#cb6ce6', bg: '#cb6ce615' },
  { label: 'Services Generated', value: '18', icon: Server, color: '#10b981', bg: '#10b98115' },
  { label: 'Git Commits', value: '47', icon: GitCommit, color: '#f59e0b', bg: '#f59e0b15' },
]

const chartData = [
  { month: 'Jan', commits: 12, agents: 4, services: 3 },
  { month: 'Feb', commits: 19, agents: 5, services: 5 },
  { month: 'Mar', commits: 15, agents: 3, services: 4 },
  { month: 'Apr', commits: 22, agents: 6, services: 7 },
]

const allProjects = [
  {
    id: 'e-commerce-system',
    name: 'E-Commerce System',
    description: 'Microservices for online shopping cart and checkout.',
    services: 8,
    lastUpdate: '2 hours ago',
    status: 'active'
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'Main entry point routing definitions.',
    services: 3,
    lastUpdate: '15 min ago',
    status: 'active'
  },
  {
    id: 'notification-system',
    name: 'Notification System',
    description: 'Email and SMS queue handlers.',
    services: 4,
    lastUpdate: '1 day ago',
    status: 'active'
  },
  {
    id: 'my-first-system',
    name: 'My First System',
    description: 'Initial playground and testing.',
    services: 3,
    lastUpdate: '3 days ago',
    status: 'inactive'
  }
]

const recentActivity = [
  { id: 1, action: 'Added PaymentService', project: 'E-Commerce System', time: '2 min ago' },
  { id: 2, action: 'Committed to main', project: 'API Gateway', time: '15 min ago' },
  { id: 3, action: 'Agent run completed', project: 'Notification System', time: '1 hour ago' },
  { id: 4, action: 'Database connected', project: 'E-Commerce System', time: '2 hours ago' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0b1c2c] mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here&apos;s your system architecture overview.</p>
            </div>
            <Button className="bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white hover:shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsData.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-[#0b1c2c]">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: stat.bg, color: stat.color }}>
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
              className="lg:col-span-2 p-6 rounded-xl bg-white border border-gray-200"
            >
              <h2 className="text-lg font-semibold text-[#0b1c2c] mb-4">Activity Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
                  <Line 
                    type="monotone" 
                    dataKey="commits" 
                    stroke="#004aad" 
                    name="Commits"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="agents" 
                    stroke="#cb6ce6"
                    name="Agent Runs"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-white border border-gray-200"
            >
              <h2 className="text-lg font-semibold text-[#0b1c2c] mb-4">Distribution</h2>
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
                  >
                    <Cell fill="#004aad" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#cb6ce6" />
                  </Pie>
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
              <h2 className="text-lg font-semibold text-[#0b1c2c]">Recent Projects</h2>
              <Link href="/projects">
                <Button variant="outline" className="text-[#004aad] border-[#004aad] hover:bg-[#004aad] hover:text-white">
                  View All Projects
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProjects.slice(0, 3).map((project, i) => (
                <Link href={`/${project.id}`} key={project.id}>
                  <div className="group p-6 rounded-xl bg-white border border-gray-200 hover:border-[#004aad] hover:shadow-lg transition-all cursor-pointer h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <FolderOpen className="w-8 h-8 text-[#004aad]" />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {project.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#0b1c2c] text-lg mb-2">{project.name}</h3>
                      <p className="text-sm text-gray-500 mb-4">{project.description}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-[#cb6ce6]" /> {project.services} Services</span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">Updated {project.lastUpdate}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#004aad] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-xl bg-white border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0b1c2c]">Recent Activity</h2>
              <Link href="/git">
                <Button variant="outline" className="text-[#004aad] border-[#004aad] hover:bg-[#004aad] hover:text-white">
                  View Full Git History
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#004aad] to-[#cb6ce6]" />
                    <div>
                      <p className="font-medium text-[#0b1c2c]">{item.action}</p>
                      <p className="text-sm text-gray-500">{item.project}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{item.time}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
