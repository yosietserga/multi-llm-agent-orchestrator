'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSwarmStore } from './store'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

type AgentSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useAgentSocket() {
  const socketRef = useRef<AgentSocket | null>(null)
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

  useEffect(() => {
    let socket: AgentSocket | null = null
    let cancelled = false

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
          if (payload?.dag) setDag(payload.dag)
        })
        socket.on('room:status', (p) => applyStatus(p.roomId, p.status, p.failures, p.circuitOpen))
        socket.on('room:stream', (p) => {
          appendStream(p.roomId, p.chunk)
          if (p.done) useSwarmStore.getState().finishStream(p.roomId)
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
        socket.on('task:upsert', (p) => upsertTask(p.task))
        socket.on('task:stream', (p) => appendTaskStream(p.taskId, p.chunk))
        socket.on('task:finding', (p) => {
          if (p.phase === 'committed') upsertTaskFinding(p.taskId, p.finding)
        })
        socket.on('report:new', (p) => pushReport(p.report))
        socket.on('connect_error', (err: Error) => setLastError(`socket: ${err.message}`))
      })
      .catch((err: Error) => setLastError(`bootstrap: ${err.message}`))

    return () => {
      cancelled = true
      if (socket) socket.disconnect()
      socketRef.current = null
    }
  }, [
    setConnected,
    setLastError,
    applyStatus,
    appendStream,
    setSummary,
    upsertFinding,
    pushMemory,
    setDag,
    upsertTask,
    appendTaskStream,
    upsertTaskFinding,
    pushReport,
    setDemoRunning,
  ])

  return {
    startRoom: (roomId: string) => socketRef.current?.emit('start:room', { roomId }),
    startAll: () => socketRef.current?.emit('start:all'),
    stopRoom: (roomId: string) => socketRef.current?.emit('stop:room', { roomId }),
    resetRoom: (roomId: string) => socketRef.current?.emit('reset:room', { roomId }),
    launchDemo: (mainGoal: string) => {
      setDemoRunning(true, mainGoal)
      socketRef.current?.emit('demo:launch', { mainGoal })
    },
    stopDemo: () => {
      setDemoRunning(false)
      socketRef.current?.emit('demo:stop')
    },
  }
}
