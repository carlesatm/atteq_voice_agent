from odoo import http
from odoo.http import request
import json


class AtteqController(http.Controller):

    @http.route('/atteq/calls/list', type='json', auth='user', methods=['POST'])
    def get_calls_list(self, **kwargs):
        date_from = kwargs.get('date_from')
        date_to = kwargs.get('date_to')
        calls = request.env['atteq.api.connector'].get_calls(date_from, date_to)
        return calls

    @http.route('/atteq/calls/<string:call_id>', type='json', auth='user', methods=['POST'])
    def get_call_detail(self, call_id, **kwargs):
        call = request.env['atteq.api.connector'].get_call_by_id(call_id)
        return call

    @http.route('/atteq/agents/list', type='json', auth='user', methods=['POST'])
    def get_agents_list(self, **kwargs):
        agents = request.env['atteq.api.connector'].get_agents()
        return agents

    @http.route('/atteq/agents/<string:agent_id>', type='json', auth='user', methods=['POST'])
    def get_agent_detail(self, agent_id, **kwargs):
        agent = request.env['atteq.api.connector'].get_agent_by_id(agent_id)
        return agent
