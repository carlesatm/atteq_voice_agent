/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const CALL_DETAIL_TEMPLATE = xml`
    <div class="o_atteq_call_detail o_action">
        <div class="o_control_panel">
            <div class="o_cp_top">
                <div class="o_cp_top_left">
                    <div class="d-flex flex-column">
                        <button class="btn btn-link text-decoration-none p-0 mb-1 text-start"
                                style="font-size:0.8rem;color:#71639e;"
                                t-on-click="goBack">
                            <i class="fa fa-arrow-left me-1"/>
                            Volver a Llamadas
                        </button>
                        <h4 class="mb-0 fw-bold">Detalle de la Llamada</h4>
                    </div>
                </div>
                <div class="o_cp_top_right">
                    <span t-if="state.isMockData" class="badge bg-warning text-dark me-2">
                        <i class="fa fa-flask me-1"/>
                        Datos de demostración
                    </span>
                </div>
            </div>
        </div>

        <div class="o_content" style="max-height: calc(100vh - 150px); overflow-y: auto;">
            <div t-if="state.loading" class="text-center py-5">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"/>
                <p class="mt-2 text-muted">Cargando llamada...</p>
            </div>

            <div t-elif="state.error" class="alert alert-danger m-3">
                <i class="fa fa-exclamation-triangle me-2"/>
                <t t-esc="state.error"/>
            </div>

            <div t-elif="state.call" class="p-3">
                <div class="row g-3">

                    <!-- LEFT: Info + Nodes Timeline -->
                    <div class="col-md-4">

                        <!-- Call Info Card -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fa fa-phone me-2"/>
                                    Información
                                </h5>
                            </div>
                            <div class="card-body p-3">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3"
                                         style="width:48px;height:48px;background:#71639e;flex-shrink:0;">
                                        <i class="fa fa-phone text-white"/>
                                    </div>
                                    <div>
                                        <div class="fw-bold" style="font-size:1.1rem;">
                                            <t t-esc="state.call.callerNumber"/>
                                        </div>
                                        <small class="text-muted">
                                            <t t-esc="formatDate(state.call.receivedAt)"/>
                                        </small>
                                    </div>
                                </div>

                                <div class="d-flex justify-content-between align-items-center p-2 rounded mb-2"
                                     style="background:#f8fafc;">
                                    <span class="text-muted small">
                                        <i class="fa fa-clock-o me-1"/>
                                        Duración
                                    </span>
                                    <span class="fw-bold text-primary">
                                        <t t-esc="formatDuration(state.call.duration)"/>
                                    </span>
                                </div>

                                <div t-if="state.call.Agent"
                                     class="d-flex justify-content-between align-items-center p-2 rounded mb-2"
                                     style="background:#f8fafc;">
                                    <span class="text-muted small">
                                        <i class="fa fa-robot me-1"/>
                                        Agente
                                    </span>
                                    <span class="badge"
                                          style="background:#71639e;">
                                        <t t-esc="state.call.Agent.name"/>
                                    </span>
                                </div>

                            </div>
                        </div>

                        <!-- Nodes Timeline Card -->
                        <div class="card"
                             t-if="state.call.CallNodeRecords and state.call.CallNodeRecords.length > 0">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fa fa-sitemap me-2"/>
                                    Nodos recorridos
                                </h5>
                            </div>
                            <div class="card-body p-3">
                                <div class="atteq-timeline">
                                    <t t-foreach="state.call.CallNodeRecords" t-as="rec" t-key="rec.id">
                                        <div class="d-flex mb-3">
                                            <!-- Timeline dot + line -->
                                            <div class="d-flex flex-column align-items-center me-3"
                                                 style="flex-shrink:0;">
                                                <div class="rounded-circle d-flex align-items-center justify-content-center"
                                                     style="width:28px;height:28px;background:#71639e;z-index:1;">
                                                    <i class="fa fa-circle text-white" style="font-size:8px;"/>
                                                </div>
                                                <div t-if="!rec_last"
                                                     style="width:2px;flex:1;background:#e2e8f0;margin-top:2px;min-height:20px;"/>
                                            </div>
                                            <!-- Node info -->
                                            <div class="flex-grow-1">
                                                <div class="fw-bold small">
                                                    <t t-esc="rec.Node and rec.Node.name or rec.nodeId"/>
                                                </div>
                                                <div class="text-muted" style="font-size:11px;">
                                                    <t t-esc="formatTime(rec.enteredAt)"/>
                                                    <t t-if="rec.exitedAt">
                                                        — <t t-esc="formatTime(rec.exitedAt)"/>
                                                    </t>
                                                </div>
                                                <div class="mt-1"
                                                     t-if="rec.toolsUsed and rec.toolsUsed.length > 0">
                                                    <t t-foreach="rec.toolsUsed" t-as="tool" t-key="tool">
                                                        <span class="badge me-1 mb-1"
                                                              style="background:#f3e8ef;color:#71639e;font-size:10px;">
                                                            <i class="fa fa-wrench me-1"/>
                                                            <t t-esc="tool"/>
                                                        </span>
                                                    </t>
                                                </div>
                                            </div>
                                        </div>
                                    </t>
                                </div>
                            </div>
                        </div>

                    </div><!-- /LEFT -->

                    <!-- RIGHT: Conversation + Recording -->
                    <div class="col-md-8">

                        <!-- Recording -->
                        <div class="card mb-3" t-if="state.call.recordingUrl">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fa fa-volume-up me-2"/>
                                    Grabación
                                </h5>
                            </div>
                            <div class="card-body">
                                <audio controls="controls"
                                       t-att-src="state.call.recordingUrl"
                                       class="w-100">
                                    Tu navegador no soporta audio.
                                </audio>
                            </div>
                        </div>

                        <!-- Conversation -->
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="fa fa-comments me-2"/>
                                    Conversación
                                </h5>
                                <small class="opacity-75">
                                    <t t-esc="parsedMessages().length"/> mensajes
                                </small>
                            </div>
                            <div class="card-body p-0">
                                <div style="max-height:520px;overflow-y:auto;padding:1rem;"
                                     class="atteq-chat-container">

                                    <!-- Empty state -->
                                    <div t-if="!state.call.transcript"
                                         class="text-center text-muted py-5">
                                        <i class="fa fa-comments fa-2x mb-2 d-block"/>
                                        Sin transcripción disponible
                                    </div>

                                    <!-- Messages -->
                                    <t t-foreach="parsedMessages()" t-as="msg" t-key="msg_index">
                                        <!-- AI message: left -->
                                        <div t-if="!msg.isUser"
                                             class="d-flex mb-3 align-items-end">
                                            <div class="rounded-circle d-flex align-items-center justify-content-center me-2"
                                                 style="width:32px;height:32px;background:#71639e;flex-shrink:0;">
                                                <i class="fa fa-robot text-white" style="font-size:14px;"/>
                                            </div>
                                            <div style="max-width:72%;">
                                                <div class="text-muted mb-1"
                                                     style="font-size:11px;padding-left:4px;">
                                                    <t t-esc="msg.speaker"/>
                                                    <t t-if="msg.time">
                                                        · <t t-esc="msg.time"/>
                                                    </t>
                                                </div>
                                                <div class="p-3 rounded-3"
                                                     style="background:white;border:1px solid #e2e8f0;border-bottom-left-radius:4px!important;line-height:1.5;">
                                                    <t t-esc="msg.message"/>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- User message: right -->
                                        <div t-if="msg.isUser"
                                             class="d-flex mb-3 align-items-end justify-content-end">
                                            <div style="max-width:72%;">
                                                <div class="text-muted mb-1 text-end"
                                                     style="font-size:11px;padding-right:4px;">
                                                    <t t-if="msg.time">
                                                        <t t-esc="msg.time"/> ·
                                                    </t>
                                                    <t t-esc="msg.speaker"/>
                                                </div>
                                                <div class="p-3 rounded-3 text-white"
                                                     style="background:#71639e;border-bottom-right-radius:4px!important;line-height:1.5;">
                                                    <t t-esc="msg.message"/>
                                                </div>
                                            </div>
                                            <div class="rounded-circle d-flex align-items-center justify-content-center ms-2"
                                                 style="width:32px;height:32px;background:#71639e;flex-shrink:0;">
                                                <i class="fa fa-user text-white" style="font-size:14px;"/>
                                            </div>
                                        </div>
                                    </t>

                                    <!-- Fallback raw transcript -->
                                    <div t-if="state.call.transcript and parsedMessages().length === 0"
                                         class="p-3 rounded" style="background:#f8fafc;white-space:pre-wrap;">
                                        <t t-esc="state.call.transcript"/>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div><!-- /RIGHT -->

                </div>
            </div>
        </div>
    </div>
`;

