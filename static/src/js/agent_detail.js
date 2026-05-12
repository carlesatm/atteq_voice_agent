/** @odoo-module **/

import { Component, useState, onWillStart, onWillUnmount } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const NODE_W = 178;
const NODE_H = 92;
const GRAPH_PAD = 80;
// Minimum pixel gap between node edges (so they never touch)
const MIN_GAP_X = 60;
const MIN_GAP_Y = 50;

function computeGraphData(agent) {
    if (!agent || !agent.AgentNode || !agent.AgentNode.length) return null;

    const agentNodes = agent.AgentNode;
    const agentEdges = agent.AgentEdge || [];
    const rootId = agent.rootNodeId;

    // Normalize raw positions to start from (0,0)
    let minX = Infinity, minY = Infinity;
    for (const n of agentNodes) {
        minX = Math.min(minX, n.positionX);
        minY = Math.min(minY, n.positionY);
    }

    // Scale positions so minimum node-to-node gap is respected.
    // Find the smallest non-zero delta in each axis and compute a scale factor.
    const rawXs = [...new Set(agentNodes.map(n => n.positionX))].sort((a, b) => a - b);
    const rawYs = [...new Set(agentNodes.map(n => n.positionY))].sort((a, b) => a - b);

    function minDelta(arr) {
        let d = Infinity;
        for (let i = 1; i < arr.length; i++) d = Math.min(d, arr[i] - arr[i - 1]);
        return isFinite(d) && d > 0 ? d : 1;
    }

    const minDX = minDelta(rawXs);
    const minDY = minDelta(rawYs);
    // Required pixel distance between left-edges = NODE_W + MIN_GAP_X
    const scaleX = Math.max(1, (NODE_W + MIN_GAP_X) / minDX);
    const scaleY = Math.max(1, (NODE_H + MIN_GAP_Y) / minDY);

    // Build positioned nodes
    const nmap = {};
    const gnodes = agentNodes.map(n => {
        const x = Math.round((n.positionX - minX) * scaleX + GRAPH_PAD);
        const y = Math.round((n.positionY - minY) * scaleY + GRAPH_PAD);
        nmap[n.nodeId] = { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };

        const tools = (n.Node.NodeTool || []).map(t => t.ToolConfiguration.name);
        const toolsLabel = tools.length
            ? tools.slice(0, 2).join(", ") + (tools.length > 2 ? " +" + (tools.length - 2) : "")
            : "";
        const desc = n.Node.description || "";
        const descShort = desc.length > 26 ? desc.substring(0, 26) + "…" : desc;
        const name = n.Node.name.length > 21 ? n.Node.name.substring(0, 21) + "…" : n.Node.name;

        return {
            nodeId: n.nodeId,
            name,
            descShort,
            toolsLabel,
            toolCount: tools.length,
            x, y,
            isRoot: n.nodeId === rootId,
            agentNode: n,
        };
    });

    // SVG canvas size
    let maxX = 0, maxY = 0;
    for (const n of gnodes) {
        maxX = Math.max(maxX, n.x + NODE_W);
        maxY = Math.max(maxY, n.y + NODE_H);
    }
    const svgW = Math.max(520, maxX + GRAPH_PAD);
    const svgH = Math.max(300, maxY + GRAPH_PAD);

    // Rect boundary intersection helper
    function edgePt(nodeId, tx, ty) {
        const n = nmap[nodeId];
        if (!n) return { x: tx, y: ty };
        const cx = n.cx, cy = n.cy;
        const dx = tx - cx, dy = ty - cy;
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return { x: cx, y: cy };
        const sx = Math.abs(dx) > 0.01 ? (NODE_W / 2) / Math.abs(dx) : 1e9;
        const sy = Math.abs(dy) > 0.01 ? (NODE_H / 2) / Math.abs(dy) : 1e9;
        const s = Math.min(sx, sy);
        return { x: +(cx + dx * s).toFixed(1), y: +(cy + dy * s).toFixed(1) };
    }

    const gedges = agentEdges.map(e => {
        const f = nmap[e.fromNodeId], t = nmap[e.toNodeId];
        if (!f || !t) return null;

        const sp = edgePt(e.fromNodeId, t.cx, t.cy);
        const ep = edgePt(e.toNodeId, f.cx, f.cy);
        const dx = ep.x - sp.x;

        // S-curve bezier: horizontal control handles
        const path = `M ${sp.x} ${sp.y} C ${+(sp.x + dx * 0.5).toFixed(1)} ${sp.y} ${+(ep.x - dx * 0.5).toFixed(1)} ${ep.y} ${ep.x} ${ep.y}`;

        const lx = +((sp.x + ep.x) / 2).toFixed(1);
        const ly = +((sp.y + ep.y) / 2 - 10).toFixed(1);

        return { id: e.id, path, lx, ly, label: e.label || "", type: e.type || "" };
    }).filter(Boolean);

    return { nodes: gnodes, edges: gedges, svgW, svgH };
}

