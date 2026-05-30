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
  targetPort: number
  methods: string[]
  stripPrefix: boolean
}

export interface GatewayConfig {
  platform: 'nginx' | 'express-proxy' | 'spring-cloud-gateway'
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
  language?: string
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

  setAPITesting: (testing) =>
    set((state) => ({
      apiTesting: { ...state.apiTesting, ...testing },
    })),
  resetAPITesting: () => set({ apiTesting: defaultAPITesting }),
}))
