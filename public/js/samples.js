/**
 * FlowCanvas - Predefined Sample Workflows
 */

import { NODE_TYPES } from './engine/nodes.js';

export const SAMPLES = {
  // Required University Demo:
  // Start -> Input (10) -> Transform (*2) -> Condition (>15) -> Output
  CANONICAL_DEMO: {
    id: 'sample-canonical',
    name: 'Required Demo: Multiply & Condition (>15)',
    description: 'Start → Input (10) → Multiply by 2 → Condition (>15) → True Output (20)',
    workflow: {
      nodes: [
        {
          id: 'node-start',
          type: NODE_TYPES.START,
          title: 'Start',
          position: { x: 60, y: 160 },
          config: {}
        },
        {
          id: 'node-input',
          type: NODE_TYPES.INPUT,
          title: 'Input (10)',
          position: { x: 260, y: 160 },
          config: {
            value: 10,
            valueType: 'number'
          }
        },
        {
          id: 'node-transform',
          type: NODE_TYPES.TRANSFORM,
          title: 'Transform (×2)',
          position: { x: 480, y: 160 },
          config: {
            operation: 'multiply',
            operand: 2
          }
        },
        {
          id: 'node-condition',
          type: NODE_TYPES.CONDITION,
          title: 'Condition (>15)',
          position: { x: 700, y: 160 },
          config: {
            operator: '>',
            threshold: 15
          }
        },
        {
          id: 'node-output-true',
          type: NODE_TYPES.OUTPUT,
          title: 'Output (True Branch)',
          position: { x: 960, y: 100 },
          config: {}
        },
        {
          id: 'node-output-false',
          type: NODE_TYPES.OUTPUT,
          title: 'Output (False Branch)',
          position: { x: 960, y: 260 },
          config: {}
        }
      ],
      edges: [
        {
          id: 'edge-1',
          sourceNodeId: 'node-start',
          sourcePortId: 'out',
          targetNodeId: 'node-input',
          targetPortId: 'in'
        },
        {
          id: 'edge-2',
          sourceNodeId: 'node-input',
          sourcePortId: 'out',
          targetNodeId: 'node-transform',
          targetPortId: 'in'
        },
        {
          id: 'edge-3',
          sourceNodeId: 'node-transform',
          sourcePortId: 'out',
          targetNodeId: 'node-condition',
          targetPortId: 'in'
        },
        {
          id: 'edge-4',
          sourceNodeId: 'node-condition',
          sourcePortId: 'true',
          targetNodeId: 'node-output-true',
          targetPortId: 'in'
        },
        {
          id: 'edge-5',
          sourceNodeId: 'node-condition',
          sourcePortId: 'false',
          targetNodeId: 'node-output-false',
          targetPortId: 'in'
        }
      ]
    }
  },

  // Alternative Demo: Input 5 -> Multiply 2 = 10 -> Condition > 15 is False -> False Branch
  FALSE_BRANCH_DEMO: {
    id: 'sample-false-branch',
    name: 'Branching Test: Input (5) → False Branch',
    description: 'Start → Input (5) → Multiply by 2 → 10 is NOT > 15 → False Output (10)',
    workflow: {
      nodes: [
        {
          id: 'node-start',
          type: NODE_TYPES.START,
          title: 'Start',
          position: { x: 60, y: 160 },
          config: {}
        },
        {
          id: 'node-input',
          type: NODE_TYPES.INPUT,
          title: 'Input (5)',
          position: { x: 260, y: 160 },
          config: {
            value: 5,
            valueType: 'number'
          }
        },
        {
          id: 'node-transform',
          type: NODE_TYPES.TRANSFORM,
          title: 'Transform (×2)',
          position: { x: 480, y: 160 },
          config: {
            operation: 'multiply',
            operand: 2
          }
        },
        {
          id: 'node-condition',
          type: NODE_TYPES.CONDITION,
          title: 'Condition (>15)',
          position: { x: 700, y: 160 },
          config: {
            operator: '>',
            threshold: 15
          }
        },
        {
          id: 'node-output-true',
          type: NODE_TYPES.OUTPUT,
          title: 'Output (True Branch)',
          position: { x: 960, y: 100 },
          config: {}
        },
        {
          id: 'node-output-false',
          type: NODE_TYPES.OUTPUT,
          title: 'Output (False Branch)',
          position: { x: 960, y: 260 },
          config: {}
        }
      ],
      edges: [
        {
          id: 'edge-1',
          sourceNodeId: 'node-start',
          sourcePortId: 'out',
          targetNodeId: 'node-input',
          targetPortId: 'in'
        },
        {
          id: 'edge-2',
          sourceNodeId: 'node-input',
          sourcePortId: 'out',
          targetNodeId: 'node-transform',
          targetPortId: 'in'
        },
        {
          id: 'edge-3',
          sourceNodeId: 'node-transform',
          sourcePortId: 'out',
          targetNodeId: 'node-condition',
          targetPortId: 'in'
        },
        {
          id: 'edge-4',
          sourceNodeId: 'node-condition',
          sourcePortId: 'true',
          targetNodeId: 'node-output-true',
          targetPortId: 'in'
        },
        {
          id: 'edge-5',
          sourceNodeId: 'node-condition',
          sourcePortId: 'false',
          targetNodeId: 'node-output-false',
          targetPortId: 'in'
        }
      ]
    }
  },

  // Text Demo: String Uppercase
  TEXT_DEMO: {
    id: 'sample-text',
    name: 'Text Demo: Uppercase Conversion',
    description: 'Start → Input ("flowcanvas") → Uppercase Transform → Output ("FLOWCANVAS")',
    workflow: {
      nodes: [
        {
          id: 'node-start',
          type: NODE_TYPES.START,
          title: 'Start',
          position: { x: 80, y: 180 },
          config: {}
        },
        {
          id: 'node-input',
          type: NODE_TYPES.INPUT,
          title: 'Input Text',
          position: { x: 300, y: 180 },
          config: {
            value: 'flowcanvas software engineering',
            valueType: 'text'
          }
        },
        {
          id: 'node-transform',
          type: NODE_TYPES.TRANSFORM,
          title: 'Uppercase',
          position: { x: 550, y: 180 },
          config: {
            operation: 'uppercase'
          }
        },
        {
          id: 'node-output',
          type: NODE_TYPES.OUTPUT,
          title: 'Output',
          position: { x: 800, y: 180 },
          config: {}
        }
      ],
      edges: [
        {
          id: 'edge-1',
          sourceNodeId: 'node-start',
          sourcePortId: 'out',
          targetNodeId: 'node-input',
          targetPortId: 'in'
        },
        {
          id: 'edge-2',
          sourceNodeId: 'node-input',
          sourcePortId: 'out',
          targetNodeId: 'node-transform',
          targetPortId: 'in'
        },
        {
          id: 'edge-3',
          sourceNodeId: 'node-transform',
          sourcePortId: 'out',
          targetNodeId: 'node-output',
          targetPortId: 'in'
        }
      ]
    }
  }
};
