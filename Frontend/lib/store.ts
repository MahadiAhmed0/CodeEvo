import { create } from 'zustand'

export interface Node {
  id: string
  type: 'service' | 'database' | 'queue'
  name: string
  position: { x: number; y: number }
  language?: string
  port?: number
  engine?: string
  provider?: string
  endpoints?: string[]
  collections?: string[]
  topics?: string[]
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

interface DiagramStore {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  apiTesting: APITestingState
  
  setNodes: (nodes: Node[]) => void
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  addNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  
  setEdges: (edges: Edge[]) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  
  setSelectedNode: (node: Node | null) => void
  
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

  setAPITesting: (testing) =>
    set((state) => ({
      apiTesting: { ...state.apiTesting, ...testing },
    })),
  resetAPITesting: () => set({ apiTesting: defaultAPITesting }),
}))
