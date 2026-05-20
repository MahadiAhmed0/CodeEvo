import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Folder, 
  FolderOpen, 
  FileCode2, 
  FileJson, 
  FileText, 
  Terminal, 
  X,
  Play,
  Settings,
  Search,
  CheckCircle2,
  GitBranch
} from 'lucide-react'

// Basic syntax highlighting colors
const colors = {
  keyword: 'text-pink-400',
  string: 'text-emerald-400',
  function: 'text-blue-400',
  comment: 'text-gray-500',
  number: 'text-orange-400',
  default: 'text-gray-300'
}

interface CodeViewerProps {
  nodes: any[]
  edges: any[]
}

const generateMockFiles = (nodes: any[]) => {
  const root: any = {
    'system_architecture.json': {
      type: 'file',
      name: 'system_architecture.json',
      language: 'json',
      content: JSON.stringify({
        version: "1.2.0",
        timestamp: new Date().toISOString(),
        nodes: nodes.map(n => n.data),
      }, null, 2)
    },
    'docker-compose.yml': {
      type: 'file',
      name: 'docker-compose.yml',
      language: 'yaml',
      content: `version: '3.8'\nservices:\n  # Auto-generated based on architecture\n`
    }
  }

  nodes.filter(n => n.data.type === 'service').forEach(service => {
    const sName = service.data.name
    const lang = service.data.language?.toLowerCase() || 'node.js'
    
    root[sName] = { type: 'folder', name: sName, children: {} }
    
    if (lang.includes('spring') || lang.includes('java')) {
      root[sName].children = {
        'pom.xml': { type: 'file', name: 'pom.xml', language: 'xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<project>\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.codeevo</groupId>\n  <artifactId>${sName.toLowerCase()}</artifactId>\n  <version>1.0.0</version>\n</project>` },
        'src': { type: 'folder', name: 'src', children: {
          'main': { type: 'folder', name: 'main', children: {
            'java': { type: 'folder', name: 'java', children: {
              'com': { type: 'folder', name: 'com', children: {
                'codeevo': { type: 'folder', name: 'codeevo', children: {
                  'Application.java': { type: 'file', name: 'Application.java', language: 'java', content: `package com.codeevo;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}` },
                  'Controller.java': { type: 'file', name: 'Controller.java', language: 'java', content: `package com.codeevo;\n\nimport org.springframework.web.bind.annotation.*;\n\n@RestController\npublic class Controller {\n    // Auto-generated endpoints\n    // ${service.data.endpoints?.join(', ') || 'No endpoints defined'}\n}` }
                }}
              }}
            }}
          }}
        }}
      }
    } else if (lang === 'go') {
      root[sName].children = {
        'go.mod': { type: 'file', name: 'go.mod', language: 'go', content: `module ${sName.toLowerCase()}\n\ngo 1.21` },
        'main.go': { type: 'file', name: 'main.go', language: 'go', content: `package main\n\nimport (\n\t"fmt"\n\t"log"\n\t"net/http"\n)\n\nfunc main() {\n\tfmt.Println("Starting ${sName} on port ${service.data.port}")\n\tlog.Fatal(http.ListenAndServe(":${service.data.port}", nil))\n}` },
        'internal': { type: 'folder', name: 'internal', children: {
          'api': { type: 'folder', name: 'api', children: {
            'handlers.go': { type: 'file', name: 'handlers.go', language: 'go', content: `package api\n\nimport "net/http"\n\n// Handlers for ${service.data.endpoints?.join(', ') || 'API'}` }
          }}
        }}
      }
    } else {
      root[sName].children = {
        'package.json': { type: 'file', name: 'package.json', language: 'json', content: `{\n  "name": "${sName.toLowerCase()}",\n  "version": "1.0.0",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  }\n}` },
        'index.js': { type: 'file', name: 'index.js', language: 'javascript', content: `const express = require('express');\nconst app = express();\nconst port = ${service.data.port || 3000};\n\napp.use(express.json());\n\n${(service.data.endpoints || []).map((ep: string) => `app.all('${ep.replace(/\\{[^}]+\\}/g, ':id')}', (req, res) => {\n  res.json({ message: '${ep} OK' });\n});`).join('\\n\\n')}\n\napp.listen(port, () => {\n  console.log(\`${sName} listening on port \${port}\`);\n});` }
      }
    }
  })

  return root
}

const getFileIcon = (name: string) => {
  if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />
  if (name.endsWith('.java') || name.endsWith('.go') || name.endsWith('.js') || name.endsWith('.ts')) return <FileCode2 size={14} className="text-blue-400" />
  if (name.endsWith('.xml') || name.endsWith('.yml') || name.endsWith('.yaml')) return <FileText size={14} className="text-red-400" />
  return <FileText size={14} className="text-gray-400" />
}

const FileTreeItem = ({ item, level = 0, onSelectFile, activeFile }: any) => {
  const [isOpen, setIsOpen] = useState(level < 2) // Auto-open root folders

  if (item.type === 'file') {
    const isActive = activeFile?.name === item.name && activeFile?.content === item.content
    return (
      <div 
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer text-[13px] select-none transition-colors ${isActive ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => onSelectFile(item)}
      >
        {getFileIcon(item.name)}
        {item.name}
      </div>
    )
  }

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1 px-2 cursor-pointer text-[13px] text-gray-300 hover:text-white hover:bg-white/[0.04] select-none"
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FolderOpen size={14} className="text-purple-400" /> : <Folder size={14} className="text-purple-400/70" />}
        {item.name}
      </div>
      {isOpen && item.children && Object.values(item.children).map((child: any, i) => (
        <FileTreeItem key={i} item={child} level={level + 1} onSelectFile={onSelectFile} activeFile={activeFile} />
      ))}
    </div>
  )
}