export class AtteqCallDetail extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.actionService = useService("action");
        this.state = useState({
            call: null,
            loading: true,
            error: null,
            isMockData: false,
        });

        onWillStart(async () => {
            const callId = this.props.action.params.callId;
            await this.fetchCall(callId);
        });
    }

    async fetchCall(callId) {
        this.state.loading = true;
        this.state.error = null;
        try {
            const result = await this.rpc("/atteq/calls/" + callId);
            this.state.call = result;
            this.state.isMockData = !!(result && result._mock);
        } catch (error) {
            this.state.error = error.message || "Error al cargar la llamada";
        } finally {
            this.state.loading = false;
        }
    }

    goBack() {
        this.actionService.doAction({
            type: "ir.actions.client",
            tag: "atteq_calls_list",
            name: "Llamadas",
        });
    }

    parsedMessages() {
        const transcript = this.state.call && this.state.call.transcript;
        if (!transcript) return [];

        // Format: "[HH:MM:SS] Speaker: message"
        const lines = transcript.split("\n");
        const messages = [];
        for (const line of lines) {
            const m = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)$/);
            if (m) {
                const speaker = m[2].trim();
                messages.push({
                    time: m[1],
                    speaker,
                    message: m[3].trim(),
                    isUser: !speaker.toLowerCase().includes("agent") && speaker !== "Agente",
                });
            }
        }
        return messages;
    }

    formatDuration(seconds) {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    formatDate(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleString("es-ES");
    }

    formatTime(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }
}

AtteqCallDetail.template = CALL_DETAIL_TEMPLATE;

registry.category("actions").add("atteq_call_detail", AtteqCallDetail);
