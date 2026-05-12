from odoo import models, fields
from odoo.exceptions import UserError


class AtteqSettings(models.TransientModel):
    _name = 'atteq.config.settings'
    _inherit = 'res.config.settings'
    _description = 'Atteq Connector Settings'

    atteq_api_token = fields.Char(
        string='API Token',
        help='JWT token for Atteq API authentication',
        config_parameter='atteq.api.token'
    )

    def action_test_connection(self):
        self.ensure_one()

        # Check if token is configured
        token = self.env['ir.config_parameter'].sudo().get_param('atteq.api.token')
        if not token:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Error',
                    'message': 'API Token not configured. Please enter a token first.',
                    'type': 'danger',
                    'sticky': True,
                }
            }

        try:
            result = self.env['atteq.api.connector'].get_calls()
            calls_count = len(result) if isinstance(result, list) else 0
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Success',
                    'message': 'Connection successful! Found %s calls.' % calls_count,
                    'type': 'success',
                    'sticky': False,
                }
            }
        except Exception as e:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Error',
                    'message': 'Connection failed: %s' % str(e),
                    'type': 'danger',
                    'sticky': True,
                }
            }
