{
    'name': 'AI Voice Agent',
    'version': '16.0.1.0.0',
    'summary': 'Manage AI voice agents and calls directly from Odoo',
    'description': """
        Connect Odoo with the Atteq AI telephony platform.
        Visualize calls with full transcripts, browse AI agent node graphs,
        and monitor voice interactions — all without leaving Odoo.
    """,
    'category': 'Discuss',
    'author': 'Atteq',
    'website': 'https://atteq.es',
    'support': 'info@atteq.es',
    'license': 'LGPL-3',
    'depends': ['base', 'web'],
    'external_dependencies': {
        'python': ['requests'],
    },
    'images': ['static/description/banner.png'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
        'views/atteq_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'atteq_voice_agent/static/src/css/atteq_theme.css',
            'atteq_voice_agent/static/src/js/calls_list.js',
            'atteq_voice_agent/static/src/js/call_detail.js',
            'atteq_voice_agent/static/src/js/agents_list.js',
            'atteq_voice_agent/static/src/js/agent_detail.js',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
}
