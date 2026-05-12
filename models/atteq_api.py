from odoo import models, api, _
from odoo.exceptions import UserError
import requests
import json
from urllib.parse import urlencode


class AtteqApiConnector(models.AbstractModel):
    _name = 'atteq.api.connector'
    _description = 'Atteq API Connector'

    @api.model
    def _get_config(self):
        config = self.env['ir.config_parameter'].sudo()
        host = 'https://app.atteq.es/'
        token = config.get_param('atteq.api.token')
        return host.rstrip('/'), token

    @api.model
    def _trpc_request(self, procedure, input_data=None, method='GET'):
        host, token = self._get_config()

        # If no token configured, return demo data directly
        if not token:
            return self._get_demo_data(procedure, input_data)

        url = f"{host}/api/trpc/{procedure}"
        headers = {
            'Cookie': f'session={token}',
            'Accept': 'application/json',
        }

        try:
            method = method.upper()
            if method == 'GET':
                params = {}
                if input_data:
                    params['input'] = json.dumps(input_data)
                response = requests.get(url, headers=headers, params=params, timeout=30)
            else:
                headers['Content-Type'] = 'application/json'
                data = {'json': input_data} if input_data else None
                response = requests.post(url, json=data, headers=headers, timeout=30)

            if response.status_code == 403:
                return self._get_demo_data(procedure, input_data)

            response.raise_for_status()
            response_data = response.json()

            if 'error' in response_data:
                error_msg = response_data['error'].get('message', 'Unknown tRPC error')
                raise UserError(_("Atteq API Error: %s") % error_msg)

            return response_data.get('result', {}).get('data', {}).get('json')

        except requests.HTTPError as e:
            if e.response.status_code == 403:
                return self._get_demo_data(procedure, input_data)
            raise UserError(_("Atteq API request failed: %s") % str(e))
        except UserError:
            raise
        except Exception as e:
            raise UserError(_("Atteq API request failed: %s") % str(e))

    @api.model
    def _get_demo_data(self, procedure, input_data=None):
        if procedure == 'calls.list':
            return self._demo_calls_list()
        elif procedure == 'calls.getById':
            return self._demo_call_by_id(input_data)
        elif procedure == 'agents.list':
            return self._demo_agents_list()
        elif procedure == 'agents.getById':
            return self._demo_agent_by_id(input_data)
        elif procedure == 'agents.getLogs':
            return self._demo_agent_logs(input_data)
        return []

    @api.model
    def _demo_calls_list(self):
        return [
            {"id": "8f3a9b2c-1d4e-4c5f-b8a7-2e9f1c3d5e7a", "callerNumber": "+34612345678", "duration": 142, "receivedAt": "2026-04-15T09:32:11.000Z"},
            {"id": "7e2b8a1d-3c4f-5d6e-8b9a-1f2e3c4d5e6b", "callerNumber": "+34623456789", "duration": 89, "receivedAt": "2026-04-16T10:15:22.000Z"},
            {"id": "6d1c7b9e-2f3a-4b5c-6d7e-8f9a0b1c2d3e", "callerNumber": "+34634567890", "duration": 234, "receivedAt": "2026-04-17T14:45:33.000Z"},
            {"id": "5c0d6a8f-1e2b-3c4d-5e6f-7a8b9c0d1e2f", "callerNumber": "+34645678901", "duration": 67, "receivedAt": "2026-04-18T08:12:45.000Z"},
            {"id": "4b9e5d7c-0f1a-2b3c-4d5e-6f7a8b9c0d1e", "callerNumber": "+34656789012", "duration": 198, "receivedAt": "2026-04-18T11:30:15.000Z"},
            {"id": "3a8f4c6b-9e0d-1f2a-3b4c-5d6e7f8a9b0c", "callerNumber": "+34667890123", "duration": 312, "receivedAt": "2026-04-19T09:05:30.000Z"},
            {"id": "2f7e3b5a-8d9c-0e1f-2a3b-4c5d6e7f8a9b", "callerNumber": "+34678901234", "duration": 156, "receivedAt": "2026-04-19T13:22:10.000Z"},
            {"id": "1e6d2a4b-7c8d-9e0f-1a2b-3c4d5e6f7a8b", "callerNumber": "+34689012345", "duration": 423, "receivedAt": "2026-04-20T10:45:55.000Z"},
            {"id": "0f5c1b3a-6d7e-8f9a-0b1c-2d3e4f5a6b7c", "callerNumber": "+34690123456", "duration": 78, "receivedAt": "2026-04-20T15:18:40.000Z"},
            {"id": "9e4b0a2c-5d6f-7a8b-9c0d-1e2f3a4b5c6d", "callerNumber": "+34601234567", "duration": 267, "receivedAt": "2026-04-21T08:55:25.000Z"},
            {"id": "8d3a9f1b-4e5c-6d7a-8b9c-0d1e2f3a4b5c", "callerNumber": "+34611223344", "duration": 189, "receivedAt": "2026-04-21T12:40:15.000Z"},
            {"id": "7c2b8e0a-3d4b-5c6a-7b8c-9d0e1f2a3b4c", "callerNumber": "+34622334455", "duration": 345, "receivedAt": "2026-04-22T09:15:30.000Z"},
            {"id": "6b1a7d9e-2c3a-4b5d-6c7e-8f9a0b1c2d3e", "callerNumber": "+34633445566", "duration": 98, "receivedAt": "2026-04-22T14:50:45.000Z"},
            {"id": "5a0f6c8d-1b2a-3c4e-5d6f-7a8b9c0d1e2f", "callerNumber": "+34644556677", "duration": 201, "receivedAt": "2026-04-23T10:25:10.000Z"},
            {"id": "4f9e5b7c-0a1b-2c3d-4e5f-6a7b8c9d0e1f", "callerNumber": "+34655667788", "duration": 176, "receivedAt": "2026-04-23T16:05:20.000Z"},
            {"id": "3e8d4a6b-7c9d-0e1f-2a3b-4c5d6e7f8a9b", "callerNumber": "+34666778899", "duration": 254, "receivedAt": "2026-04-24T08:30:15.000Z"},
            {"id": "2d7c3b5a-6e8f-9a0b-1c2d-3e4f5a6b7c8d", "callerNumber": "+34677889900", "duration": 123, "receivedAt": "2026-04-24T11:45:30.000Z"},
            {"id": "1c6b2a4b-5d7e-8f9a-0b1c-2d3e4f5a6b7c", "callerNumber": "+34688990011", "duration": 389, "receivedAt": "2026-04-25T09:15:45.000Z"},
            {"id": "0b5a1c3d-4e6f-7a8b-9c0d-1e2f3a4b5c6d", "callerNumber": "+34699001122", "duration": 67, "receivedAt": "2026-04-25T14:20:10.000Z"},
            {"id": "9a4f0b2c-3d5e-6f7a-8b9c-0d1e2f3a4b5c", "callerNumber": "+34600112233", "duration": 298, "receivedAt": "2026-04-26T10:05:25.000Z"},
            {"id": "8b3e1d5c-2f4a-6b7d-8e9f-0a1b2c3d4e5f", "callerNumber": "+34611223344", "duration": 145, "receivedAt": "2026-04-26T15:40:50.000Z"},
            {"id": "7c2d0e4b-1f3a-5b6c-7d8e-9f0a1b2c3d4e", "callerNumber": "+34622334455", "duration": 432, "receivedAt": "2026-04-27T08:55:35.000Z"},
            {"id": "6d1c9f3a-0e2b-4c5d-6e7f-8a9b0c1d2e3f", "callerNumber": "+34633445566", "duration": 89, "receivedAt": "2026-04-27T12:30:20.000Z"},
            {"id": "5e0b8d2c-1f3a-4b5c-6d7e-8f9a0b1c2d3e", "callerNumber": "+34644556677", "duration": 213, "receivedAt": "2026-04-28T09:45:45.000Z"},
            {"id": "4f9a7c1b-0e2d-3c4b-5a6f-7e8d9c0b1a2f", "callerNumber": "+34655667788", "duration": 356, "receivedAt": "2026-04-28T14:10:30.000Z"},
            {"id": "3e8f6b0a-1c2d-3e4f-5a6b-7c8d9e0f1a2b", "callerNumber": "+34666778899", "duration": 178, "receivedAt": "2026-04-29T10:25:15.000Z"},
            {"id": "2f7a5c9b-0e1d-2c3b-4a5f-6e7d8c9b0a1f", "callerNumber": "+34677889900", "duration": 267, "receivedAt": "2026-04-29T15:50:40.000Z"},
            {"id": "1e6b4a8c-0d1f-2e3a-4b5c-6d7e8f9a0b1c", "callerNumber": "+34688990011", "duration": 94, "receivedAt": "2026-04-30T08:35:25.000Z"},
            {"id": "0f5a3b7c-1d2e-3f4a-5b6c-7d8e9f0a1b2c", "callerNumber": "+34699001122", "duration": 321, "receivedAt": "2026-04-30T13:15:50.000Z"},
            {"id": "9e4c2b6a-0d1f-2e3a-4b5c-6d7e8f9a0b1c", "callerNumber": "+34600112233", "duration": 187, "receivedAt": "2026-05-01T09:50:35.000Z"},
            {"id": "8d3b1a5c-0e2f-1d3a-4b5c-6e7f8d9e0a1b", "callerNumber": "+34611223344", "duration": 245, "receivedAt": "2026-05-01T14:25:10.000Z"},
            {"id": "7c2a0b4d-1e3f-2a4c-5b6d-7e8f9a0b1c2d", "callerNumber": "+34622334455", "duration": 398, "receivedAt": "2026-05-02T10:10:45.000Z"},
            {"id": "6b1f9c3e-0d2a-4b5c-6e7f-8a9b0c1d2e3f", "callerNumber": "+34633445566", "duration": 112, "receivedAt": "2026-05-02T15:35:20.000Z"},
            {"id": "5a0e8b2d-1c3f-4a5b-6d7e-8f9a0b1c2d3e", "callerNumber": "+34644556677", "duration": 289, "receivedAt": "2026-05-03T08:20:35.000Z"},
            {"id": "4f9d7a1c-0b2e-3d4f-5a6b-7c8d9e0f1a2b", "callerNumber": "+34655667788", "duration": 156, "receivedAt": "2026-05-03T13:45:50.000Z"},
            {"id": "3e8c6b0f-1a2d-3e4c-5b6f-7a8d9e0c1b2f", "callerNumber": "+34666778899", "duration": 367, "receivedAt": "2026-05-04T09:30:25.000Z"},
            {"id": "2d7b5a9e-0c1f-2e3a-4b5d-6f7a8c9b0e1f", "callerNumber": "+34677889900", "duration": 203, "receivedAt": "2026-05-04T14:55:40.000Z"},
            {"id": "1c6a4b8d-0e1f-2c3a-4b5e-6d7f8a9c0b1e", "callerNumber": "+34688990011", "duration": 445, "receivedAt": "2026-05-05T10:15:15.000Z"},
            {"id": "0b5f3c7a-1e2d-3c4b-5a6f-7e8d9c0b1a2f", "callerNumber": "+34699001122", "duration": 78, "receivedAt": "2026-05-05T15:40:30.000Z"},
        ]

    @api.model
    def _demo_call_by_id(self, input_data):
        call_id = input_data.get('callId', '8f3a9b2c-1d4e-4c5f-b8a7-2e9f1c3d5e7a') if input_data else '8f3a9b2c-1d4e-4c5f-b8a7-2e9f1c3d5e7a'
        return {
            "id": call_id,
            "callerNumber": "+34612345678",
            "duration": 142,
            "transcript": "[09:32:11] Cliente: Hola, buenos días. Llamo porque no he recibido mi factura este mes y me gustaría saber qué ha pasado.\n[09:32:25] Agente: Buenos días, soy Carlos del equipo de soporte. Enseguida lo miro. ¿Podría facilitarme su número de cliente o DNI?\n[09:32:45] Cliente: Claro, es el 12345678A.\n[09:32:55] Agente: Perfecto, un momento por favor... Ya veo el problema. Su factura se generó el día 3 pero hubo un error en el envío postal. ¿Desea que se la reenviemos por email?\n[09:33:10] Cliente: Sí, por favor. Mi email es juan.perez@gmail.com.\n[09:33:20] Agente: Listo, acabo de enviársela a su correo. También he apuntado la incidencia para que no vuelva a ocurrir. ¿Hay algo más en lo que pueda ayudarle?\n[09:33:35] Cliente: No, muchas gracias por la ayuda.\n[09:33:40] Agente: De nada, que tenga un buen día.",
            "recordingUrl": "https://storage.atteq.es/recordings/8f3a9b2c-1d4e-4c5f-b8a7-2e9f1c3d5e7a.mp3",
            "receivedAt": "2026-04-15T09:32:11.000Z",
            "Agent": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "name": "Soporte General"
            },
            "CallNodeRecords": [
                {
                    "id": "rec-1a2b3c4d-5e6f-7890-abcd-ef1234567890",
                    "nodeId": "node-intro",
                    "enteredAt": "2026-04-15T09:32:11.000Z",
                    "exitedAt": "2026-04-15T09:32:25.000Z",
                    "toolsUsed": ["buscar_cliente"],
                    "Node": {"id": "node-intro", "name": "Introducción"}
                },
                {
                    "id": "rec-2b3c4d5e-6f7a-8901-bcde-f12345678901",
                    "nodeId": "node-billing",
                    "enteredAt": "2026-04-15T09:32:25.000Z",
                    "exitedAt": "2026-04-15T09:34:33.000Z",
                    "toolsUsed": ["consultar_factura", "enviar_email"],
                    "Node": {"id": "node-billing", "name": "Facturación"}
                }
            ]
        }

    @api.model
    def _demo_agents_list(self):
        return [
            {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "userId": "usr-9a8b7c6d-5e4f-3210-fedc-ba9876543210",
                "name": "Soporte General",
                "description": "Agente para soporte al cliente y consultas generales",
                "rootNodeId": "node-intro",
                "greeting": "Hola, soy el asistente de soporte. ¿En qué te puedo ayudar?",
                "aiProfileId": "prof-12345678-90ab-cdef-1234-567890abcdef",
                "createdAt": "2026-01-10T08:00:00.000Z",
                "updatedAt": "2026-04-20T14:30:00.000Z"
            },
            {
                "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                "userId": "usr-9a8b7c6d-5e4f-3210-fedc-ba9876543210",
                "name": "Ventas",
                "description": "Agente para consultas de ventas y pedidos",
                "rootNodeId": "node-sales-intro",
                "greeting": "Bienvenido al departamento de ventas. ¿Cómo puedo ayudarte?",
                "aiProfileId": "prof-23456789-01bc-defa-2345-678901abcdef",
                "createdAt": "2026-02-15T10:00:00.000Z",
                "updatedAt": "2026-04-18T09:15:00.000Z"
            }
        ]

    @api.model
    def _demo_agent_by_id(self, input_data):
        agent_id = input_data.get('agentId', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') if input_data else 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        is_ventas = agent_id == 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
        if is_ventas:
            return self._demo_agent_ventas(agent_id)
        return self._demo_agent_soporte(agent_id)

    @api.model
    def _demo_agent_soporte(self, agent_id):
        # Column layout: x=100 (col1), x=420 (col2), x=740 (col3)
        # Rows spaced 180px apart vertically so nodes (90px tall) have 90px gap
        return {
            "id": agent_id,
            "userId": "usr-9a8b7c6d-5e4f-3210-fedc-ba9876543210",
            "name": "Soporte General",
            "description": "Agente para soporte al cliente y consultas generales",
            "greeting": "Hola, soy el asistente de soporte. ¿En qué te puedo ayudar?",
            "rootNodeId": "node-intro",
            "aiProfileId": "prof-12345678-90ab-cdef-1234-567890abcdef",
            "createdAt": "2026-01-10T08:00:00.000Z",
            "updatedAt": "2026-04-20T14:30:00.000Z",
            "AgentNode": [
                {
                    "agentId": agent_id, "nodeId": "node-intro",
                    "positionX": 100.0, "positionY": 270.0,
                    "Node": {
                        "id": "node-intro", "name": "Bienvenida",
                        "description": "Saludo y clasificación inicial",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "tc-001", "name": "Identificar cliente"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-identify",
                    "positionX": 420.0, "positionY": 90.0,
                    "Node": {
                        "id": "node-identify", "name": "Identificación",
                        "description": "Verificar datos del cliente",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "tc-002", "name": "Buscar cliente"}},
                            {"ToolConfiguration": {"id": "tc-003", "name": "Verificar DNI"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-billing",
                    "positionX": 420.0, "positionY": 270.0,
                    "Node": {
                        "id": "node-billing", "name": "Facturación",
                        "description": "Consultas de facturas y pagos",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "tc-004", "name": "Consultar factura"}},
                            {"ToolConfiguration": {"id": "tc-005", "name": "Reenviar factura"}},
                            {"ToolConfiguration": {"id": "tc-006", "name": "Generar enlace pago"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-tech",
                    "positionX": 420.0, "positionY": 450.0,
                    "Node": {
                        "id": "node-tech", "name": "Soporte Técnico",
                        "description": "Incidencias y problemas técnicos",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "tc-007", "name": "Crear ticket"}},
                            {"ToolConfiguration": {"id": "tc-008", "name": "Consultar estado"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-escalate",
                    "positionX": 740.0, "positionY": 180.0,
                    "Node": {
                        "id": "node-escalate", "name": "Escalado",
                        "description": "Deriva a agente humano",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "tc-009", "name": "Notificar supervisor"}},
                            {"ToolConfiguration": {"id": "tc-010", "name": "Crear caso urgente"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-close",
                    "positionX": 740.0, "positionY": 360.0,
                    "Node": {
                        "id": "node-close", "name": "Cierre",
                        "description": "Despedida y encuesta de satisfacción",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "tc-011", "name": "Enviar encuesta"}}
                        ]
                    }
                },
            ],
            "AgentEdge": [
                {
                    "id": "edge-01", "agentId": agent_id,
                    "fromNodeId": "node-intro", "toNodeId": "node-identify",
                    "label": "identificar", "type": "LLM",
                    "condition": None, "navigationHint": "Solicitar datos del cliente",
                    "transitionBehavior": "SILENT", "transitionInstruction": None
                },
                {
                    "id": "edge-02", "agentId": agent_id,
                    "fromNodeId": "node-identify", "toNodeId": "node-billing",
                    "label": "facturación", "type": "LLM",
                    "condition": None, "navigationHint": "El usuario pregunta por su factura",
                    "transitionBehavior": "SILENT", "transitionInstruction": None
                },
                {
                    "id": "edge-03", "agentId": agent_id,
                    "fromNodeId": "node-identify", "toNodeId": "node-tech",
                    "label": "soporte", "type": "LLM",
                    "condition": None, "navigationHint": "El usuario tiene un problema técnico",
                    "transitionBehavior": "SILENT", "transitionInstruction": None
                },
                {
                    "id": "edge-04", "agentId": agent_id,
                    "fromNodeId": "node-billing", "toNodeId": "node-close",
                    "label": "resuelto", "type": "LLM",
                    "condition": None, "navigationHint": "Incidencia de facturación resuelta",
                    "transitionBehavior": "AI_CONTINUES", "transitionInstruction": None
                },
                {
                    "id": "edge-05", "agentId": agent_id,
                    "fromNodeId": "node-tech", "toNodeId": "node-escalate",
                    "label": "escalar", "type": "CONDITION",
                    "condition": "ticket.priority == 'high'", "navigationHint": "Problema crítico sin resolución",
                    "transitionBehavior": "USER_TURN", "transitionInstruction": None
                },
                {
                    "id": "edge-06", "agentId": agent_id,
                    "fromNodeId": "node-tech", "toNodeId": "node-close",
                    "label": "resuelto", "type": "LLM",
                    "condition": None, "navigationHint": "Problema técnico resuelto",
                    "transitionBehavior": "AI_CONTINUES", "transitionInstruction": None
                },
                {
                    "id": "edge-07", "agentId": agent_id,
                    "fromNodeId": "node-escalate", "toNodeId": "node-close",
                    "label": "transferido", "type": "LLM",
                    "condition": None, "navigationHint": "Caso transferido a humano",
                    "transitionBehavior": "SILENT", "transitionInstruction": None
                },
            ]
        }

    @api.model
    def _demo_agent_ventas(self, agent_id):
        return {
            "id": agent_id,
            "userId": "usr-9a8b7c6d-5e4f-3210-fedc-ba9876543210",
            "name": "Ventas",
            "description": "Agente para consultas de ventas y pedidos",
            "greeting": "Bienvenido al departamento de ventas. ¿Cómo puedo ayudarte?",
            "rootNodeId": "node-sales-intro",
            "aiProfileId": "prof-23456789-01bc-defa-2345-678901abcdef",
            "createdAt": "2026-02-15T10:00:00.000Z",
            "updatedAt": "2026-04-18T09:15:00.000Z",
            "AgentNode": [
                {
                    "agentId": agent_id, "nodeId": "node-sales-intro",
                    "positionX": 100.0, "positionY": 180.0,
                    "Node": {
                        "id": "node-sales-intro", "name": "Bienvenida Ventas",
                        "description": "Presentación y detección de necesidad",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "sv-001", "name": "Catálogo productos"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-catalog",
                    "positionX": 420.0, "positionY": 90.0,
                    "Node": {
                        "id": "node-catalog", "name": "Catálogo",
                        "description": "Mostrar productos disponibles",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "sv-002", "name": "Buscar producto"}},
                            {"ToolConfiguration": {"id": "sv-003", "name": "Ver stock"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-quote",
                    "positionX": 420.0, "positionY": 270.0,
                    "Node": {
                        "id": "node-quote", "name": "Presupuesto",
                        "description": "Generar oferta personalizada",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "sv-004", "name": "Crear presupuesto"}},
                            {"ToolConfiguration": {"id": "sv-005", "name": "Aplicar descuento"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-order",
                    "positionX": 740.0, "positionY": 90.0,
                    "Node": {
                        "id": "node-order", "name": "Pedido",
                        "description": "Tramitar el pedido del cliente",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "sv-006", "name": "Crear pedido"}},
                            {"ToolConfiguration": {"id": "sv-007", "name": "Confirmar pago"}}
                        ]
                    }
                },
                {
                    "agentId": agent_id, "nodeId": "node-sales-close",
                    "positionX": 740.0, "positionY": 270.0,
                    "Node": {
                        "id": "node-sales-close", "name": "Cierre Venta",
                        "description": "Confirmación y seguimiento post-venta",
                        "isSystem": False,
                        "NodeTool": [
                            {"ToolConfiguration": {"id": "sv-008", "name": "Enviar confirmación"}}
                        ]
                    }
                },
            ],
            "AgentEdge": [
                {
                    "id": "sv-edge-01", "agentId": agent_id,
                    "fromNodeId": "node-sales-intro", "toNodeId": "node-catalog",
                    "label": "ver catálogo", "type": "LLM",
                    "condition": None, "navigationHint": "Cliente quiere ver productos",
                    "transitionBehavior": "SILENT", "transitionInstruction": None
                },
                {
                    "id": "sv-edge-02", "agentId": agent_id,
                    "fromNodeId": "node-sales-intro", "toNodeId": "node-quote",
                    "label": "presupuesto", "type": "LLM",
                    "condition": None, "navigationHint": "Cliente pide presupuesto directo",
                    "transitionBehavior": "SILENT", "transitionInstruction": None
                },
                {
                    "id": "sv-edge-03", "agentId": agent_id,
                    "fromNodeId": "node-catalog", "toNodeId": "node-quote",
                    "label": "añadir oferta", "type": "LLM",
                    "condition": None, "navigationHint": "Cliente interesado en un producto",
                    "transitionBehavior": "AI_CONTINUES", "transitionInstruction": None
                },
                {
                    "id": "sv-edge-04", "agentId": agent_id,
                    "fromNodeId": "node-quote", "toNodeId": "node-order",
                    "label": "confirmar", "type": "LLM",
                    "condition": None, "navigationHint": "Cliente acepta presupuesto",
                    "transitionBehavior": "USER_TURN", "transitionInstruction": None
                },
                {
                    "id": "sv-edge-05", "agentId": agent_id,
                    "fromNodeId": "node-order", "toNodeId": "node-sales-close",
                    "label": "pedido creado", "type": "LLM",
                    "condition": None, "navigationHint": "Pedido confirmado y pagado",
                    "transitionBehavior": "AI_CONTINUES", "transitionInstruction": None
                },
            ]
        }

    @api.model
    def _demo_agent_logs(self, input_data):
        agent_id = input_data.get('agentId', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') if input_data else 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        return [
            {
                "id": "log-5e6f7a8b-9c0d-1234-efab-567890123456",
                "agentId": agent_id,
                "sessionId": "sess-9a8b7c6d-5e4f-3210-fedc-ba9876543210",
                "nodeId": "node-intro",
                "eventType": "NODE_TRANSITION_SUCCESS",
                "toolName": None,
                "edgeLabel": "facturación",
                "fromNodeId": "node-intro",
                "toNodeId": "node-billing",
                "durationMs": 243,
                "createdAt": "2026-04-15T09:32:15.000Z"
            },
            {
                "id": "log-6f7a8b9c-0d1e-2345-fabc-678901234567",
                "agentId": agent_id,
                "sessionId": "sess-8b7c6d5e-4f3a-2109-edcb-a98765432109",
                "nodeId": "node-billing",
                "eventType": "TOOL_CALL_SUCCESS",
                "toolName": "consultar_factura",
                "edgeLabel": None,
                "fromNodeId": None,
                "toNodeId": None,
                "durationMs": 156,
                "createdAt": "2026-04-15T09:33:22.000Z"
            },
            {
                "id": "log-7a8b9c0d-1e2f-3456-abcd-789012345678",
                "agentId": agent_id,
                "sessionId": "sess-7c6d5e4f-3a2b-1098-dcba-987654321098",
                "nodeId": "node-intro",
                "eventType": "AGENT_RESOLVED",
                "toolName": None,
                "edgeLabel": None,
                "fromNodeId": None,
                "toNodeId": None,
                "durationMs": 0,
                "createdAt": "2026-04-16T10:15:30.000Z"
            },
            {
                "id": "log-8b9c0d1e-2f3a-4567-bcde-890123456789",
                "agentId": agent_id,
                "sessionId": "sess-6d5e4f3a-2b1c-0987-cba9-876543210987",
                "nodeId": "node-billing",
                "eventType": "TOOL_CALL_SUCCESS",
                "toolName": "enviar_email",
                "edgeLabel": None,
                "fromNodeId": None,
                "toNodeId": None,
                "durationMs": 89,
                "createdAt": "2026-04-17T11:22:45.000Z"
            },
            {
                "id": "log-9c0d1e2f-3a4b-5678-cdef-901234567890",
                "agentId": agent_id,
                "sessionId": "sess-5e4f3a2b-1c0d-9876-ba98-765432109876",
                "nodeId": "node-intro",
                "eventType": "NODE_TRANSITION_SUCCESS",
                "toolName": None,
                "edgeLabel": "consulta técnica",
                "fromNodeId": "node-intro",
                "toNodeId": "node-tech",
                "durationMs": 312,
                "createdAt": "2026-04-18T08:45:10.000Z"
            }
        ]

    @api.model
    def get_calls(self, date_from=None, date_to=None):
        input_data = {}
        if date_from or date_to:
            date_range = {}
            if date_from:
                date_range['from'] = date_from if isinstance(date_from, str) else date_from.isoformat() + 'Z'
            if date_to:
                date_range['to'] = date_to if isinstance(date_to, str) else date_to.isoformat() + 'Z'
            input_data['dateRange'] = date_range
        return self._trpc_request('calls.list', input_data)

    @api.model
    def get_call_by_id(self, call_id):
        return self._trpc_request('calls.getById', {'callId': call_id})

    @api.model
    def get_agents(self):
        return self._trpc_request('agents.list', {})

    @api.model
    def get_agent_by_id(self, agent_id):
        return self._trpc_request('agents.getById', {'agentId': agent_id})

    @api.model
    def get_agent_logs(self, agent_id, limit=100):
        limit = max(1, min(limit, 500))
        return self._trpc_request('agents.getLogs', {'agentId': agent_id, 'limit': limit})

    @api.model
    def authenticate(self, email, password):
        host, _ = self._get_config()
        url = f"{host}/api/auth/token"
        headers = {'Content-Type': 'application/json'}

        try:
            response = requests.post(url, json={'email': email, 'password': password}, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            token = result.get('token')
            if not token:
                raise UserError(_("No token received from Atteq authentication endpoint."))
            self.env['ir.config_parameter'].sudo().set_param('atteq.api.token', token)
            return token
        except Exception as e:
            raise UserError(_("Atteq authentication failed: %s") % str(e))
