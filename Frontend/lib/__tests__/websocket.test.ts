import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let mockActivate: ReturnType<typeof vi.fn>
let mockDeactivate: ReturnType<typeof vi.fn>
let mockSubscribe: ReturnType<typeof vi.fn>
let mockPublish: ReturnType<typeof vi.fn>
let onConnectHandler: (() => void) | null

vi.mock('@stomp/stompjs', () => {
  mockActivate = vi.fn(function (this: any) {
    setTimeout(() => onConnectHandler?.(), 0)
  })
  mockDeactivate = vi.fn()
  mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
  mockPublish = vi.fn()

  return {
    Client: vi.fn().mockImplementation(function (this: any, config: any) {
      this.activate = mockActivate
      this.deactivate = mockDeactivate
      this.subscribe = mockSubscribe
      this.publish = mockPublish
      this.connected = true
      onConnectHandler = config.onConnect ?? null
    }),
  }
})

vi.mock('sockjs-client', () => ({
  default: vi.fn(),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  onConnectHandler = null

  const { stompClient: client } = await import('@/lib/websocket')
  client.disconnect()
})

afterEach(async () => {
  const { stompClient: client } = await import('@/lib/websocket')
  client.disconnect()
})

describe('StompClientWrapper', () => {
  it('connect creates a Client and activates it', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('test-token')
    await promise

    expect(mockActivate).toHaveBeenCalledOnce()
  })

  it('connect without token still works', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect()
    await promise

    expect(mockActivate).toHaveBeenCalledOnce()
  })

  it('connect returns the same promise if already connecting', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const p1 = stompClient.connect('token')
    const p2 = stompClient.connect('token')
    expect(p1).toBe(p2)

    await p1
  })

  it('disconnect deactivates and clears state', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    expect(stompClient.isConnected).toBe(true)

    stompClient.disconnect()
    expect(mockDeactivate).toHaveBeenCalled()
    expect(stompClient.isConnected).toBe(false)
  })

  it('subscribe calls client.subscribe and returns subscription id', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    const callback = vi.fn()
    const subId = stompClient.subscribe('/topic/events', callback)

    expect(subId).toBeDefined()
    expect(typeof subId).toBe('string')
    expect(mockSubscribe).toHaveBeenCalledWith('/topic/events', expect.any(Function))
  })

  it('subscribe parses JSON and calls callback with AgentEvent', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    const callback = vi.fn()
    stompClient.subscribe('/topic/events', callback)

    const subscribeHandler = mockSubscribe.mock.calls[0][1]
    subscribeHandler({ body: JSON.stringify({ eventId: 'e1', type: 'MESSAGE', payload: { content: 'hi' } }) })

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', type: 'MESSAGE' }))
  })

  it('unsubscribe removes subscription', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    const unsubSpy = vi.fn()
    mockSubscribe.mockReturnValue({ unsubscribe: unsubSpy })

    const subId = stompClient.subscribe('/topic/events', vi.fn())
    stompClient.unsubscribe(subId)
  })

  it('send publishes to destination with JSON body', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    stompClient.send('/app/user-input', { message: 'hello' })

    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/user-input',
      body: JSON.stringify({ message: 'hello' }),
    })
  })

  it('disconnect unsubscribes all active subscriptions', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    const unsubSpy = vi.fn()
    mockSubscribe.mockReturnValue({ unsubscribe: unsubSpy })

    stompClient.subscribe('/topic/a', vi.fn())
    stompClient.subscribe('/topic/b', vi.fn())

    stompClient.disconnect()
  })

  it('subscribeRaw passes raw IMessage without parsing', async () => {
    const { stompClient } = await import('@/lib/websocket')

    const promise = stompClient.connect('token')
    await promise

    const rawHandler = vi.fn()
    stompClient.subscribeRaw('/topic/raw', rawHandler)

    const subscribeHandler = mockSubscribe.mock.calls[0][1]
    const msg = { body: 'raw data', headers: {} }
    subscribeHandler(msg)

    expect(rawHandler).toHaveBeenCalledWith(msg)
  })
})
