/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const AGENTS_LIST_TEMPLATE = xml`
    <div class="o_atteq_agents_list o_action">
        <div class="o_control_panel">
            <div class="o_cp_top">
                <div class="o_cp_top_left">
                    <h2>Agents</h2>
                </div>
                <div class="o_cp_top_right">
                    <button class="btn btn-primary" t-on-click="fetchAgents">
                        <i class="fa fa-refresh me-1"/>
                        Refresh
                    </button>
                </div>
            </div>
        </div>

        <div class="o_content" style="max-height: calc(100vh - 150px); overflow-y: auto; overflow-x: hidden;">
            <div t-if="state.loading" class="text-center py-5">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"/>
                <p class="mt-2 text-muted">Loading agents...</p>
            </div>

            <div t-elif="state.error" class="alert alert-danger m-3">
                <i class="fa fa-exclamation-triangle me-2"/>
                <t t-esc="state.error"/>
            </div>

            <div t-elif="!state.loading" class="p-3">
                <div t-if="state.agents.length === 0" class="alert alert-info">
                    No agents found
                </div>
                <div class="row">
                    <t t-foreach="state.agents" t-as="agent" t-key="agent.id">
                        <div class="col-md-4 mb-3">
                            <div class="card h-100 clickable-card agent-card" t-on-click="() => viewAgent(agent.id)">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fa fa-robot me-2"/>
                                        <t t-esc="agent.name"/>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <p class="card-text" t-if="agent.description">
                                        <t t-esc="agent.description"/>
                                    </p>
                                    <p class="card-text text-muted" t-if="agent.greeting">
                                        <small>"<t t-esc="agent.greeting"/>"</small>
                                    </p>
                                    <div class="mt-2">
                                        <small class="text-muted">ID: <t t-esc="agent.id"/></small>
                                    </div>
                                    <div class="mt-1">
                                        <small class="text-muted">Created: <t t-esc="formatDate(agent.createdAt)"/></small>
                                    </div>
                                </div>
                                <div class="card-footer" t-on-click="(ev) => ev.stopPropagation()">
                                    <button class="btn btn-success btn-sm"
                                            t-on-click="() => testAgent(agent.id, agent.name)">
                                        <i class="fa fa-phone me-1"/>
                                        Test Agent
                                    </button>
                                </div>
                            </div>
                        </div>
                    </t>
                </div>
            </div>
        </div>
    </div>
`;

export class AtteqAgentsList extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.actionService = useService("action");
        this.state = useState({
            agents: [],
            loading: true,
            error: null,
        });

        this.viewAgent = this.viewAgent.bind(this);
        this.testAgent = this.testAgent.bind(this);

        onWillStart(async () => {
            await this.fetchAgents();
        });
    }

    async fetchAgents() {
        this.state.loading = true;
        this.state.error = null;
        try {
            const result = await this.rpc("/atteq/agents/list");
            this.state.agents = result || [];
        } catch (error) {
            this.state.error = error.message || "Error fetching agents";
        } finally {
            this.state.loading = false;
        }
    }

    viewAgent(agentId) {
        this.actionService.doAction({
            type: "ir.actions.client",
            tag: "atteq_agent_detail",
            name: "Agent Detail",
            params: { agentId: agentId },
        });
    }

    testAgent(agentId, agentName) {
        this.actionService.doAction({
            type: "ir.actions.client",
            tag: "atteq_agent_detail",
            name: "Agent Detail",
            params: { agentId: agentId, agentName: agentName },
        });
    }

    formatDate(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    }
}

AtteqAgentsList.template = AGENTS_LIST_TEMPLATE;

registry.category("actions").add("atteq_agents_list", AtteqAgentsList);
