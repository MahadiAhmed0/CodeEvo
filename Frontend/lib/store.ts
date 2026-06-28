import { create } from 'zustand'

export interface EndpointConfig {
  path: string
  method: string
  description?: string
  body?: string
}

export interface ColumnConfig {
  name: string
  type: string
}

export interface TableConfig {
  name: string
  columns: ColumnConfig[]
}

export interface GatewayRoute {
  id: string
  pathPrefix: string
  targetService: string
  methods: string[]
  stripPrefix: boolean
}

export interface GatewayConfig {
  language: 'spring-boot' | 'node.js' | 'go'
  routes: GatewayRoute[]
  auth: {
    enabled: boolean
    type: 'jwt' | 'api-key' | 'none'
  }
  rateLimit: {
    enabled: boolean
    requestsPerMinute: number
  }
  cors: {
    enabled: boolean
    allowedOrigins: string[]
  }
}

export interface ServiceMethod {
  name: string
  description: string
  type: 'query' | 'mutation' | 'handler'
}

export interface ExternalAPI {
  name: string
  baseUrl: string
  description: string
}

export interface Node {
  id: string
  type: 'service' | 'database' | 'queue' | 'api'
  name: string
  position: { x: number; y: number }
  port?: number
  engine?: string
  provider?: string
  endpoints?: EndpointConfig[]
  methods?: ServiceMethod[]
  externalAPIs?: ExternalAPI[]
  tables?: TableConfig[] | any[]
  collections?: TableConfig[] | any[]
  topics?: string[]
  gatewayConfig?: GatewayConfig
}

export interface Edge {
  id: string
  source: string
  target: string
  label?: string
  type?: 'rest' | 'db' | 'event'
}

export interface APITestingState {
  selectedEndpoint?: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  params: Record<string, string>
  headers: Record<string, string>
  body: string
  response?: {
    status: number
    data: any
    headers: Record<string, string>
    time: number
  }
  loading: boolean
}

export interface DockerProblem {
  id: string
  severity: 'error' | 'warning'
  source: 'docker' | 'build' | 'runtime'
  message: string
  raw: string
  context?: string[]
  filePath?: string
  line?: number
  column?: number
}

export interface ProjectSettings {
  environmentVariables: Record<string, string>
  aiApiKeys: {
    openai?: string
    anthropic?: string
    gemini?: string
    groq?: string
  }
}

interface DiagramStore {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  apiTesting: APITestingState
  isChatbotExpanded: boolean
  viewMode: 'graph' | 'code' | 'test'
  projectSettings: ProjectSettings
  showProjectSettings: boolean
  projectSettingsTab: string
  
  dockerStatus: 'BUILDING' | 'RUNNING' | 'STOPPED' | 'FAILED'
  dockerLogs: string[]
  dockerProblems: DockerProblem[]
  previewUrl: string | null
  
  setDockerStatus: (status: 'BUILDING' | 'RUNNING' | 'STOPPED' | 'FAILED') => void
  setDockerLogs: (logs: string[] | ((prev: string[]) => string[])) => void
  setDockerProblems: (problems: DockerProblem[] | ((prev: DockerProblem[]) => DockerProblem[])) => void
  setPreviewUrl: (url: string | null) => void
  setNodes: (nodes: Node[]) => void
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  addNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  
  setEdges: (edges: Edge[]) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  
  setSelectedNode: (node: Node | null) => void
  setIsChatbotExpanded: (expanded: boolean) => void
  setViewMode: (viewMode: 'graph' | 'code' | 'test') => void
  
  setProjectSettings: (settings: Partial<ProjectSettings>) => void
  setShowProjectSettings: (show: boolean) => void
  setProjectSettingsTab: (tab: string) => void
  
  setAPITesting: (testing: Partial<APITestingState>) => void
  resetAPITesting: () => void
}

const defaultAPITesting: APITestingState = {
  method: 'GET',
  url: '',
  params: {},
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
  },
  body: '',
  loading: false,
}

const buildProblemPatterns = [
  /\[ERROR\]/i,
  /\bERROR\b/i,
  /\bBUILD FAILURE\b/i,
  /\bCompilation failure\b/i,
  /\bcompilation error\b/i,
  /\bcannot find symbol\b/i,
  /\bpackage .* does not exist\b/i,
  /\berror:/i,
  /\bfailed to (build|compile|start|create|run)\b/i,
  /\bexited with code\b/i,
  /\bException\b/,
  /\bCaused by:/,
  /\bAPPLICATION FAILED TO START\b/i,
  /\bError starting ApplicationContext\b/i,
  /\bError creating bean\b/i,
  /\bUnsatisfiedDependencyException\b/i,
  /\bFailed to configure a DataSource\b/i,
  /\bParameter \d+ of constructor\b/i,
  /\bDescription:\b/i,
  /\bAction:\b/i,
]

