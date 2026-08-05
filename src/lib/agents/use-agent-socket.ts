'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSwarmStore } from './store'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

type AgentSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Socket hook — OPT-IN connection.
 *
 * The socket.io server is NOT bootstrapped on page load (it caused sandbox
 * OOM crashes). Instead, the page renders with REST data only. The socket
 * is bootstrapped + connected on-demand when the user first launches a demo
 * or runs an agent (via `ensureConnected()`).
 */
export function useAgentSocket() {
  const socketRef = useRef<AgentSocket | null>(null)
  const bootstrappingRef = useRef(false)
  const setConnected = useSwarmStore((s) => s.setConnected)
  const setLastError = useSwarmStore((s) => s.setLastError)
  const applyStatus = useSwarmStore((s) => s.applyStatus)
  const appendStream = useSwarmStore((s) => s.appendStream)
  const setSummary = useSwarmStore((s) => s.setSummary)
  const upsertFinding = useSwarmStore((s) => s.upsertFinding)
  const pushMemory = useSwarmStore((s) => s.pushMemory)
  const setDag = useSwarmStore((s) => s.setDag)
  const upsertTask = useSwarmStore((s) => s.upsertTask)
  const appendTaskStream = useSwarmStore((s) => s.appendTaskStream)
  const upsertTaskFinding = useSwarmStore((s) => s.upsertTaskFinding)
  const pushReport = useSwarmStore((s) => s.pushReport)
  const setDemoRunning = useSwarmStore((s) => s.setDemoRunning)
  const connected = useSwarmStore((s) => s.connected)

  const wireSocket = useCallback((socket: AgentSocket) => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_ack', (p) => { if (p?.dag) setDag(p.dag) })
    socket.on('room:status', (p) => applyStatus(p.roomId, p.status, p.failures, p.circuitOpen))
    socket.on('room:stream', (p) => {
      appendStream(p.roomId, p.chunk)
      if (p.done) useSwarmStore.getState().finishStream(p.roomId)
    })
    socket.on('room:summary', (p) => setSummary(p.roomId, p.summary))
    socket.on('room:finding', (p) => { if (p.phase === 'committed') upsertFinding(p.roomId, p.finding) })
    socket.on('room:tripped', (p) => {
      applyStatus(p.roomId, 'tripped')
      setLastError(`Circuit tripped on ${p.roomId}: ${p.reason}`)
    })
    socket.on('memory:event', (p) => pushMemory(p.event))
    socket.on('dag:update', (p) => setDag(p.phase))
    socket.on('task:upsert', (p) => upsertTask(p.task))
    socket.on('task:stream', (p) => appendTaskStream(p.taskId, p.chunk))
    socket.on('task:finding', (p) => { if (p.phase === 'committed') upsertTaskFinding(p.taskId, p.finding) })
    socket.on('report:new', (p) => pushReport(p.report))
    socket.on('connect_error', (err: Error) => setLastError(`socket: ${err.message}`))
  }, [setConnected, setLastError, applyStatus, appendStream, setSummary, upsertFinding, pushMemory, setDag, upsertTask, appendTaskStream, upsertTaskFinding, pushReport])

  /** Bootstrap the socket server + connect. Returns the socket (or null on failure). */
  const ensureConnected = useCallback(async (): Promise<AgentSocket | null> => {
    if (socketRef.current?.connected) return socketRef.current
    if (bootstrappingRef.current) {
      // Wait for ongoing bootstrap.
      while (bootstrappingRef.current) await new Promise((r) => setTimeout(r, 200))
      return socketRef.current
    }
    bootstrappingRef.current = true
    try {
      await fetch('/api/agent/bootstrap')
      const socket: AgentSocket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
        timeout: 10000,
      })
      socketRef.current = socket
      wireSocket(socket)
      // Wait for connect (max 5s).
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 5000)
        socket.on('connect', () => { clearTimeout(timer); resolve() })
      })
      return socket
    } catch (err) {
      setLastError(`bootstrap: ${err instanceof Error ? err.message : 'failed'}`)
      return null
    } finally {
      bootstrappingRef.current = false
    }
  }, [wireSocket, setLastError])

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  return {
    connected,
    ensureConnected,
    startRoom: async (roomId: string) => {
      const s = await ensureConnected()
      s?.emit('start:room', { roomId })
    },
    startAll: async () => {
      const s = await ensureConnected()
      s?.emit('start:all')
    },
    stopRoom: (roomId: string) => socketRef.current?.emit('stop:room', { roomId }),
    resetRoom: (roomId: string) => socketRef.current?.emit('reset:room', { roomId }),
    launchDemo: async (mainGoal: string) => {
      setDemoRunning(true, mainGoal)
      const s = await ensureConnected()
      s?.emit('demo:launch', { mainGoal })
    },
    stopDemo: () => {
      setDemoRunning(false)
      socketRef.current?.emit('demo:stop')
    },
  }
}
