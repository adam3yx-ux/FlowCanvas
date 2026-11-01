import test from 'node:test';
import assert from 'node:assert/strict';
import { executeWorkflow, validateWorkflow } from '../public/js/engine/workflowEngine.js';
import { NODE_TYPES } from '../public/js/engine/nodes.js';

test('FlowCanvas Engine - Canonical Demo: Start -> Input(10) -> Transform(*2) -> Condition(>15) -> Output', async () => {
  const workflow = {
    nodes: [
      { id: 'node_start', type: NODE_TYPES.START, title: 'Start', config: {} },
      { id: 'node_input', type: NODE_TYPES.INPUT, title: 'Input', config: { value: 10, valueType: 'number' } },
      { id: 'node_transform', type: NODE_TYPES.TRANSFORM, title: 'Transform', config: { operation: 'multiply', operand: 2 } },
      { id: 'node_condition', type: NODE_TYPES.CONDITION, title: 'Condition', config: { operator: '>', threshold: 15 } },
      { id: 'node_output', type: NODE_TYPES.OUTPUT, title: 'Output', config: {} }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'node_start', sourcePortId: 'out', targetNodeId: 'node_input', targetPortId: 'in' },
      { id: 'e2', sourceNodeId: 'node_input', sourcePortId: 'out', targetNodeId: 'node_transform', targetPortId: 'in' },
      { id: 'e3', sourceNodeId: 'node_transform', sourcePortId: 'out', targetNodeId: 'node_condition', targetPortId: 'in' },
      { id: 'e4', sourceNodeId: 'node_condition', sourcePortId: 'true', targetNodeId: 'node_output', targetPortId: 'in' }
    ]
  };

  const result = await executeWorkflow(workflow);
  assert.equal(result.success, true);
  assert.equal(result.nodeResults['node_input'].output, 10);
  assert.equal(result.nodeResults['node_transform'].output, 20);
  assert.equal(result.nodeResults['node_condition'].conditionResult, true);
  assert.equal(result.nodeResults['node_condition'].activeBranch, 'true');
  assert.equal(result.nodeResults['node_output'].status, 'success');
  assert.equal(result.nodeResults['node_output'].output, 20);
  assert.equal(result.finalOutputs['node_output'].value, 20);
});

test('FlowCanvas Engine - Input 5 yields 10 which is not > 15 (Condition False)', async () => {
  const workflow = {
    nodes: [
      { id: 'node_start', type: NODE_TYPES.START, title: 'Start', config: {} },
      { id: 'node_input', type: NODE_TYPES.INPUT, title: 'Input', config: { value: 5, valueType: 'number' } },
      { id: 'node_transform', type: NODE_TYPES.TRANSFORM, title: 'Transform', config: { operation: 'multiply', operand: 2 } },
      { id: 'node_condition', type: NODE_TYPES.CONDITION, title: 'Condition', config: { operator: '>', threshold: 15 } },
      { id: 'node_output_true', type: NODE_TYPES.OUTPUT, title: 'True Output', config: {} },
      { id: 'node_output_false', type: NODE_TYPES.OUTPUT, title: 'False Output', config: {} }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'node_start', sourcePortId: 'out', targetNodeId: 'node_input', targetPortId: 'in' },
      { id: 'e2', sourceNodeId: 'node_input', sourcePortId: 'out', targetNodeId: 'node_transform', targetPortId: 'in' },
      { id: 'e3', sourceNodeId: 'node_transform', sourcePortId: 'out', targetNodeId: 'node_condition', targetPortId: 'in' },
      { id: 'e4', sourceNodeId: 'node_condition', sourcePortId: 'true', targetNodeId: 'node_output_true', targetPortId: 'in' },
      { id: 'e5', sourceNodeId: 'node_condition', sourcePortId: 'false', targetNodeId: 'node_output_false', targetPortId: 'in' }
    ]
  };

  const result = await executeWorkflow(workflow);
  assert.equal(result.success, true);
  assert.equal(result.nodeResults['node_input'].output, 5);
  assert.equal(result.nodeResults['node_transform'].output, 10);
  assert.equal(result.nodeResults['node_condition'].conditionResult, false);
  assert.equal(result.nodeResults['node_condition'].activeBranch, 'false');
  // True branch was NOT reached
  assert.equal(result.nodeResults['node_output_true'].status, 'skipped');
  // False branch WAS reached
  assert.equal(result.nodeResults['node_output_false'].status, 'success');
  assert.equal(result.nodeResults['node_output_false'].output, 10);
});

