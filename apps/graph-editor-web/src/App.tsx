import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  type GraphDefinition,
  type GraphMetadata,
  type NodeInstance,
  type EdgeInstance,
  type NodeTypeDefinition,
  type EdgeTypeDefinition,
  type ProjectRegistry,
  type ValidationError,
  type ValidationWarning,
  ProjectRegistry as RuntimeProjectRegistry,
  analyzeGraph,
} from "@fiction-map/core"
import { createRuntimeFromGraph, registerBuiltins } from "@fiction-map/runtime"

type ValidationMessage = {
  level: "error" | "warning"
  source: string
  code: string
  message: string
}

type FlowNode = Node<{ nodeId: string; display: string }, "default">
type FlowEdge = Edge<{ edgeId: string; display: string }, "default">

interface RegistryPayload {
  nodeTypesById: Map<string, NodeTypeDefinition>
  edgeTypesById: Map<string, EdgeTypeDefinition>
}

function safeStringify(value: unknown, fallback = ""): string {
  if (value === undefined) return fallback
  try {
    if (typeof value === "string") return value
    return JSON.stringify(value, null, 2)
  } catch {
    return fallback
  }
}

function parseJsonArray(raw: string): { value: unknown; valid: boolean } {
  if (raw.trim() === "") {
    return { value: undefined, valid: true }
  }
  try {
    return { value: JSON.parse(raw), valid: true }
  } catch {
    return { value: undefined, valid: false }
  }
}

function parseJsonObject(raw: string): { value: unknown; valid: boolean } {
  if (raw.trim() === "") {
    return { value: undefined, valid: true }
  }
  try {
    return { value: JSON.parse(raw), valid: true }
  } catch {
    return { value: undefined, valid: false }
  }
}

function makeSeededRegistry(metadata: GraphMetadata): ProjectRegistry {
  const registry = new RuntimeProjectRegistry()

  if (metadata.structs) {
    for (const def of metadata.structs) {
      registry.structs.set(def.id, def)
    }
  }

  for (const def of metadata.nodeTypes) {
    registry.nodeTypes.set(def.id, def)
  }
  for (const def of metadata.edgeTypes) {
    registry.edgeTypes.set(def.id, def)
  }
  for (const def of metadata.conditions) {
    registry.conditions.set(def.id, def)
  }
  for (const def of metadata.effects) {
    registry.effects.set(def.id, def)
  }

  registerBuiltins(registry)

  return registry
}

function mapRegistry(registry: ProjectRegistry): RegistryPayload {
  return {
    nodeTypesById: new Map(Array.from(registry.nodeTypes.entries())),
    edgeTypesById: new Map(Array.from(registry.edgeTypes.entries())),
  }
}

function computeValidationMessages(
  graph: GraphDefinition,
  registry: ProjectRegistry,
): { graph: GraphDefinition; messages: ValidationMessage[] } {
  const analysis = analyzeGraph(registry, graph.nodes, graph.edges)
  const messageMap: ValidationMessage[] = []

  for (const err of analysis.errors) {
    messageMap.push({
      level: "error",
      source: "core/analyze",
      code: err.code,
      message: err.message,
    })
  }
  for (const warning of analysis.warnings) {
    messageMap.push({
      level: "warning",
      source: "core/analyze",
      code: warning.code,
      message: warning.message,
    })
  }

  let runtimeErrors: ValidationError[] = []
  try {
    const runtime = createRuntimeFromGraph(graph)
    const runtimeValidation = runtime.validate()
    for (const err of runtimeValidation.errors) {
      runtimeErrors.push({
        code: err.type,
        message: `[runtime:${err.type}] ${err.message}`,
        nodeId: err.nodeId,
        edgeId: err.transitionId,
      })
    }
  } catch (error) {
    runtimeErrors.push({
      code: "RUNTIME_CONSTRUCTION_FAILED",
      message: `Unable to construct runtime for validation: ${(error as Error).message}`,
    })
  }

  const mergedWarnings: ValidationWarning[] = [...analysis.warnings]
  const mergedErrors: ValidationError[] = [...analysis.errors, ...runtimeErrors]

  for (const err of runtimeErrors) {
    messageMap.push({
      level: "error",
      source: "runtime/validate",
      code: err.code,
      message: err.message,
    })
  }

  return {
    graph: {
      ...graph,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      maxDepth: analysis.maxDepth,
      endings: analysis.endings,
      nodeTypesUsed: analysis.nodeTypesUsed,
      edgeTypesUsed: analysis.edgeTypesUsed,
      conditionsUsed: analysis.conditionsUsed,
      effectsUsed: analysis.effectsUsed,
      errors: mergedErrors,
      warnings: mergedWarnings,
    },
    messages: messageMap,
  }
}

