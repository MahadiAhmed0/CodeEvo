'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Command,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react'
import { useState } from 'react'

export function FloatingActions() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Menu Items */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="flex flex-col gap-2.5 mb-3"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white flex items-center justify-center shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow"
              title="Command Palette"
            >
              <Command className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-xl bg-[#0d1220] border border-white/[0.08] text-white/50 flex items-center justify-center shadow-lg hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.12] transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-xl bg-[#0d1220] border border-white/[0.08] text-white/50 flex items-center justify-center shadow-lg hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.12] transition-all"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-xl bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white flex items-center justify-center shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        >
          {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </motion.div>
      </motion.button>
    </div>
  )
}