test('FlowCanvas Engine - Transform Operations: Add', async () => {
  const workflow = {
    nodes: [
      { id: 's', type: NODE_TYPES.START, title: 'Start' },
      { id: 'i', type: NODE_TYPES.INPUT, title: 'Input', config: { value: 7 } },
      { id: 't', type: NODE_TYPES.TRANSFORM, title: 'Transform', config: { operation: 'add', operand: 13 } },
      { id: 'o', type: NODE_TYPES.OUTPUT, title: 'Output' }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 's', sourcePortId: 'out', targetNodeId: 'i', targetPortId: 'in' },
      { id: 'e2', sourceNodeId: 'i', sourcePortId: 'out', targetNodeId: 't', targetPortId: 'in' },
      { id: 'e3', sourceNodeId: 't', sourcePortId: 'out', targetNodeId: 'o', targetPortId: 'in' }
    ]
  };

  const result = await executeWorkflow(workflow);
  assert.equal(result.success, true);
  assert.equal(result.finalOutputs['o'].value, 20);
});

test('FlowCanvas Engine - Transform Operations: Uppercase', async () => {
  const workflow = {
    nodes: [
      { id: 's', type: NODE_TYPES.START, title: 'Start' },
      { id: 'i', type: NODE_TYPES.INPUT, title: 'Input', config: { value: 'flowcanvas demo' } },
      { id: 't', type: NODE_TYPES.TRANSFORM, title: 'Transform', config: { operation: 'uppercase' } },
      { id: 'o', type: NODE_TYPES.OUTPUT, title: 'Output' }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 's', sourcePortId: 'out', targetNodeId: 'i', targetPortId: 'in' },
      { id: 'e2', sourceNodeId: 'i', sourcePortId: 'out', targetNodeId: 't', targetPortId: 'in' },
      { id: 'e3', sourceNodeId: 't', sourcePortId: 'out', targetNodeId: 'o', targetPortId: 'in' }
    ]
  };

  const result = await executeWorkflow(workflow);
  assert.equal(result.success, true);
  assert.equal(result.finalOutputs['o'].value, 'FLOWCANVAS DEMO');
});

test('FlowCanvas Validator - Rejects workflow without Start node', () => {
  const workflow = {
    nodes: [
      { id: 'i', type: NODE_TYPES.INPUT, config: { value: 10 } }
    ],
    edges: []
  };

  const validation = validateWorkflow(workflow);
  assert.equal(validation.valid, false);
  assert.match(validation.errors[0], /Start/);
});

test('FlowCanvas Validator - Detects cyclic loop', () => {
  const workflow = {
    nodes: [
      { id: 's', type: NODE_TYPES.START },
      { id: 't1', type: NODE_TYPES.TRANSFORM, config: { operation: 'add', operand: 1 } },
      { id: 't2', type: NODE_TYPES.TRANSFORM, config: { operation: 'add', operand: 2 } }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 's', targetNodeId: 't1' },
      { id: 'e2', sourceNodeId: 't1', targetNodeId: 't2' },
      { id: 'e3', sourceNodeId: 't2', targetNodeId: 't1' } // cycle
    ]
  };

  const validation = validateWorkflow(workflow);
  assert.equal(validation.valid, false);
  assert.match(validation.errors[0], /circular dependency/i);
});