const AGENT_DETAIL_TEMPLATE = xml`
    <div class="o_atteq_agent_detail o_action">
        <div class="o_control_panel">
            <div class="o_cp_top">
                <div class="o_cp_top_left">
                    <div class="d-flex flex-column">
                        <button class="btn btn-link text-decoration-none p-0 mb-1 text-start"
                                style="font-size:0.8rem;color:#71639e;"
                                t-on-click="goBack">
                            <i class="fa fa-arrow-left me-1"/>
                            Volver a Agentes
                        </button>
                        <h4 class="mb-0 fw-bold">
                            <t t-if="state.agent" t-esc="state.agent.name"/>
                            <t t-else="">Agente</t>
                        </h4>
                    </div>
                </div>
                <div class="o_cp_top_right">
                    <span t-if="state.isMockData" class="badge bg-warning text-dark me-2">
                        <i class="fa fa-flask me-1"/>
                        Datos de demostración
                    </span>
                    <button class="btn btn-success" t-on-click="toggleTest"
                            t-if="state.agent">
                        <i class="fa fa-phone me-1"/>
                        <t t-esc="state.showTest ? 'Ocultar Test' : 'Test Agent'"/>
                    </button>
                </div>
            </div>
        </div>

        <div class="o_content" style="max-height: calc(100vh - 150px); overflow-y: auto;">
            <div t-if="state.loading" class="text-center py-5">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"/>
                <p class="mt-2 text-muted">Cargando agente...</p>
            </div>

            <div t-elif="state.error" class="alert alert-danger m-3">
                <i class="fa fa-exclamation-triangle me-2"/>
                <t t-esc="state.error"/>
            </div>

            <div t-elif="state.agent" class="p-3">
                <div class="row g-3">

                    <!-- LEFT: Agent Info + Selected Node Details -->
                    <div class="col-md-3">

                        <!-- Agent info card -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fa fa-robot me-2"/>
                                    <t t-esc="state.agent.name"/>
                                </h5>
                            </div>
                            <div class="card-body p-3">
                                <p t-if="state.agent.description"
                                   class="text-muted small mb-2">
                                    <t t-esc="state.agent.description"/>
                                </p>

                                <div t-if="state.agent.greeting"
                                     class="p-2 rounded mb-2"
                                     style="background:#f9f0f5;border-left:3px solid #71639e;">
                                    <small class="text-muted">Saludo</small>
                                    <p class="mb-0 small fst-italic">
                                        "<t t-esc="state.agent.greeting"/>"
                                    </p>
                                </div>

                                <div class="d-flex justify-content-between py-1 border-bottom">
                                    <small class="text-muted">Nodos</small>
                                    <span class="badge"
                                          style="background:#71639e;">
                                        <t t-esc="state.agent.AgentNode ? state.agent.AgentNode.length : 0"/>
                                    </span>
                                </div>
                                <div class="d-flex justify-content-between py-1 border-bottom">
                                    <small class="text-muted">Edges</small>
                                    <span class="badge bg-secondary">
                                        <t t-esc="state.agent.AgentEdge ? state.agent.AgentEdge.length : 0"/>
                                    </span>
                                </div>
                                <div class="d-flex justify-content-between py-1">
                                    <small class="text-muted">Creado</small>
                                    <small><t t-esc="formatDate(state.agent.createdAt)"/></small>
                                </div>
                            </div>
                        </div>

                        <!-- Selected Node Details -->
                        <div class="card" t-if="state.selectedNode">
                            <div class="card-header">
                                <h6 class="mb-0">
                                    <i class="fa fa-dot-circle-o me-2"/>
                                    Nodo seleccionado
                                </h6>
                            </div>
                            <div class="card-body p-3">
                                <div class="fw-bold mb-1">
                                    <t t-esc="state.selectedNode.Node.name"/>
                                </div>
                                <p t-if="state.selectedNode.Node.description"
                                   class="text-muted small mb-2">
                                    <t t-esc="state.selectedNode.Node.description"/>
                                </p>

                                <!-- Tools -->
                                <div t-if="state.selectedNode.Node.NodeTool and state.selectedNode.Node.NodeTool.length > 0"
                                     class="mb-2">
                                    <small class="text-muted d-block mb-1">Herramientas:</small>
                                    <t t-foreach="state.selectedNode.Node.NodeTool" t-as="tw" t-key="tw.ToolConfiguration.id">
                                        <span class="badge me-1 mb-1"
                                              style="background:#f3e8ef;color:#71639e;">
                                            <i class="fa fa-wrench me-1"/>
                                            <t t-esc="tw.ToolConfiguration.name"/>
                                        </span>
                                    </t>
                                </div>

                                <!-- Outgoing edges -->
                                <div t-if="state.selectedNodeEdges.length > 0">
                                    <small class="text-muted d-block mb-1">Salidas:</small>
                                    <t t-foreach="state.selectedNodeEdges" t-as="edge" t-key="edge.id">
                                        <div class="d-flex align-items-center mb-1">
                                            <i class="fa fa-arrow-right text-success me-1" style="font-size:10px;"/>
                                            <small>
                                                <span class="badge bg-light text-dark me-1">
                                                    <t t-esc="edge.type"/>
                                                </span>
                                                <t t-esc="edge.label"/>
                                            </small>
                                        </div>
                                    </t>
                                </div>

                                <div t-if="state.selectedNode.Node.isSystem"
                                     class="mt-2">
                                    <span class="badge bg-secondary">Sistema</span>
                                </div>
                            </div>
                        </div>

                    </div><!-- /LEFT -->

                    <!-- RIGHT: SVG Graph -->
                    <div class="col-md-9">
                        <div class="card mb-3">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="fa fa-project-diagram me-2"/>
                                    Flujo del Agente
                                </h5>
                                <small class="opacity-75">
                                    Haz clic en un nodo para ver sus detalles
                                </small>
                            </div>
                            <div class="card-body p-2"
                                 style="background:#f0f4f8;overflow:auto;min-height:240px;">

                                <svg t-if="state.graphData"
                                     t-att-width="state.graphData.svgW"
                                     t-att-height="state.graphData.svgH"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <marker id="atteq-arrow"
                                                markerWidth="8" markerHeight="6"
                                                refX="7" refY="3" orient="auto">
                                            <polygon points="0 0, 8 3, 0 6"
                                                     class="atteq-arrow-head"/>
                                        </marker>
                                    </defs>

                                    <!-- Edges -->
                                    <t t-foreach="state.graphData.edges" t-as="edge" t-key="edge.id">
                                        <path t-att-d="edge.path"
                                              class="atteq-graph-edge"
                                              fill="none"
                                              stroke-width="2"
                                              marker-end="url(#atteq-arrow)"/>
                                        <t t-if="edge.label">
                                            <rect t-att-x="edge.lx - 32"
                                                  t-att-y="edge.ly - 8"
                                                  width="64" height="16"
                                                  rx="4"
                                                  class="atteq-edge-label-bg"/>
                                            <text t-att-x="edge.lx"
                                                  t-att-y="edge.ly + 4"
                                                  text-anchor="middle"
                                                  class="atteq-edge-label-text"
                                                  style="font: 10px sans-serif; user-select:none;">
                                                <t t-esc="edge.label"/>
                                            </text>
                                        </t>
                                    </t>

                                    <!-- Nodes -->
                                    <t t-foreach="state.graphData.nodes" t-as="gn" t-key="gn.nodeId">
                                        <g t-att-transform="'translate(' + gn.x + ',' + gn.y + ')'"
                                           t-on-click="() => this.selectNode(gn.agentNode)"
                                           class="atteq-graph-node-group"
                                           style="cursor:pointer;">
                                            <!-- Drop shadow -->
                                            <rect x="4" y="4"
                                                  width="178" height="92"
                                                  rx="10"
                                                  class="atteq-node-shadow"/>
                                            <!-- Body: root node gets success color, default gets primary -->
                                            <rect width="178" height="92"
                                                  rx="10"
                                                  t-att-class="'atteq-node-body ' + (gn.isRoot ? 'atteq-node-root' : 'atteq-node-default') + (state.selectedNodeId === gn.nodeId ? ' atteq-node-selected' : '')"/>
                                            <!-- Node name -->
                                            <text x="12" y="26"
                                                  class="atteq-node-name"
                                                  style="font: bold 13px sans-serif; user-select:none;">
                                                <t t-esc="gn.name"/>
                                            </text>
                                            <!-- Description -->
                                            <text x="12" y="46"
                                                  class="atteq-node-desc"
                                                  style="font: 11px sans-serif; user-select:none;"
                                                  t-if="gn.descShort">
                                                <t t-esc="gn.descShort"/>
                                            </text>
                                            <!-- Tools -->
                                            <text x="12" y="68"
                                                  class="atteq-node-tools"
                                                  style="font: 10px sans-serif; user-select:none;"
                                                  t-if="gn.toolsLabel">
                                                <t t-esc="gn.toolsLabel"/>
                                            </text>
                                            <!-- ROOT badge -->
                                            <rect t-if="gn.isRoot"
                                                  x="136" y="6" width="36" height="14"
                                                  rx="4"
                                                  class="atteq-root-badge-bg"/>
                                            <text t-if="gn.isRoot"
                                                  x="154" y="17"
                                                  text-anchor="middle"
                                                  class="atteq-root-badge-text"
                                                  style="font: bold 8px sans-serif; user-select:none;">
                                                ROOT
                                            </text>
                                        </g>
                                    </t>
                                </svg>

                                <div t-if="!state.graphData"
                                     class="text-center text-muted py-5">
                                    <i class="fa fa-project-diagram fa-2x mb-2 d-block"/>
                                    Sin datos de grafo disponibles
                                </div>

                            </div>
                        </div>

                        <!-- Test Section -->
                        <div t-if="state.showTest" class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fa fa-phone me-2"/>
                                    Test: <t t-esc="state.agent.name"/>
                                </h5>
                            </div>
                            <div class="card-body">
                                <!-- Status badge -->
                                <div class="mb-3">
                                    <span t-if="state.testStatus === 'idle'"
                                          class="badge bg-secondary">Desconectado</span>
                                    <span t-elif="state.testStatus === 'connecting'"
                                          class="badge bg-warning text-dark">
                                        <i class="fa fa-spinner fa-spin me-1"/>
                                        Conectando...
                                    </span>
                                    <span t-elif="state.testStatus === 'active'"
                                          class="badge bg-success">
                                        <i class="fa fa-circle me-1"/>
                                        En llamada
                                    </span>
                                    <span t-elif="state.testStatus === 'error'"
                                          class="badge bg-danger">Error</span>
                                </div>

                                <div t-if="state.testErrorMsg" class="alert alert-danger mb-3">
                                    <i class="fa fa-exclamation-triangle me-2"/>
                                    <t t-esc="state.testErrorMsg"/>
                                </div>

                                <div class="mb-3">
                                    <button t-if="state.testStatus === 'idle'"
                                            class="btn btn-success me-2"
                                            t-on-click="startTestCall">
                                        <i class="fa fa-phone me-1"/>
                                        Iniciar llamada
                                    </button>
                                    <button t-if="state.testStatus === 'active'"
                                            class="btn btn-danger me-2"
                                            t-on-click="hangUpTestCall">
                                        <i class="fa fa-phone-slash me-1"/>
                                        Colgar
                                    </button>
                                    <button t-if="state.testStatus === 'error'"
                                            class="btn btn-primary me-2"
                                            t-on-click="startTestCall">
                                        <i class="fa fa-refresh me-1"/>
                                        Reintentar
                                    </button>
                                </div>

                                <!-- Test transcript as chat -->
                                <div style="max-height:360px;overflow-y:auto;padding:0.75rem;background:#f8fafc;border-radius:8px;">
                                    <div t-if="state.testTranscript.length === 0"
                                         class="text-muted text-center py-3">
                                        Sin mensajes. Inicia una llamada para comenzar.
                                    </div>
                                    <t t-foreach="state.testTranscript" t-as="msg" t-key="msg_index">
                                        <!-- AI: left -->
                                        <div t-if="msg.role === 'assistant'"
                                             class="d-flex mb-3 align-items-end">
                                            <div class="rounded-circle d-flex align-items-center justify-content-center me-2"
                                                 style="width:30px;height:30px;background:#71639e;flex-shrink:0;">
                                                <i class="fa fa-robot text-white" style="font-size:13px;"/>
                                            </div>
                                            <div class="p-2 rounded-3"
                                                 style="background:white;border:1px solid #e2e8f0;border-bottom-left-radius:4px!important;max-width:75%;">
                                                <t t-esc="msg.content"/>
                                            </div>
                                        </div>
                                        <!-- User: right -->
                                        <div t-if="msg.role === 'user'"
                                             class="d-flex mb-3 align-items-end justify-content-end">
                                            <div class="p-2 rounded-3 text-white"
                                                 style="background:#71639e;border-bottom-right-radius:4px!important;max-width:75%;">
                                                <t t-esc="msg.content"/>
                                            </div>
                                            <div class="rounded-circle d-flex align-items-center justify-content-center ms-2"
                                                 style="width:30px;height:30px;background:#71639e;flex-shrink:0;">
                                                <i class="fa fa-user text-white" style="font-size:13px;"/>
                                            </div>
                                        </div>
                                    </t>
                                </div>
                            </div>
                        </div>

                    </div><!-- /RIGHT -->

                </div>
            </div>
        </div>
    </div>
`;

