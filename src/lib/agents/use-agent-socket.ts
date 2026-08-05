'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAgentStore } from './store'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

type AgentSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Connects to the agent-service mini-service (socket.io on port 3003, via the
 * Caddy gateway using XTransformPort). Wires all server->client events into the
 * Zustand store. Returns helpers for client->server commands.
 */
export function useAgentSocket() {
  const socketRef = useRef<AgentSocket | null>(null)
  const setConnected = useAgentStore((s) => s.setConnected)
  const setLastError = useAgentStore((s) => s.setLastError)
  const applyStatus = useAgentStore((s) => s.applyStatus)
  const appendStream = useAgentStore((s) => s.appendStream)
  const setSummary = useAgentStore((s) => s.setSummary)
  const upsertFinding = useAgentStore((s) => s.upsertFinding)
  const pushMemory = useAgentStore((s) => s.pushMemory)
  const setDag = useAgentStore((s) => s.setDag)

  useEffect(() => {
    let socket: AgentSocket | null = null
    let cancelled = false

    // Bootstrap the in-process socket.io server (port 3003) before connecting.
    fetch('/api/agent/bootstrap')
      .then(() => {
        if (cancelled) return
        socket = io('/?XTransformPort=3003', {
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 8,
          reconnectionDelay: 1200,
          timeout: 10000,
        })
        socketRef.current = socket

        socket.on('connect', () => setConnected(true))
        socket.on('disconnect', () => setConnected(false))

        socket.on('connect_ack', (payload) => {
          if (payload?.memory) payload.memory.forEach((e) => pushMemory(e))
          if (payload?.dag) setDag(payload.dag)
        })

        socket.on('room:status', (p) => applyStatus(p.roomId, p.status, p.failures, p.circuitOpen))
        socket.on('room:stream', (p) => {
          appendStream(p.roomId, p.chunk)
          if (p.done) useAgentStore.getState().finishStream(p.roomId)
        })
        socket.on('room:summary', (p) => setSummary(p.roomId, p.summary))
        socket.on('room:finding', (p) => {
          if (p.phase === 'committed') upsertFinding(p.roomId, p.finding)
        })
        socket.on('room:tripped', (p) => {
          applyStatus(p.roomId, 'tripped')
          setLastError(`Circuit tripped on ${p.roomId}: ${p.reason}`)
        })
        socket.on('memory:event', (p) => pushMemory(p.event))
        socket.on('dag:update', (p) => setDag(p.phase))

        socket.on('connect_error', (err: Error) => setLastError(`socket: ${err.message}`))
      })
      .catch((err: Error) => setLastError(`bootstrap: ${err.message}`))

    return () => {
      cancelled = true
      if (socket) socket.disconnect()
      socketRef.current = null
    }
  }, [setConnected, setLastError, applyStatus, appendStream, setSummary, upsertFinding, pushMemory, setDag])

  return {
    startRoom: (roomId: string) => socketRef.current?.emit('start:room', { roomId }),
    startAll: () => socketRef.current?.emit('start:all'),
    stopRoom: (roomId: string) => socketRef.current?.emit('stop:room', { roomId }),
    resetRoom: (roomId: string) => socketRef.current?.emit('reset:room', { roomId }),
  }
}
