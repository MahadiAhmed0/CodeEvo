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
    const methods = service.data.methods || []
    const externalAPIs = service.data.externalAPIs || []
    
    root[sName] = { type: 'folder', name: sName, children: {} }
    
    if (lang.includes('spring') || lang.includes('java')) {
      const methodDeclarations = methods.map((m: any) => 
        `    // Type: ${m.type} | ${m.description || 'No description'}\n    public void ${m.name}() {\n        // TODO: Implement ${m.name}\n    }`
      ).join('\n\n')

      const apiClients = externalAPIs.map((api: any) =>
        `    // External API: ${api.name}\n    // Base URL: ${api.baseUrl}\n    public void call${api.name.replace(/\\s+/g, '')}() {\n        // TODO: Implement client for ${api.name}\n    }`
      ).join('\n\n')

      root[sName].children = {
        'pom.xml': { type: 'file', name: 'pom.xml', language: 'xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<project>\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.codeevo</groupId>\n  <artifactId>${sName.toLowerCase()}</artifactId>\n  <version>1.0.0</version>\n</project>` },
        'src': { type: 'folder', name: 'src', children: {
          'main': { type: 'folder', name: 'main', children: {
            'java': { type: 'folder', name: 'java', children: {
              'com': { type: 'folder', name: 'com', children: {
                'codeevo': { type: 'folder', name: 'codeevo', children: {
                  'Application.java': { type: 'file', name: 'Application.java', language: 'java', content: `package com.codeevo;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}` },
                  [`${sName}.java`]: { type: 'file', name: `${sName}.java`, language: 'java', content: `package com.codeevo;\n\nimport org.springframework.stereotype.Service;\n\n@Service\npublic class ${sName} {\n\n${methodDeclarations}\n\n${apiClients}\n}` }
                }}
              }}
            }}
          }}
        }}
      }
    } else if (lang === 'go') {
      const methodDeclarations = methods.map((m: any) => 
        `// ${m.name} handles ${m.type} logic\nfunc (s *Service) ${m.name}() error {\n\t// TODO: Implement\n\treturn nil\n}`
      ).join('\n\n')

      const apiClients = externalAPIs.map((api: any) =>
        `// Call${api.name.replace(/\\s+/g, '')} calls external API at ${api.baseUrl}\nfunc (s *Service) Call${api.name.replace(/\\s+/g, '')}() error {\n\t// TODO: Implement\n\treturn nil\n}`
      ).join('\n\n')

      root[sName].children = {
        'go.mod': { type: 'file', name: 'go.mod', language: 'go', content: `module ${sName.toLowerCase()}\n\ngo 1.21` },
        'main.go': { type: 'file', name: 'main.go', language: 'go', content: `package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("Starting ${sName} on port ${service.data.port}")\n}` },
        'internal': { type: 'folder', name: 'internal', children: {
          'service': { type: 'folder', name: 'service', children: {
            'service.go': { type: 'file', name: 'service.go', language: 'go', content: `package service\n\ntype Service struct {}\n\n${methodDeclarations}\n\n${apiClients}` }
          }}
        }}
      }
    } else {
      const methodDeclarations = methods.map((m: any) => 
        `  // Type: ${m.type}\n  async ${m.name}() {\n    // TODO: Implement ${m.description || m.name}\n  }`
      ).join(',\n\n')

      const apiClients = externalAPIs.map((api: any) =>
        `  // External API: ${api.name} (${api.baseUrl})\n  async call${api.name.replace(/\\s+/g, '')}() {\n    // TODO: Implement client\n  }`
      ).join(',\n\n')

      root[sName].children = {
        'package.json': { type: 'file', name: 'package.json', language: 'json', content: `{\n  "name": "${sName.toLowerCase()}",\n  "version": "1.0.0",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  }\n}` },
        'index.js': { type: 'file', name: 'index.js', language: 'javascript', content: `const Service = {\n${methodDeclarations}${methods.length > 0 && externalAPIs.length > 0 ? ',\\n\\n' : ''}${apiClients}\n};\n\nconsole.log('${sName} started on port ${service.data.port || 3000}');\nmodule.exports = Service;` }
      }
    }
  })

  // Generate API Gateway files
  nodes.filter(n => n.data.type === 'api').forEach(gateway => {
    const gwName = gateway.data.name || 'APIGateway'
    const gw = gateway.data.gatewayConfig
    if (!gw) return

    root[gwName] = { type: 'folder', name: gwName, children: {} }

    if (gw.platform === 'nginx') {
      // Generate nginx.conf
      const upstreams = gw.routes.map((r: any) =>
        `upstream ${r.targetService.toLowerCase().replace(/\\s+/g, '_')} {\n    server localhost:${r.targetPort};\n}`
      ).join('\\n\\n')

      const locations = gw.routes.map((r: any) => {
        const proxyPass = r.stripPrefix
          ? `rewrite ^${r.pathPrefix}(.*) /$1 break;\\n        proxy_pass http://${r.targetService.toLowerCase().replace(/\\s+/g, '_')};`
          : `proxy_pass http://${r.targetService.toLowerCase().replace(/\\s+/g, '_')};`
        return `    location ${r.pathPrefix} {\n        ${proxyPass}\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }`
      }).join('\\n\\n')

      const rateLimitZone = gw.rateLimit.enabled
        ? `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=${Math.ceil(gw.rateLimit.requestsPerMinute / 60)}r/s;`
        : '# Rate limiting disabled'

      const corsHeaders = gw.cors.enabled
        ? `    # CORS Headers\n    add_header Access-Control-Allow-Origin "${gw.cors.allowedOrigins.join(', ')}";\n    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";\n    add_header Access-Control-Allow-Headers "Content-Type, Authorization";`
        : '    # CORS disabled'

      root[gwName].children = {
        'nginx.conf': {
          type: 'file', name: 'nginx.conf', language: 'nginx',
          content: `# Auto-generated by CodeEvo\n# API Gateway: ${gwName}\n\n${rateLimitZone}\n\n${upstreams}\n\nserver {\n    listen ${gateway.data.port || 8080};\n    server_name localhost;\n\n${corsHeaders}\n\n${locations}\n}`
        },
        'Dockerfile': {
          type: 'file', name: 'Dockerfile', language: 'dockerfile',
          content: `FROM nginx:alpine\nCOPY nginx.conf /etc/nginx/conf.d/default.conf\nEXPOSE ${gateway.data.port || 8080}\nCMD ["nginx", "-g", "daemon off;"]`
        }
      }
    } else if (gw.platform === 'spring-cloud-gateway') {
      // Generate application.yml
      const routeEntries = gw.routes.map((r: any, i: number) =>
        `        - id: route_${i}\n          uri: http://localhost:${r.targetPort}\n          predicates:\n            - Path=${r.pathPrefix}/**${r.stripPrefix ? `\n          filters:\n            - StripPrefix=1` : ''}`
      ).join('\\n')

      const authFilter = gw.auth.enabled
        ? `\n# Authentication: ${gw.auth.type.toUpperCase()}\nspring.security.oauth2.resourceserver.jwt.issuer-uri: https://auth.example.com`
        : ''

      const rateLimitFilter = gw.rateLimit.enabled
        ? `\n# Rate Limiting\nspring.cloud.gateway.filter.request-rate-limiter:\n  redis-rate-limiter:\n    replenishRate: ${Math.ceil(gw.rateLimit.requestsPerMinute / 60)}\n    burstCapacity: ${gw.rateLimit.requestsPerMinute}`
        : ''

      root[gwName].children = {
        'application.yml': {
          type: 'file', name: 'application.yml', language: 'yaml',
          content: `# Auto-generated by CodeEvo\n# API Gateway: ${gwName}\n\nserver:\n  port: ${gateway.data.port || 8080}\n\nspring:\n  cloud:\n    gateway:\n      routes:\n${routeEntries}${gw.cors.enabled ? `\n      globalcors:\n        corsConfigurations:\n          '[/**]':\n            allowedOrigins: "${gw.cors.allowedOrigins.join(', ')}"\n            allowedMethods: "*"` : ''}${authFilter}${rateLimitFilter}`
        },
        'pom.xml': {
          type: 'file', name: 'pom.xml', language: 'xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>\n<project>\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.codeevo</groupId>\n  <artifactId>${gwName.toLowerCase()}</artifactId>\n  <version>1.0.0</version>\n  <dependencies>\n    <dependency>\n      <groupId>org.springframework.cloud</groupId>\n      <artifactId>spring-cloud-starter-gateway</artifactId>\n    </dependency>\n  </dependencies>\n</project>`
        }
      }
    } else {
      // express-proxy (default)
      const proxyImports = `const express = require('express');\nconst { createProxyMiddleware } = require('http-proxy-middleware');\n`

      const corsMiddleware = gw.cors.enabled
        ? `\n// CORS\nconst cors = require('cors');\napp.use(cors({ origin: ${JSON.stringify(gw.cors.allowedOrigins.length === 1 && gw.cors.allowedOrigins[0] === '*' ? '*' : gw.cors.allowedOrigins)} }));\n`
        : ''

      const rateLimitMiddleware = gw.rateLimit.enabled
        ? `\n// Rate Limiting\nconst rateLimit = require('express-rate-limit');\napp.use(rateLimit({\n  windowMs: 60 * 1000,\n  max: ${gw.rateLimit.requestsPerMinute},\n  message: { error: 'Rate limit exceeded' }\n}));\n`
        : ''

      const authMiddleware = gw.auth.enabled
        ? gw.auth.type === 'jwt'
          ? `\n// JWT Authentication\nconst jwt = require('express-jwt');\napp.use(jwt({ secret: process.env.JWT_SECRET, algorithms: ['HS256'] }));\n`
          : `\n// API Key Authentication\napp.use((req, res, next) => {\n  const apiKey = req.headers['x-api-key'];\n  if (!apiKey || apiKey !== process.env.API_KEY) {\n    return res.status(401).json({ error: 'Invalid API key' });\n  }\n  next();\n});\n`
        : ''

      const proxyRoutes = gw.routes.map((r: any) => {
        const opts: string[] = [
          `  target: 'http://localhost:${r.targetPort}'`,
          `  changeOrigin: true`,
        ]
        if (r.stripPrefix) {
          opts.push(`  pathRewrite: { '^${r.pathPrefix}': '' }`)
        }
        return `\n// ${r.pathPrefix} → ${r.targetService}:${r.targetPort}\napp.use('${r.pathPrefix}', createProxyMiddleware({\n${opts.join(',\\n')}\n}));`
      }).join('\\n')

      const deps: Record<string, string> = {
        'express': '^4.18.0',
        'http-proxy-middleware': '^2.0.0',
      }
      if (gw.cors.enabled) deps['cors'] = '^2.8.5'
      if (gw.rateLimit.enabled) deps['express-rate-limit'] = '^7.0.0'
      if (gw.auth.enabled && gw.auth.type === 'jwt') deps['express-jwt'] = '^8.0.0'

      root[gwName].children = {
        'package.json': {
          type: 'file', name: 'package.json', language: 'json',
          content: JSON.stringify({
            name: gwName.toLowerCase(),
            version: '1.0.0',
            main: 'index.js',
            scripts: { start: 'node index.js' },
            dependencies: deps,
          }, null, 2)
        },
        'index.js': {
          type: 'file', name: 'index.js', language: 'javascript',
          content: `// Auto-generated by CodeEvo\n// API Gateway: ${gwName}\n\n${proxyImports}\nconst app = express();\nconst port = ${gateway.data.port || 8080};\n\napp.use(express.json());\n${corsMiddleware}${rateLimitMiddleware}${authMiddleware}${proxyRoutes}\n\n// Health check\napp.get('/health', (req, res) => {\n  res.json({ status: 'ok', gateway: '${gwName}', routes: ${gw.routes.length} });\n});\n\napp.listen(port, () => {\n  console.log('${gwName} listening on port ' + port);\n});`
        },
        'Dockerfile': {
          type: 'file', name: 'Dockerfile', language: 'dockerfile',
          content: `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install --production\nCOPY . .\nEXPOSE ${gateway.data.port || 8080}\nCMD ["node", "index.js"]`
        }
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

import { useDiagramStore } from '@/lib/store'

export function CodeViewer({ nodes, edges }: CodeViewerProps) {
  const { setShowProjectSettings } = useDiagramStore()
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 z-0 bg-[#06080d] flex flex-col font-mono pt-[72px]"
    >
      {/* IDE Top Bar */}
      <div className="h-10 border-y border-white/[0.06] flex items-center justify-between px-4 bg-[#0a0e1a]">
        <div className="flex items-center gap-4 text-[12px] text-gray-400">
          <span className="flex items-center gap-2"><GitBranch size={14} /> main</span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span>CodeEvo Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <Play size={14} className="text-emerald-400 cursor-pointer hover:text-emerald-300" />
          <Settings onClick={() => setShowProjectSettings(true)} size={14} className="text-gray-400 cursor-pointer hover:text-gray-200" />
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
