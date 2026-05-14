'use client'

import { useState } from 'react'
import { useDiagramStore } from '@/lib/store'
import { ChevronDown, Send, Copy, Trash2 } from 'lucide-react'

export function APITester() {
  const { apiTesting, setAPITesting } = useDiagramStore()
  const [expandedSection, setExpandedSection] = useState<'request' | 'response' | null>('request')
  const [copied, setCopied] = useState(false)

  const handleSendRequest = async () => {
    setAPITesting({ loading: true })
    
    try {
      // Simulate API call with mock response
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockResponses: Record<string, any> = {
        '/users': { id: 1, name: 'John Doe', email: 'john@example.com' },
        '/orders': { orderId: 'ORD123', status: 'shipped', total: 299.99 },
        '/payments': { transactionId: 'TXN456', status: 'success', amount: 299.99 },
      }

      const responseData = mockResponses[apiTesting.url] || {
        message: 'Mock response from ' + apiTesting.url,
        method: apiTesting.method,
        timestamp: new Date().toISOString(),
      }

      setAPITesting({
        response: {
          status: 200,
          data: responseData,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': '145ms',
          },
          time: 145,
        },
        loading: false,
      })
    } catch (error) {
      setAPITesting({
        response: {
          status: 500,
          data: { error: 'Request failed' },
          headers: {},
          time: 0,
        },
        loading: false,
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-[#004aad]/5 to-[#cb6ce6]/5 rounded-lg border border-gradient-to-r p-4">
        <h3 className="font-bold text-[#0b1c2c] mb-4 flex items-center gap-2">
          <span className="text-lg">🧪</span>
          API Testing
        </h3>

        {/* Method & URL */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <select
              value={apiTesting.method}
              onChange={(e) =>
                setAPITesting({
                  method: e.target.value as any,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white text-[#004aad] focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>
            <input
              type="text"
              value={apiTesting.url}
              onChange={(e) => setAPITesting({ url: e.target.value })}
              placeholder="e.g., /users or /orders"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            />
          </div>
        </div>

        {/* Request Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              setExpandedSection(
                expandedSection === 'request' ? null : 'request'
              )
            }
            className="w-full px-4 py-3 bg-[#004aad] text-white font-semibold flex items-center justify-between hover:bg-[#003a8d] transition-colors"
          >
            <span>Request</span>
            <ChevronDown
              size={16}
              className={`transform transition-transform ${
                expandedSection === 'request' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'request' && (
            <div className="p-4 bg-white space-y-3 border-t border-gray-200">
              {/* Headers */}
              <div>
                <label className="text-xs font-semibold text-[#0b1c2c] block mb-2">
                  Headers
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(apiTesting.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="font-mono text-gray-600 flex-1">
                        {key}: {value}
                      </span>
                      <button
                        onClick={() =>
                          setAPITesting({
                            headers: Object.fromEntries(
                              Object.entries(apiTesting.headers).filter(
                                ([k]) => k !== key
                              )
                            ),
                          })
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              {['POST', 'PUT', 'PATCH'].includes(apiTesting.method) && (
                <div>
                  <label className="text-xs font-semibold text-[#0b1c2c] block mb-2">
                    Body (JSON)
                  </label>
                  <textarea
                    value={apiTesting.body}
                    onChange={(e) => setAPITesting({ body: e.target.value })}
                    placeholder='{"key": "value"}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                    rows={4}
                  />
                </div>
              )}

              <button
                onClick={handleSendRequest}
                disabled={apiTesting.loading}
                className="w-full bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Send size={16} />
                {apiTesting.loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          )}
        </div>

        {/* Response Section */}
        {apiTesting.response && (
          <div className="border border-gray-200 rounded-lg overflow-hidden mt-3">
            <button
              onClick={() =>
                setExpandedSection(
                  expandedSection === 'response' ? null : 'response'
                )
              }
              className="w-full px-4 py-3 bg-[#cb6ce6] text-white font-semibold flex items-center justify-between hover:bg-[#b55cc0] transition-colors"
            >
              <span>
                Response ({apiTesting.response.status} -{' '}
                {apiTesting.response.time}ms)
              </span>
              <ChevronDown
                size={16}
                className={`transform transition-transform ${
                  expandedSection === 'response' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'response' && (
              <div className="p-4 bg-white space-y-3 border-t border-gray-200">
                {/* Response Headers */}
                <div>
                  <label className="text-xs font-semibold text-[#0b1c2c] block mb-2">
                    Response Headers
                  </label>
                  <div className="space-y-1 text-xs font-mono text-gray-600 max-h-20 overflow-y-auto bg-gray-50 p-2 rounded">
                    {Object.entries(apiTesting.response.headers).map(
                      ([key, value]) => (
                        <div key={key}>
                          <span className="text-blue-600">{key}</span>:{' '}
                          {String(value)}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Response Body */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#0b1c2c]">
                      Response Body
                    </label>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(apiTesting.response.data, null, 2)
                        )
                      }
                      className="text-xs text-[#004aad] hover:text-[#003a8d] flex items-center gap-1"
                    >
                      <Copy size={12} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-48 overflow-y-auto text-gray-700">
                    {JSON.stringify(apiTesting.response.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
