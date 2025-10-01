'use client'

export default function TestSentry() {
  return (
    <button
      onClick={() => {
        throw new Error('Test Sentry error tracking')
      }}
      className="bg-red-600 text-white p-4 rounded"
    >
      Trigger Test Error
    </button>
  )
}