export class AtteqAgentDetail extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.actionService = useService("action");
        this.state = useState({
            agent: null,
            loading: true,
            error: null,
            isMockData: false,
            showTest: false,
            testStatus: "idle",
            testTranscript: [],
            testErrorMsg: null,
            selectedNode: null,
            selectedNodeId: null,
            selectedNodeEdges: [],
            graphData: null,
        });

        this._ws = null;
        this._audioCtx = null;
        this._mediaStream = null;
        this._workletNode = null;
        this._audioQueue = [];
        this._playingAudio = false;

        onWillUnmount(() => this._cleanupWs());

        onWillStart(async () => {
            const agentId = this.props.action.params.agentId;
            await this.fetchAgent(agentId);
        });
    }

    async fetchAgent(agentId) {
        if (!agentId) return;
        this.state.loading = true;
        this.state.error = null;
        try {
            const result = await this.rpc("/atteq/agents/" + agentId);
            this.state.agent = result;
            this.state.isMockData = !!(result && result._mock);
            this.state.graphData = computeGraphData(result);
        } catch (error) {
            this.state.error = error.message || "Error al cargar el agente";
        } finally {
            this.state.loading = false;
        }
    }

    selectNode(agentNode) {
        this.state.selectedNode = agentNode;
        this.state.selectedNodeId = agentNode.nodeId;
        this.state.selectedNodeEdges = this.state.agent && this.state.agent.AgentEdge
            ? this.state.agent.AgentEdge.filter(e => e.fromNodeId === agentNode.nodeId)
            : [];
    }

    goBack() {
        this.actionService.doAction({
            type: "ir.actions.client",
            tag: "atteq_agents_list",
            name: "Agentes",
        });
    }

    toggleTest() {
        this.state.showTest = !this.state.showTest;
        if (!this.state.showTest) {
            this.hangUpTestCall();
        }
    }

    // --- WebSocket voice test ---

    async startTestCall() {
        if (this.state.testStatus !== "idle" && this.state.testStatus !== "error") return;
        this.state.testStatus = "connecting";
        this.state.testTranscript = [];
        this.state.testErrorMsg = null;

        const agentId = this.props.action.params.agentId;
        const config = await this.rpc("/atteq/agents/" + agentId);
        if (!config) {
            this.state.testStatus = "error";
            this.state.testErrorMsg = "No se pudo obtener el token de la API";
            return;
        }

        const wsBase = this.env.services.rpc
            ? window.location.origin.replace(/^http/, "wss").replace(/^https/, "wss")
            : "wss://app.atteq.es";

        try {
            const url = `${wsBase}/api/agent-ws?agentId=${encodeURIComponent(agentId)}`;
            const ws = new WebSocket(url);
            this._ws = ws;
            ws.binaryType = "arraybuffer";

            ws.onmessage = async (ev) => {
                if (ev.data instanceof ArrayBuffer) {
                    this._enqueueAudio(ev.data);
                } else {
                    const msg = JSON.parse(ev.data);
                    this._handleWsMessage(msg);
                }
            };

            ws.onerror = () => {
                this.state.testStatus = "error";
                this.state.testErrorMsg = "Error de conexión con el WebSocket de Atteq";
                this._cleanupWs();
            };

            ws.onclose = (ev) => {
                if (ev.code === 4001) this.state.testErrorMsg = "No autenticado en Atteq.";
                else if (ev.code === 4003) this.state.testErrorMsg = "Sin permisos para este agente.";
                if (this.state.testStatus !== "idle") this.state.testStatus = "idle";
                this._cleanupWs();
            };

            this._mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
            });

            this._audioCtx = new AudioContext({ sampleRate: 16000 });
            const processorUrl = "/atteq_voice_agent/static/src/js/audio_processor.js";
            await this._audioCtx.audioWorklet.addModule(processorUrl);

            const src = this._audioCtx.createMediaStreamSource(this._mediaStream);
            this._workletNode = new AudioWorkletNode(this._audioCtx, "pcm16-processor");
            this._workletNode.port.onmessage = (e) => {
                if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
            };
            src.connect(this._workletNode);

        } catch (err) {
            this.state.testStatus = "error";
            this.state.testErrorMsg = err.message || "Error al iniciar la llamada";
            this._cleanupWs();
        }
    }

    _handleWsMessage(msg) {
        switch (msg.type) {
            case "ready":
                this.state.testStatus = "active";
                break;
            case "ConversationText":
                this.state.testTranscript.push({ role: msg.role, content: msg.content });
                break;
            case "HangUp":
                this.hangUpTestCall();
                break;
        }
    }

    _enqueueAudio(buffer) {
        this._audioQueue.push(buffer);
        if (!this._playingAudio) this._playNext();
    }

    async _playNext() {
        if (!this._audioQueue.length) { this._playingAudio = false; return; }
        this._playingAudio = true;
        const buf = this._audioQueue.shift();
        if (!this._audioCtx) { this._playNext(); return; }

        const i16 = new Int16Array(buf);
        const f32 = new Float32Array(i16.length);
        for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32767;

        const ab = this._audioCtx.createBuffer(1, f32.length, 16000);
        ab.copyToChannel(f32, 0);
        const src = this._audioCtx.createBufferSource();
        src.buffer = ab;
        src.connect(this._audioCtx.destination);
        src.onended = () => this._playNext();
        src.start();
    }

    hangUpTestCall() {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.close(1000, "User hung up");
        }
        this._cleanupWs();
        this.state.testStatus = "idle";
        this.state.testTranscript = [];
    }

    _cleanupWs() {
        if (this._mediaStream) {
            this._mediaStream.getTracks().forEach(t => t.stop());
            this._mediaStream = null;
        }
        if (this._workletNode) { this._workletNode.disconnect(); this._workletNode = null; }
        if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
        this._ws = null;
        this._audioQueue = [];
        this._playingAudio = false;
    }

    formatDate(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("es-ES");
    }
}

AtteqAgentDetail.template = AGENT_DETAIL_TEMPLATE;

registry.category("actions").add("atteq_agent_detail", AtteqAgentDetail);
