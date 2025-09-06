'use client';

import React from 'react';
import { WorkflowDiagramReactFlow } from '@/components/workflow-diagram-react-flow';

// Test workflow data with n8n-style nodes and connections
const testWorkflowData = {
  "name": "Test React Flow Visualization",
  "nodes": [
    {
      "parameters": {},
      "id": "f7a1b2c3-d4e5-f6g7-h8i9-j0k1l2m3n4o5",
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook",
        "responseMode": "onReceived",
        "options": {}
      },
      "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [450, 300],
      "webhookId": "test-webhook-id"
    },
    {
      "parameters": {
        "functionCode": "return items.map(item => ({\n  json: {\n    ...item.json,\n    processed: true,\n    timestamp: new Date().toISOString()\n  }\n}));"
      },
      "id": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
      "name": "Process Data",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "requestMethod": "POST",
        "url": "https://api.example.com/data",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          }
        }
      },
      "id": "c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [850, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json[\"status\"]}}",
              "operation": "equal",
              "value2": "success"
            }
          ]
        }
      },
      "id": "d4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9",
      "name": "IF Success",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1050, 300]
    },
    {
      "parameters": {
        "resource": "sheet",
        "operation": "append",
        "documentId": "1A2B3C4D5E6F7G8H9I0J",
        "sheetName": "Sheet1",
        "options": {}
      },
      "id": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
      "name": "Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [1250, 250]
    },
    {
      "parameters": {
        "channel": "#general",
        "text": "Processing failed: {{$json[\"error\"]}}",
        "otherOptions": {}
      },
      "id": "f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1",
      "name": "Slack",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 1,
      "position": [1250, 350]
    }
  ],
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Webhook": {
      "main": [
        [
          {
            "node": "Process Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Data": {
      "main": [
        [
          {
            "node": "HTTP Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request": {
      "main": [
        [
          {
            "node": "IF Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "IF Success": {
      "main": [
        [
          {
            "node": "Google Sheets",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Slack",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
};

export default function TestWorkflowPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            React Flow n8n-Style Visualization Test
          </h1>
          <p className="text-gray-400">
            Testing the workflow diagram with 7 nodes, multiple connections, and branching logic
          </p>
        </div>
        
        <div className="glass-card p-6 h-[600px]">
          <WorkflowDiagramReactFlow 
            workflow={testWorkflowData as any} 
            autoRender={true} 
          />
        </div>
      </div>
    </div>
  );
}