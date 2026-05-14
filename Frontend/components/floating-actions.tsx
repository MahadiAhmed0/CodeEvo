'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Command,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { useState } from 'react'

export function FloatingActions() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-20 right-6 z-40">
      {/* Floating Menu Items */}
      {open && (
        <motion.div
          className="flex flex-col gap-3 mb-3"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            title="Command Palette"
          >
            <Command className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full bg-white border-2 border-gray-200 text-[#0b1c2c] flex items-center justify-center shadow-lg hover:shadow-xl hover:border-gray-300 transition-all"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full bg-white border-2 border-gray-200 text-[#0b1c2c] flex items-center justify-center shadow-lg hover:shadow-xl hover:border-gray-300 transition-all"
            title="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  )
}