function getInitialNodePosition(index: number): { x: number; y: number } {
  return {
    x: (index % 8) * 220,
    y: Math.floor(index / 8) * 160,
  }
}

function getFailureTarget(edge: EdgeInstance | null): string {
  if (!edge) {
    return ""
  }

  const next = (edge as EdgeInstance & { failureTarget?: unknown }).failureTarget
  const legacy = (edge as EdgeInstance & { failureTargetNodeId?: unknown }).failureTargetNodeId

  if (typeof next === "string" && next.length > 0) {
    return next
  }
  if (typeof legacy === "string") {
    return legacy
  }
  return ""
}

export default function App() {
  const [metadata, setMetadata] = useState<GraphMetadata | null>(null)
  const [graph, setGraph] = useState<GraphDefinition | null>(null)
  const [graphStatus, setGraphStatus] = useState("Load a metadata.json to begin editing.")

  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([])

  const [registryPayload, setRegistryPayload] = useState<RegistryPayload | null>(null)
  const [registry, setRegistry] = useState<ProjectRegistry | null>(null)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})

  const [nodeBlocksText, setNodeBlocksText] = useState("")
  const [nodeEnterEffectsText, setNodeEnterEffectsText] = useState("")
  const [nodeCustomText, setNodeCustomText] = useState("")

  const [edgeConditionsText, setEdgeConditionsText] = useState("")
  const [edgeEffectsText, setEdgeEffectsText] = useState("")
  const [edgeFailureEffectsText, setEdgeFailureEffectsText] = useState("")
  const [edgeCustomText, setEdgeCustomText] = useState("")

  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph, selectedNodeId],
  )

  const selectedEdge = useMemo(
    () => graph?.edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [graph, selectedEdgeId],
  )

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<FlowNode>([])

  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

  const errors = validationMessages.filter((message) => message.level === "error")
  const warnings = validationMessages.filter((message) => message.level === "warning")

  const graphName = graph?.id ?? "(no graph selected)"

  const exportableMetadata = useMemo(() => {
    if (!metadata || !graph) {
      return null
    }
    return {
      ...metadata,
      graphs: [graph],
      validation: {
        errors: graph.errors,
        warnings: graph.warnings,
      },
    }
  }, [metadata, graph])

  const graphToFlow = useCallback((value: GraphDefinition): { nodes: FlowNode[]; edges: FlowEdge[] } => {
    const nextNodes: FlowNode[] = value.nodes.map((node, index) => {
      const persisted = nodePositions[node.id]
      const position = persisted ?? getInitialNodePosition(index)
      return {
        id: node.id,
        type: "default",
        position,
        data: {
          nodeId: node.id,
          display: `${node.id} (${node.type})`,
        },
      }
    })

    const nextEdges: FlowEdge[] = value.edges.map((edge) => {
      const label = typeof edge.text === "string" ? edge.text : edge.id
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label,
        data: {
          edgeId: edge.id,
          display: `${edge.source} → ${edge.target}`,
        },
      }
    })

    return { nodes: nextNodes, edges: nextEdges }
  }, [nodePositions])

  const syncSelectionAndCanvas = useCallback(
    (value: GraphDefinition | null) => {
      if (!value) {
        setFlowNodes([])
        setFlowEdges([])
        return
      }

      const next = graphToFlow(value)
      setFlowNodes(next.nodes)
      setFlowEdges(next.edges)
    },
    [graphToFlow, setFlowEdges, setFlowNodes],
  )

  const runValidation = useCallback(
    (value: GraphDefinition) => {
      if (!registry) {
        return value
      }

      const { graph: recomputed, messages } = computeValidationMessages(value, registry)
      setValidationMessages(messages)

      if (!metadata) {
        return recomputed
      }

      setMetadata((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          graphs: [recomputed],
          validation: {
            errors: recomputed.errors,
            warnings: recomputed.warnings,
          },
        }
      })

      return recomputed
    },
    [metadata, registry],
  )

  const setMetadataFromFile = useCallback(
    async (file: File) => {
      try {
        const raw = await file.text()
        const parsed = JSON.parse(raw) as GraphMetadata

        if (!parsed.nodeTypes || !parsed.edgeTypes || !parsed.graphs || parsed.graphs.length === 0) {
          setGraphStatus("Uploaded metadata.json appears invalid. Expected nodeTypes, edgeTypes, and graphs.")
          return
        }

        const graphPayload = parsed.graphs[0]
        const seededRegistry = makeSeededRegistry(parsed)

        const { graph: recomputed, messages } = computeValidationMessages(graphPayload, seededRegistry)
        const seededGraph = {
          ...recomputed,
        }

        setMetadata({
          ...parsed,
          graphs: [seededGraph],
          validation: {
            errors: seededGraph.errors,
            warnings: seededGraph.warnings,
          },
        })

        setRegistry(seededRegistry)
        setRegistryPayload(mapRegistry(seededRegistry))
        setGraph(seededGraph)
        setSelectedNodeId(seededGraph.nodes[0]?.id ?? null)
        setSelectedEdgeId(null)
        setValidationMessages(messages)
        setGraphStatus(`Loaded ${parsed.graphs.length} graph(s) from file. Editing first graph: ${seededGraph.id}.`)
      } catch {
        setGraphStatus("Could not parse metadata.json. Ensure it is valid JSON with a top-level graphs array.")
      }
    },
    [],
  )

  useEffect(() => {
    if (!graph) {
      return
    }

    syncSelectionAndCanvas(graph)

    if (selectedNode) {
      setNodeBlocksText(safeStringify(selectedNode.blocks, "[]"))
      setNodeEnterEffectsText(safeStringify(selectedNode.enterEffects, "[]"))
      const { id, type, blocks, autoResolve, enterEffects, ...rest } = selectedNode
      setNodeCustomText(safeStringify(rest, "{}"))
    } else {
      setNodeBlocksText("")
      setNodeEnterEffectsText("")
      setNodeCustomText("")
    }

    if (selectedEdge) {
      setEdgeConditionsText(safeStringify(selectedEdge.conditions ?? [], "[]"))
      setEdgeEffectsText(safeStringify(selectedEdge.effects ?? [], "[]"))
      setEdgeFailureEffectsText(safeStringify(selectedEdge.failureEffects ?? [], "[]"))
      const {
        id,
        type,
        source,
        target,
        anchorBlockId,
        conditions,
        effects,
        failureEffects,
        ...rest
      } = selectedEdge
      setEdgeCustomText(safeStringify(rest, "{}"))
    } else {
      setEdgeConditionsText("")
      setEdgeEffectsText("")
      setEdgeFailureEffectsText("")
      setEdgeCustomText("")
    }
  }, [graph, selectedNode, selectedEdge, syncSelectionAndCanvas])

  const updateGraph = useCallback(
    (updater: (current: GraphDefinition) => GraphDefinition) => {
      setGraph((current) => {
        if (!current) {
          return current
        }

        const next = runValidation(updater(current))
        return next
      })
    },
    [runValidation],
  )

  const selectNodeType = useCallback(
    (nodeTypeId: string) => {
      if (!selectedNode) {
        return
      }

      updateGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                type: nodeTypeId,
              }
            : node,
        ),
      }))
    },
    [selectedNode, updateGraph],
  )

  const selectEdgeType = useCallback(
    (edgeTypeId: string) => {
      if (!selectedEdge) {
        return
      }

      updateGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) =>
          edge.id === selectedEdge.id
            ? {
                ...edge,
                type: edgeTypeId,
              }
            : edge,
        ),
      }))
    },
    [selectedEdge, updateGraph],
  )

  const onNodeAdd = useCallback(() => {
    if (!graph || !registryPayload) {
      return
    }

    const fallbackType = graph.nodes[0]?.type ?? "scene"
    const nodeTypeId = registryPayload.nodeTypesById.has(fallbackType)
      ? fallbackType
      : registryPayload.nodeTypesById.keys().next().value

    if (!nodeTypeId) {
      return
    }

    const nextId = `node-${graph.nodes.length + 1}`
    const node: NodeInstance = { id: nextId, type: nodeTypeId, blocks: [] }

    updateGraph((current) => ({
      ...current,
      nodes: [...current.nodes, node],
    }))

    setSelectedNodeId(nextId)
    setSelectedEdgeId(null)
  }, [graph, registryPayload, updateGraph])

  const onEdgeCreate = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !graph || !registryPayload) {
        return
      }

      const fallbackEdgeType = graph.edges[0]?.type ?? "choice"
      const edgeTypeId = registryPayload.edgeTypesById.has(fallbackEdgeType)
        ? fallbackEdgeType
        : registryPayload.edgeTypesById.keys().next().value

      if (!edgeTypeId) {
        return
      }

      const nextId = `edge-${graph.edges.length + 1}`
      const newEdge: EdgeInstance = {
        id: nextId,
        type: edgeTypeId,
        source: connection.source,
        target: connection.target,
      }

      updateGraph((current) => ({
        ...current,
        edges: [...current.edges, newEdge],
      }))

      setFlowEdges((existing) =>
        addEdge(
          {
            id: nextId,
            source: connection.source as string,
            target: connection.target as string,
            data: {
              edgeId: newEdge.id,
              display: `${newEdge.source} → ${newEdge.target}`,
            },
          },
          existing,
        ),
      )
      setSelectedEdgeId(newEdge.id)
      setSelectedNodeId(null)
    },
    [graph, registryPayload, setFlowEdges, updateGraph],
  )

  const onNodeDelete = useCallback(() => {
    if (!graph || !selectedNodeId) {
      return
    }

    updateGraph((current) => {
      const nextNodes = current.nodes.filter((node) => node.id !== selectedNodeId)
      const nextEdges = current.edges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      )
      setFlowNodes((edges) => edges.filter((entry) => entry.id !== selectedNodeId))
      setFlowEdges((edges) =>
        edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
      )
      return {
        ...current,
        nodes: nextNodes,
        edges: nextEdges,
      }
    })

    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [graph, selectedNodeId, setFlowEdges, setFlowNodes, updateGraph])

  const onEdgeDelete = useCallback(() => {
    if (!graph || !selectedEdgeId) {
      return
    }

    updateGraph((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
    }))

    setFlowEdges((existing) => existing.filter((edge) => edge.id !== selectedEdgeId))
    setSelectedEdgeId(null)
  }, [graph, selectedEdgeId, setFlowEdges, updateGraph])

  const onNodeToggleAutoResolve = useCallback(
    (checked: boolean) => {
      if (!selectedNode) {
        return
      }
      updateGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id ? { ...node, autoResolve: checked ? true : undefined } : node,
        ),
      }))
    },
    [selectedNode, updateGraph],
  )

  const onEdgeFieldText = useCallback(
    (field: string, raw: string) => {
      if (!selectedEdge) {
        return
      }

      updateGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) =>
          edge.id === selectedEdge.id ? { ...edge, [field]: raw } : edge,
        ),
      }))
    },
    [selectedEdge, updateGraph],
  )

  const onEdgeSourceChange = useCallback(
    (raw: string) => {
      if (!selectedEdge) {
        return
      }
      onEdgeFieldText("source", raw)
      setFlowEdges((existing) =>
        existing.map((flowEdge) =>
          flowEdge.id === selectedEdge.id ? { ...flowEdge, source: raw } : flowEdge,
        ),
      )
    },
    [onEdgeFieldText, selectedEdge, setFlowEdges],
  )

  const onEdgeTargetChange = useCallback(
    (raw: string) => {
      if (!selectedEdge) {
        return
      }
      onEdgeFieldText("target", raw)
      setFlowEdges((existing) =>
        existing.map((flowEdge) =>
          flowEdge.id === selectedEdge.id ? { ...flowEdge, target: raw } : flowEdge,
        ),
      )
    },
    [onEdgeFieldText, selectedEdge, setFlowEdges],
  )

  const onEdgeFailureTargetCommit = useCallback(
    (raw: string) => {
      if (!selectedEdge) {
        return
      }
      const next = raw.length > 0 ? raw : undefined
      updateGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) =>
          edge.id === selectedEdge.id
            ? {
                ...edge,
                failureTarget: next,
              }
            : edge,
        ),
      }))
    },
    [selectedEdge, updateGraph],
  )

  const onNodeFlowDragStop = useCallback((_e: unknown, node: FlowNode) => {
    setNodePositions((current) => ({
      ...current,
      [node.id]: node.position,
    }))
  }, [])

  const onEdgesChangeWithCleanup = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      const deleted = changes.filter((change) => change.type === "remove")
      if (deleted.length > 0 && selectedEdgeId) {
        setSelectedEdgeId(null)
      }
      onEdgesChange(changes)
    },
    [onEdgesChange, selectedEdgeId],
  )

  const onNodesChangeWithCleanup = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      const removed = changes.some((change) => change.type === "remove")
      if (removed && selectedNodeId) {
        setSelectedNodeId(null)
      }
      onNodesChange(changes)
    },
    [onNodesChange, selectedNodeId],
  )

  const onNodeClick = useCallback((_event: unknown, flowNode: FlowNode) => {
    setSelectedNodeId(flowNode.data.nodeId)
    setSelectedEdgeId(null)
  }, [])

  const onEdgeClick = useCallback((_event: unknown, flowEdge: FlowEdge) => {
    setSelectedEdgeId(flowEdge.data?.edgeId ?? flowEdge.id)
    setSelectedNodeId(null)
  }, [])

  const onEdgeCommitArray = useCallback(
    (key: "conditions" | "effects" | "failureEffects", raw: string) => {
      if (!selectedEdge) {
        return
      }
      const parsed = parseJsonArray(raw)
      if (!parsed.valid) {
        return
      }

      const parsedValue = (parsed.value as unknown[]) ?? []
      updateGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) =>
          edge.id === selectedEdge.id
            ? {
                ...edge,
                [key]: Array.isArray(parsedValue) ? parsedValue : [],
              }
            : edge,
        ),
      }))
    },
    [selectedEdge, updateGraph],
  )

  const onEdgeCustomCommit = useCallback(
    (raw: string) => {
      if (!selectedEdge) {
        return
      }
      const parsed = parseJsonObject(raw)
      if (!parsed.valid && raw.trim() !== "") {
        return
      }

      const next = parsed.value as Record<string, unknown> | undefined

      updateGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) => {
          if (edge.id !== selectedEdge.id) {
            return edge
          }

          const base: EdgeInstance = {
            ...edge,
          }

          const nextEntries = next ?? {}
          return {
            ...base,
            ...nextEntries,
          }
        }),
      }))
    },
    [selectedEdge, updateGraph],
  )

  const onNodeCustomCommit = useCallback(
    (raw: string) => {
      if (!selectedNode) {
        return
      }
      const parsed = parseJsonObject(raw)
      if (!parsed.valid && raw.trim() !== "") {
        return
      }

      const next = parsed.value as Record<string, unknown> | undefined
      updateGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                ...next,
              }
            : node,
        ),
      }))
    },
    [selectedNode, updateGraph],
  )

  const onBlocksCommit = useCallback(
    (raw: string) => {
      if (!selectedNode) {
        return
      }
      const parsed = parseJsonArray(raw)
      if (!parsed.valid && raw.trim() !== "") {
        return
      }

      updateGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id ? { ...node, blocks: (parsed.value as never[]) ?? [] } : node,
        ),
      }))
    },
    [selectedNode, updateGraph],
  )

  const onEnterEffectsCommit = useCallback(
    (raw: string) => {
      if (!selectedNode) {
        return
      }
      const parsed = parseJsonArray(raw)
      if (!parsed.valid && raw.trim() !== "") {
        return
      }

      updateGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id
            ? { ...node, enterEffects: (parsed.value as never[]) ?? [] }
            : node,
        ),
      }))
    },
    [selectedNode, updateGraph],
  )

  const onExport = useCallback(() => {
    if (!exportableMetadata) {
      return
    }

    const blob = new Blob([JSON.stringify(exportableMetadata, null, 2)], {
      type: "application/json",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${graphName}-metadata.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [exportableMetadata, graphName])

  const nodeTypeOptions = useMemo(() => {
    if (!registryPayload) {
      return []
    }
    return Array.from(registryPayload.nodeTypesById.values())
  }, [registryPayload])

  const edgeTypeOptions = useMemo(() => {
    if (!registryPayload) {
      return []
    }
    return Array.from(registryPayload.edgeTypesById.values())
  }, [registryPayload])

  const selectedNodeDisplay = selectedNode ? `Node: ${selectedNode.id} (${selectedNode.type})` : ""
  const selectedEdgeDisplay = selectedEdge
    ? `${selectedEdge.id}: ${selectedEdge.source} -> ${selectedEdge.target}`
    : ""

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <header className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Graph Editor (Single-Graph Reference)</h1>
          <p className="text-sm text-slate-300">Currently editing: {graphName}</p>
          <p className="text-xs text-slate-400">{graphStatus}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm">
            <span>Load metadata.json</span>
            <input
              accept="application/json"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  setMetadataFromFile(file)
                }
              }}
            />
          </label>
          <button
            className="rounded-md border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-500/10"
            onClick={onExport}
            type="button"
            disabled={!graph || !exportableMetadata}
          >
            Export metadata.json
          </button>
          <button
            className="rounded-md border border-indigo-500 px-3 py-2 text-sm hover:bg-indigo-500/10"
            onClick={onNodeAdd}
            type="button"
            disabled={!graph}
          >
            Add node
          </button>
        </div>
      </header>

      {!graph ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          <p>
            This app supports editing one graph from a metadata.json export. Import a file, edit nodes,
            edges, conditions, and effects, then export a refreshed metadata.json.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_460px] gap-4">
          <section className="h-[72vh] rounded-lg border border-slate-800 bg-slate-900 p-2">
              <ReactFlow
                className="h-full"
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={onNodesChangeWithCleanup}
                onEdgesChange={onEdgesChangeWithCleanup}
                onNodeDragStop={onNodeFlowDragStop}
              onConnect={onEdgeCreate}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={() => {
                setSelectedNodeId(null)
                setSelectedEdgeId(null)
              }}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </section>

          <aside className="space-y-3">
            <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-2 font-semibold">Validation</h2>
              <p className="text-xs text-slate-400">Errors: {errors.length} • Warnings: {warnings.length}</p>
              <div className="mt-2 max-h-44 overflow-auto space-y-2 text-xs">
                {validationMessages.length === 0 ? (
                  <p className="text-emerald-400">No issues detected.</p>
                ) : (
                    validationMessages.map((entry) => (
                    <p key={`${entry.source}-${entry.code}-${entry.message}`}>
                      <span
                        className={
                          entry.level === "error" ? "text-rose-300" : "text-amber-300"
                        }
                      >
                        [{entry.source}] {entry.code}:
                      </span>
                      <span className="text-slate-300"> {entry.message}</span>
                    </p>
                  ))
                )}
              </div>
            </section>

            {selectedNode ? (
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Node Editor</h2>
                  <button
                    className="rounded border border-rose-600 px-2 py-1 text-xs hover:bg-rose-600/15"
                    onClick={onNodeDelete}
                    type="button"
                  >
                    Delete node
                  </button>
                </div>
                <p className="text-sm text-slate-400">{selectedNodeDisplay}</p>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Node type</span>
                  <select
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    value={selectedNode.type}
                    onChange={(event) => {
                      selectNodeType(event.target.value)
                    }}
                  >
                    {nodeTypeOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <input
                    checked={!!selectedNode.autoResolve}
                    onChange={(event) => onNodeToggleAutoResolve(event.target.checked)}
                    type="checkbox"
                  />
                  Auto Resolve
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Blocks (JSON)</span>
                  <textarea
                    key={`${selectedNode.id}-blocks`}
                    className="w-full min-h-24 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={nodeBlocksText}
                    onBlur={(event) => onBlocksCommit(event.target.value)}
                    onChange={(event) => setNodeBlocksText(event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Enter Effects (JSON array)</span>
                  <textarea
                    key={`${selectedNode.id}-effects`}
                    className="w-full min-h-24 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={nodeEnterEffectsText}
                    onBlur={(event) => onEnterEffectsCommit(event.target.value)}
                    onChange={(event) => setNodeEnterEffectsText(event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Node custom payload (JSON object)</span>
                  <textarea
                    key={`${selectedNode.id}-custom`}
                    className="w-full min-h-20 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={nodeCustomText}
                    onBlur={(event) => onNodeCustomCommit(event.target.value)}
                    onChange={(event) => setNodeCustomText(event.target.value)}
                  />
                </label>
              </section>
            ) : null}

            {selectedEdge ? (
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Edge Editor</h2>
                  <button
                    className="rounded border border-rose-600 px-2 py-1 text-xs hover:bg-rose-600/15"
                    onClick={onEdgeDelete}
                    type="button"
                  >
                    Delete edge
                  </button>
                </div>
                <p className="text-sm text-slate-400">{selectedEdgeDisplay}</p>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Type</span>
                  <select
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    value={selectedEdge.type}
                    onChange={(event) => {
                      selectEdgeType(event.target.value)
                    }}
                  >
                    {edgeTypeOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Source node</span>
                  <select
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    value={selectedEdge.source}
                    onChange={(event) => {
                      onEdgeSourceChange(event.target.value)
                    }}
                  >
                    {graph.nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Target node</span>
                  <select
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    value={selectedEdge.target}
                    onChange={(event) => {
                      onEdgeTargetChange(event.target.value)
                    }}
                  >
                    {graph.nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Text / label</span>
                  <input
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    defaultValue={selectedEdge.text as string}
                    onBlur={(event) => onEdgeFieldText("text", event.target.value)}
                    onChange={(event) => onEdgeFieldText("text", event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Anchor block id</span>
                  <input
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    defaultValue={(selectedEdge as EdgeInstance).anchorBlockId as string | undefined}
                    onBlur={(event) => onEdgeFieldText("anchorBlockId", event.target.value)}
                    onChange={(event) => onEdgeFieldText("anchorBlockId", event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Failure target node id</span>
                  <input
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    defaultValue={getFailureTarget(selectedEdge)}
                    onBlur={(event) => onEdgeFailureTargetCommit(event.target.value || "")}
                    onChange={(event) => onEdgeFailureTargetCommit(event.target.value || "")}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Conditions (JSON array of condition objects)</span>
                  <textarea
                    key={`${selectedEdge.id}-conditions`}
                    className="w-full min-h-24 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={edgeConditionsText}
                    onBlur={(event) => onEdgeCommitArray("conditions", event.target.value)}
                    onChange={(event) => setEdgeConditionsText(event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Effects (JSON array of effect objects)</span>
                  <textarea
                    key={`${selectedEdge.id}-effects`}
                    className="w-full min-h-24 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={edgeEffectsText}
                    onBlur={(event) => onEdgeCommitArray("effects", event.target.value)}
                    onChange={(event) => setEdgeEffectsText(event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Failure effects (JSON array)</span>
                  <textarea
                    key={`${selectedEdge.id}-failure-effects`}
                    className="w-full min-h-20 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={edgeFailureEffectsText}
                    onBlur={(event) => onEdgeCommitArray("failureEffects", event.target.value)}
                    onChange={(event) => setEdgeFailureEffectsText(event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Edge custom payload (JSON object)</span>
                  <textarea
                    key={`${selectedEdge.id}-custom`}
                    className="w-full min-h-20 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
                    defaultValue={edgeCustomText}
                    onBlur={(event) => onEdgeCustomCommit(event.target.value)}
                    onChange={(event) => setEdgeCustomText(event.target.value)}
                  />
                </label>
              </section>
            ) : null}

            {!selectedNode && !selectedEdge ? (
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                <h2 className="font-semibold mb-2">No selection</h2>
                <p>Click a node or edge in the graph to edit details.</p>
              </section>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  )
}