export function CodeViewer({ nodes, edges }: CodeViewerProps) {
  const fileTree = useMemo(() => generateMockFiles(nodes), [nodes])
  const [activeFile, setActiveFile] = useState<any>(fileTree['system_architecture.json'])

  // Syntax highlighting mock (very basic)
  const renderCode = (content: string) => {
    return content.split('\\n').map((line, i) => {
      // Basic heuristic highlighting
      let highlightedLine = line
        .replace(/\b(package|import|public|class|static|void|func|const|require|module|go|return)\b/g, `<span class="${colors.keyword}">$1</span>`)
        .replace(/\b(String|int|boolean|fmt|log|http|express|res|req|console)\b/g, `<span class="${colors.function}">$1</span>`)
        .replace(/(["'].*?["'])/g, `<span class="${colors.string}">$1</span>`)
        .replace(/(\/\/.*)/g, `<span class="${colors.comment}">$1</span>`)

      return (
        <div key={i} className="flex group hover:bg-white/[0.02]">
          <div className="w-10 flex-shrink-0 text-right pr-4 text-gray-600 select-none border-r border-white/[0.06] mr-4">{i + 1}</div>
          <div className="flex-1 text-gray-300 whitespace-pre-wrap break-all" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      )
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-0 bg-[#06080d] flex flex-col font-mono"
    >
      {/* IDE Top Bar */}
      <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[#0a0e1a]">
        <div className="flex items-center gap-4 text-[12px] text-gray-400">
          <span className="flex items-center gap-2"><GitBranch size={14} /> main</span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span>CodeEvo Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <Play size={14} className="text-emerald-400 cursor-pointer hover:text-emerald-300" />
          <Settings size={14} className="text-gray-400 cursor-pointer hover:text-gray-200" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/[0.06] bg-[#0a0e1a]/50 flex flex-col">
          <div className="p-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase flex items-center justify-between">
            Explorer
            <Search size={12} className="cursor-pointer hover:text-gray-300" />
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {Object.values(fileTree).map((item: any, i) => (
              <FileTreeItem key={i} item={item} onSelectFile={setActiveFile} activeFile={activeFile} />
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#06080d]">
          {/* Editor Tabs */}
          <div className="flex h-10 bg-[#0a0e1a] border-b border-white/[0.06] overflow-x-auto">
            {activeFile && (
              <div className="flex items-center gap-2 px-4 h-full bg-[#1e293b] border-t-2 border-purple-500 text-[13px] text-white min-w-max cursor-pointer">
                {getFileIcon(activeFile.name)}
                {activeFile.name}
                <X size={14} className="text-gray-400 hover:text-white ml-2" />
              </div>
            )}
          </div>
          
          {/* Editor Content */}
          <div className="flex-1 overflow-auto p-4 text-[13px] leading-relaxed">
            {activeFile ? (
              <pre className="font-mono">
                {renderCode(activeFile.content)}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-4">
                <FileCode2 size={48} className="opacity-20" />
                <p>Select a file to view code</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal / Logs Area */}
      <div className="h-48 border-t border-white/[0.06] bg-[#0a0e1a] flex flex-col">
        <div className="flex gap-4 px-4 h-9 border-b border-white/[0.06] items-center text-[12px] uppercase tracking-wider font-semibold">
          <div className="text-gray-500 hover:text-gray-300 cursor-pointer">Terminal</div>
          <div className="text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]">Logs</div>
          <div className="text-gray-500 hover:text-gray-300 cursor-pointer">Problems</div>
        </div>
        <div className="flex-1 p-3 overflow-y-auto text-[12px] text-gray-400 font-mono space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-blue-400">[INFO]</span>
            <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
            <span>Workspace initialized successfully.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400"><CheckCircle2 size={14} /></span>
            <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
            <span className="text-emerald-400">Services synced with architecture graph.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">[SYSTEM]</span>
            <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
            <span>Ready for development. Select a file in the explorer to view the generated source code.</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
