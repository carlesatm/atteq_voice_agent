/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

// Thresholds in seconds
const DURATION_SHORT  = 120;   // < 2 min
const DURATION_LONG   = 420;   // > 7 min
const DURATION_MAX    = 600;   // bar saturates at 10 min

const CALLS_LIST_TEMPLATE = xml`
    <div class="o_atteq_calls_list o_action">
        <div class="o_control_panel">
            <div class="o_cp_top">
                <div class="o_cp_top_left">
                    <h2>Llamadas</h2>
                </div>
                <div class="o_cp_top_right">
                </div>
            </div>
        </div>

        <div class="o_content">
            <div t-if="state.loading" class="text-center py-5">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"/>
                <p class="mt-2 text-muted">Cargando llamadas...</p>
            </div>

            <div t-elif="state.error" class="alert alert-danger m-3">
                <i class="fa fa-exclamation-triangle me-2"/>
                <t t-esc="state.error"/>
            </div>

            <div t-elif="!state.loading" class="o_list_view">
                <div style="max-height: calc(100vh - 200px); overflow-y: auto; overflow-x: hidden;">
                    <table class="table table-hover mb-0" style="table-layout: fixed; width: 100%;">
                        <thead class="table-light" style="position: sticky; top: 0; z-index: 1;">
                             <tr>
                                 <th style="width: 35%;">Número</th>
                                 <th style="width: 28%;">Duración</th>
                                 <th style="width: 37%;">Fecha</th>
                             </tr>
                        </thead>
                        <tbody>
                            <tr t-if="state.calls.length === 0">
                                <td colspan="3" class="text-center text-muted py-4">
                                    No se encontraron llamadas
                                </td>
                            </tr>
                            <t t-foreach="state.calls" t-as="call" t-key="call.id">
                                <tr class="clickable-row" t-on-click="() => viewCall(call.id)">

                                    <!-- Número -->
                                    <td class="align-middle">
                                        <div class="d-flex align-items-center">
                                            <div class="rounded-circle d-flex align-items-center justify-content-center me-2"
                                                 style="width:30px;height:30px;background:#f3eef7;flex-shrink:0;">
                                                <i class="fa fa-phone" style="font-size:12px;color:#71639e;"/>
                                            </div>
                                            <span class="fw-semibold"><t t-esc="call.callerNumber"/></span>
                                        </div>
                                    </td>

                                    <!-- Duración con barra y badge -->
                                    <td class="align-middle">
                                        <div class="d-flex align-items-center mb-1">
                                            <span class="fw-semibold me-2">
                                                <t t-esc="formatDuration(call.duration)"/>
                                            </span>
                                            <span class="badge"
                                                  t-att-style="'font-size:10px;padding:2px 6px;background:' + durationInfo(call.duration).badgeBg + ';color:' + durationInfo(call.duration).badgeColor">
                                                <t t-esc="durationInfo(call.duration).label"/>
                                            </span>
                                        </div>
                                        <!-- Mini barra de progreso -->
                                        <div style="height:4px;border-radius:2px;background:#e9ecef;width:100%;">
                                            <div t-att-style="'height:4px;border-radius:2px;width:' + durationInfo(call.duration).pct + '%;background:' + durationInfo(call.duration).barColor"/>
                                        </div>
                                    </td>

                                    <!-- Fecha en dos líneas -->
                                    <td class="align-middle">
                                        <div class="fw-semibold" style="font-size:0.88rem;">
                                            <t t-esc="formatDay(call.receivedAt)"/>
                                        </div>
                                        <div class="text-muted" style="font-size:0.78rem;">
                                            <i class="fa fa-clock-o me-1"/>
                                            <t t-esc="formatTime(call.receivedAt)"/>
                                        </div>
                                    </td>

                                </tr>
                            </t>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
`;

export class AtteqCallsList extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.actionService = useService("action");
        this.state = useState({
            calls: [],
            loading: true,
            error: null,
        });

        this.viewCall = this.viewCall.bind(this);

        onWillStart(async () => {
            await this.fetchCalls();
        });
    }

    async fetchCalls() {
        this.state.loading = true;
        this.state.error = null;
        try {
            const result = await this.rpc("/atteq/calls/list", {});
            this.state.calls = result || [];
        } catch (error) {
            this.state.error = error.message || "Error fetching calls";
        } finally {
            this.state.loading = false;
        }
    }

    viewCall(callId) {
        this.actionService.doAction({
            type: "ir.actions.client",
            tag: "atteq_call_detail",
            name: "Call Detail",
            params: { callId: callId },
        });
    }

    durationInfo(seconds) {
        const s = seconds || 0;
        const pct = Math.min(100, Math.round((s / DURATION_MAX) * 100));

        if (s < DURATION_SHORT) {
            return { label: "Corta", barColor: "#28a745", badgeBg: "#d4edda", badgeColor: "#155724", pct };
        } else if (s <= DURATION_LONG) {
            return { label: "Normal", barColor: "#71639e", badgeBg: "#f3eef7", badgeColor: "#4a3570", pct };
        } else {
            return { label: "Larga", barColor: "#fd7e14", badgeBg: "#fff3cd", badgeColor: "#664d03", pct };
        }
    }

    formatDuration(seconds) {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    formatDay(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("es-ES", {
            day: "2-digit", month: "short", year: "numeric",
        });
    }

    formatTime(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleTimeString("es-ES", {
            hour: "2-digit", minute: "2-digit",
        });
    }
}

AtteqCallsList.template = CALLS_LIST_TEMPLATE;

registry.category("actions").add("atteq_calls_list", AtteqCallsList);
