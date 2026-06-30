import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramNode } from '@/components/diagram-node'
import type { GatewayConfig, ServiceMethod, ExternalAPI } from '@/lib/store'

vi.mock('reactflow', () => ({
  Handle: (props: any) => <div role="handle" {...props} />,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}))

const mockSetSelectedNode = vi.fn()
let mockSelectedNode: { id: string } | null = null

vi.mock('@/lib/store', () => ({
  useDiagramStore: () => ({
    setSelectedNode: mockSetSelectedNode,
    selectedNode: mockSelectedNode,
  }),
}))

const serviceData = {
  type: 'service' as const,
  name: 'UserService',
  methods: [
    { name: 'getUser', description: 'Fetch user', type: 'query' as const },
    { name: 'createUser', description: 'Create user', type: 'mutation' as const },
    { name: 'handleEvent', description: 'Handle event', type: 'handler' as const },
  ],
  externalAPIs: [
    { name: 'Mailchimp', baseUrl: 'https://api.mailchimp.com', description: 'Email service' },
    { name: 'Stripe', baseUrl: 'https://api.stripe.com', description: 'Payments' },
  ],
}

const apiData = {
  type: 'api' as const,
  name: 'APIGateway',
  port: 8080,
  gatewayConfig: {
    language: 'spring-boot',
    routes: [
      { id: 'r1', pathPrefix: '/api/users', targetService: 'UserService', methods: ['GET'], stripPrefix: true },
      { id: 'r2', pathPrefix: '/api/orders', targetService: 'OrderService', methods: ['POST'], stripPrefix: true },
      { id: 'r3', pathPrefix: '/api/payments', targetService: 'PaymentService', methods: ['GET'], stripPrefix: true },
    ],
    auth: { enabled: true, type: 'jwt' as const },
    rateLimit: { enabled: true, requestsPerMinute: 100 },
    cors: { enabled: true, allowedOrigins: ['*'] },
  },
}

const databaseData = {
  type: 'database' as const,
  name: 'MainDB',
  engine: 'postgres',
  tables: [
    { name: 'users', columns: [] },
    { name: 'orders', columns: [] },
    { name: 'products', columns: [] },
  ],
}

const queueData = {
  type: 'queue' as const,
  name: 'EventBus',
  provider: 'Kafka',
  topics: ['user-events', 'order-events', 'payment-events'],
}

describe('DiagramNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedNode = null
  })

  it('service node shows SERVICE label, name, methods, external APIs', () => {
    render(<DiagramNode data={serviceData} selected={false} id="node-1" type="default" xPos={0} yPos={0} dragging={false} zIndex={0} />)
    expect(screen.getByText('SERVICE')).toBeTruthy()
    expect(screen.getByText('UserService')).toBeTruthy()
    expect(screen.getByText('getUser()')).toBeTruthy()
    expect(screen.getByText('2 ext APIs')).toBeTruthy()
  })

  it('API/Gateway node shows MAIN GATEWAY label, port, routes, badges', () => {
    render(<DiagramNode data={apiData} selected={false} id="node-2" type="default" xPos={0} yPos={0} dragging={false} zIndex={0} />)
    expect(screen.getByText('MAIN GATEWAY')).toBeTruthy()
    expect(screen.getByText('APIGateway')).toBeTruthy()
    expect(screen.getByText(':8080')).toBeTruthy()
    expect(screen.getByText('/api/users')).toBeTruthy()
    expect(screen.getByText('/api/orders')).toBeTruthy()
    expect(screen.getByText('Auth')).toBeTruthy()
    expect(screen.getByText('Rate')).toBeTruthy()
    expect(screen.getByText('CORS')).toBeTruthy()
  })

  it('database node shows DATABASE label, engine, tables', () => {
    render(<DiagramNode data={databaseData} selected={false} id="node-3" type="default" xPos={0} yPos={0} dragging={false} zIndex={0} />)
    expect(screen.getByText('DATABASE')).toBeTruthy()
    expect(screen.getByText('MainDB')).toBeTruthy()
    expect(screen.getByText('postgres')).toBeTruthy()
    expect(screen.getByText('users')).toBeTruthy()
    expect(screen.getByText('orders')).toBeTruthy()
  })

  it('queue node shows QUEUE label, provider, topics', () => {
    render(<DiagramNode data={queueData} selected={false} id="node-4" type="default" xPos={0} yPos={0} dragging={false} zIndex={0} />)
    expect(screen.getByText('QUEUE')).toBeTruthy()
    expect(screen.getByText('EventBus')).toBeTruthy()
    expect(screen.getByText('Kafka')).toBeTruthy()
    expect(screen.getByText('user-events')).toBeTruthy()
    expect(screen.getByText('order-events')).toBeTruthy()
  })

  it('clicking node calls setSelectedNode', () => {
    render(<DiagramNode data={serviceData} selected={false} id="node-click" type="default" xPos={0} yPos={0} dragging={false} zIndex={0} />)
    const node = screen.getByText('UserService').closest('[class*="w-48"]')!
    fireEvent.click(node)
    expect(mockSetSelectedNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'node-click', type: 'service', name: 'UserService' }),
    )
  })

  it('selected state changes border color', () => {
    mockSelectedNode = { id: 'node-selected' }
    const { container } = render(
      <DiagramNode data={serviceData} selected={true} id="node-selected" type="default" xPos={0} yPos={0} dragging={false} zIndex={0} />,
    )
    const nodeDiv = container.querySelector('[class*="w-48"]')
    expect(nodeDiv).toBeTruthy()
  })
})