const warningProblemPatterns = [
  /\[WARN(ING)?\]/i,
  /\bWARN(ING)?\b/i,
]

const benignWarningPatterns = [
  /the attribute `version` is obsolete/i,
  /spring\.jpa\.open-in-view is enabled by default/i,
  /initdb: warning: enabling "trust" authentication/i,
  /Container is running, but the app server did not respond before the readiness timeout/i,
]

const parseDockerProblems = (logs: string[]): DockerProblem[] => {
  const seen = new Set<string>()
  const problems: DockerProblem[] = []

  logs.forEach((raw, index) => {
    const line = raw.trim()
    if (!line) return

    const isError = buildProblemPatterns.some((pattern) => pattern.test(line))
    const isWarning = !isError && warningProblemPatterns.some((pattern) => pattern.test(line))
    if (!isError && !isWarning) return
    if (isWarning && benignWarningPatterns.some((pattern) => pattern.test(line))) return

    const fileMatch =
      line.match(/([A-Za-z]:?[^:\s]+?\.(?:java|kt|go|js|ts|tsx|jsx|xml|yml|yaml|json)):\[(\d+),(\d+)\]/) ||
      line.match(/([^\s:]+?\.(?:java|kt|go|js|ts|tsx|jsx|xml|yml|yaml|json)):(\d+):(\d+)/)

    const filePath = fileMatch?.[1]
    const lineNumber = fileMatch?.[2] ? Number(fileMatch[2]) : undefined
    const columnNumber = fileMatch?.[3] ? Number(fileMatch[3]) : undefined
    const dedupeKey = `${filePath || ''}:${lineNumber || ''}:${columnNumber || ''}:${line}`
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)

    const source: DockerProblem['source'] =
      /\b(build|compile|maven|gradle|javac|npm|typescript|tsc)\b/i.test(line) ? 'build' :
      /\b(container|docker|compose|network|image)\b/i.test(line) ? 'docker' :
      'runtime'

    const context = logs
      .slice(Math.max(0, index - 8), Math.min(logs.length, index + 18))
      .map((entry) => entry.trim())
      .filter(Boolean)

    problems.push({
      id: `${isError ? 'ERR' : 'WARN'}-${String(problems.length + 1).padStart(3, '0')}`,
      severity: isError ? 'error' : 'warning',
      source,
      message: line.replace(/^\[[A-Z]+\]\s*/i, '').slice(0, 1000),
      raw: line,
      context,
      filePath,
      line: lineNumber,
      column: columnNumber,
    })
  })

  return problems.slice(-100)
}

export const useDiagramStore = create<DiagramStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  apiTesting: defaultAPITesting,
  isChatbotExpanded: true,
  viewMode: 'graph',
  projectSettings: {
    environmentVariables: {
      'PORT': '8080',
      'NODE_ENV': 'development',
    },
    aiApiKeys: {}
  },
  showProjectSettings: false,
  projectSettingsTab: 'env',

  dockerStatus: 'STOPPED',
  dockerLogs: [],
  dockerProblems: [],
  previewUrl: null,

  setDockerStatus: (dockerStatus) => set({ dockerStatus }),
  setDockerLogs: (logs) => set((state) => {
    const dockerLogs = typeof logs === 'function' ? logs(state.dockerLogs) : logs
    return {
      dockerLogs,
      dockerProblems: parseDockerProblems(dockerLogs),
    }
  }),
  setDockerProblems: (dockerProblems) => set((state) => ({
    dockerProblems: typeof dockerProblems === 'function' ? dockerProblems(state.dockerProblems) : dockerProblems
  })),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),

  setNodes: (nodes) => set({ nodes }),
  updateNodePosition: (nodeId, position) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
    })),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    })),

  setEdges: (edges) => set({ edges }),
  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    })),

  setSelectedNode: (node) => set({ selectedNode: node }),
  setIsChatbotExpanded: (expanded) => set({ isChatbotExpanded: expanded }),
  setViewMode: (viewMode) => set({ viewMode }),

  setProjectSettings: (projectSettings) => set((state) => ({ projectSettings: { ...state.projectSettings, ...projectSettings } })),
  setShowProjectSettings: (showProjectSettings) => set({ showProjectSettings }),
  setProjectSettingsTab: (projectSettingsTab) => set({ projectSettingsTab }),

  setAPITesting: (testing) =>
    set((state) => ({
      apiTesting: { ...state.apiTesting, ...testing },
    })),
  resetAPITesting: () => set({ apiTesting: defaultAPITesting }),
}))
