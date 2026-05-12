from odoo import models, fields, api


class AtteqCall(models.Model):
    _name = 'atteq.call'
    _description = 'Atteq Call'
    _order = 'received_at desc'

    name = fields.Char(string='Call ID', required=True, index=True)
    caller_number = fields.Char(string='Caller Number')
    duration = fields.Integer(string='Duration (seconds)')
    received_at = fields.Datetime(string='Received At')
    agent_id = fields.Many2one('atteq.agent', string='Agent')
    transcript = fields.Text(string='Transcript')
    recording_url = fields.Char(string='Recording URL')

    def action_sync_calls(self):
        """Sync calls from Atteq API"""
        connector = self.env['atteq.api.connector']
        calls = connector.get_calls()
        for call_data in calls:
            existing = self.search([('name', '=', call_data['id'])], limit=1)
            vals = {
                'name': call_data['id'],
                'caller_number': call_data.get('callerNumber'),
                'duration': call_data.get('duration', 0),
                'received_at': call_data.get('receivedAt'),
            }
            if existing:
                existing.write(vals)
            else:
                self.create(vals)
        return True

    def action_view_call_detail(self):
        """Open custom call detail view"""
        self.ensure_one()
        return {
            'type': 'ir.actions.client',
            'tag': 'atteq_call_detail',
            'name': 'Call Detail',
            'params': {'callId': self.name},
            'target': 'current',
        }


class AtteqAgent(models.Model):
    _name = 'atteq.agent'
    _description = 'Atteq Agent'
    _order = 'name'

    name = fields.Char(string='Agent ID', required=True, index=True)
    display_name = fields.Char(string='Display Name')
    description = fields.Text(string='Description')
    greeting = fields.Text(string='Greeting')
    root_node_id = fields.Char(string='Root Node ID')
    ai_profile_id = fields.Char(string='AI Profile ID')
    created_at = fields.Datetime(string='Created At')
    updated_at = fields.Datetime(string='Updated At')

    call_ids = fields.One2many('atteq.call', 'agent_id', string='Calls')

    def action_sync_agents(self):
        """Sync agents from Atteq API"""
        connector = self.env['atteq.api.connector']
        agents = connector.get_agents()
        for agent_data in agents:
            existing = self.search([('name', '=', agent_data['id'])], limit=1)
            vals = {
                'name': agent_data['id'],
                'display_name': agent_data.get('name'),
                'description': agent_data.get('description'),
                'greeting': agent_data.get('greeting'),
                'root_node_id': agent_data.get('rootNodeId'),
                'ai_profile_id': agent_data.get('aiProfileId'),
                'created_at': agent_data.get('createdAt'),
                'updated_at': agent_data.get('updatedAt'),
            }
            if existing:
                existing.write(vals)
            else:
                self.create(vals)
        return True

    def action_view_agent_detail(self):
        """Open custom agent detail view"""
        self.ensure_one()
        return {
            'type': 'ir.actions.client',
            'tag': 'atteq_agent_detail',
            'name': 'Agent Detail',
            'params': {'agentId': self.name},
            'target': 'current',
        }
