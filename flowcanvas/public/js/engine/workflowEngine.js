/**
 * FlowCanvas - Workflow Execution Engine & Validator
 * 
 * Implements:
 * 1. Pre-execution workflow validation (start node check, input wiring, cycle detection)
 * 2. Deterministic DAG traversal with dynamic branch routing for Condition nodes
 * 3. Step-by-step trace generation suitable for UI animation and result reporting
 */

import { NODE_TYPES, NODE_SCHEMAS, executeNode } from './nodes.js';

/**
 * Validate a workflow before execution.
 * 
 * @param {Object} workflow { nodes: Array, edges: Array }
 * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
 */
export function validateWorkflow(workflow) {
  const errors = [];
  const warnings = [];

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return { valid: false, errors: ['Workflow data is missing or invalid.'], warnings: [] };
  }

  const { nodes, edges = [] } = workflow;

  if (nodes.length === 0) {
    return { valid: false, errors: ['Canvas is empty. Please add nodes to create a workflow.'], warnings: [] };
  }

  // 1. Check for Start node
  const startNodes = nodes.filter(n => n.type === NODE_TYPES.START);
  if (startNodes.length === 0) {
    errors.push('Workflow must contain at least one "Start" node to mark execution beginning.');
  } else if (startNodes.length > 1) {
    warnings.push('Multiple "Start" nodes detected. FlowCanvas will execute starting from the first Start node.');
  }

  // 2. Validate node configurations and ports
  const nodeMap = new Map();
  for (const node of nodes) {
    if (!node.id) {
      errors.push('Encountered node without a unique ID.');
      continue;
    }
    nodeMap.set(node.id, node);

    const schema = NODE_SCHEMAS[node.type];
    if (!schema) {
      errors.push(`Node "${node.title || node.id}" has an unknown type: "${node.type}".`);
      continue;
    }

    // Config checks
    if (node.type === NODE_TYPES.INPUT) {
      if (node.config?.value === undefined || node.config?.value === null || node.config?.value === '') {
        errors.push(`Input node "${node.title || node.id}" has no value configured.`);
      }
    } else if (node.type === NODE_TYPES.TRANSFORM) {
      const op = node.config?.operation || 'multiply';
      if ((op === 'add' || op === 'multiply') && (node.config?.operand === undefined || isNaN(Number(node.config?.operand)))) {
        errors.push(`Transform node "${node.title || node.id}" requires a valid numeric operand for "${op}".`);
      }
    } else if (node.type === NODE_TYPES.CONDITION) {
      if (node.config?.threshold === undefined || isNaN(Number(node.config?.threshold))) {
        errors.push(`Condition node "${node.title || node.id}" requires a valid numeric threshold.`);
      }
    }
  }

  // 3. Validate edges
  for (const edge of edges) {
    if (!nodeMap.has(edge.sourceNodeId)) {
      errors.push(`Edge connects from non-existent node ID: "${edge.sourceNodeId}".`);
    }
    if (!nodeMap.has(edge.targetNodeId)) {
      errors.push(`Edge connects to non-existent node ID: "${edge.targetNodeId}".`);
    }
  }

  // 4. Check for disconnected required inputs
  for (const node of nodes) {
    const schema = NODE_SCHEMAS[node.type];
    if (!schema) continue;

    const requiredInputs = schema.inputs.filter(inp => !inp.optional);
    if (requiredInputs.length > 0) {
      const incomingEdges = edges.filter(e => e.targetNodeId === node.id);
      if (incomingEdges.length === 0) {
        errors.push(`Node "${node.title || node.id}" (${schema.name}) requires an input connection, but none is connected.`);
      }
    }
  }

  // 5. Cycle Detection (DFS)
  const adjacency = new Map();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (adjacency.has(edge.sourceNodeId)) {
      adjacency.get(edge.sourceNodeId).push(edge.targetNodeId);
    }
  }

  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(nodeId) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        if (hasCycle(neighborId)) return true;
      } else if (recursionStack.has(neighborId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push('Workflow contains a circular dependency (loop). FlowCanvas only supports Directed Acyclic Graphs (DAG).');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Executes a workflow graph deterministically.
 * 
 * @param {Object} workflow { nodes: Array, edges: Array }
 * @returns {Promise<Object>} Execution result object with logs, nodeResults, finalOutputs
 */
export async function executeWorkflow(workflow) {
  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    return {
      success: false,
      validationFailed: true,
      errors: validation.errors,
      logs: validation.errors.map((err, idx) => ({
        step: idx + 1,
        type: 'error',
        message: err
      })),
      nodeResults: {},
      finalOutputs: {}
    };
  }

  const startTime = Date.now();
  const { nodes, edges = [] } = workflow;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find start node
  const startNode = nodes.find(n => n.type === NODE_TYPES.START);

  const logs = [];
  const nodeResults = {};
  const finalOutputs = {};
  let stepCounter = 1;

  // We track ready queue of nodes to execute
  // Each entry in queue: { nodeId: string, deliveredData: { [portId: string]: any } }
  const queue = [{ nodeId: startNode.id, deliveredData: {} }];
  const executedNodeIds = new Set();

  while (queue.length > 0) {
    const { nodeId, deliveredData } = queue.shift();
    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) continue;

    // Execute node
    const result = executeNode(currentNode, deliveredData);

    const stepLog = {
      step: stepCounter++,
      nodeId: currentNode.id,
      nodeTitle: currentNode.title || currentNode.id,
      nodeType: currentNode.type,
      success: result.success,
      output: result.output,
      details: result.details || result.error,
      timestamp: new Date().toLocaleTimeString()
    };

    logs.push(stepLog);

    if (!result.success) {
      nodeResults[currentNode.id] = {
        status: 'error',
        error: result.error,
        output: null
      };
      return {
        success: false,
        executionError: true,
        error: result.error,
        logs,
        nodeResults,
        finalOutputs,
        durationMs: Date.now() - startTime
      };
    }

    nodeResults[currentNode.id] = {
      status: 'success',
      output: result.output,
      details: result.details,
      activeBranch: result.activeBranch,
      conditionResult: result.conditionResult
    };

    executedNodeIds.add(currentNode.id);

    if (currentNode.type === NODE_TYPES.OUTPUT) {
      finalOutputs[currentNode.id] = {
        title: currentNode.title || 'Final Output',
        value: result.output
      };
    }

    // Determine outgoing edges to follow
    // For Condition node: only follow edges matching activeBranch ('true' or 'false')
    const outgoingEdges = edges.filter(e => {
      if (e.sourceNodeId !== currentNode.id) return false;
      if (currentNode.type === NODE_TYPES.CONDITION) {
        return e.sourcePortId === result.activeBranch;
      }
      return true;
    });

    for (const edge of outgoingEdges) {
      const targetNode = nodeMap.get(edge.targetNodeId);
      if (!targetNode) continue;

      // Check if target is already in queue or if we should add it
      let queueItem = queue.find(item => item.nodeId === targetNode.id);
      if (!queueItem) {
        queueItem = { nodeId: targetNode.id, deliveredData: {} };
        queue.push(queueItem);
      }
      
      const targetPortId = edge.targetPortId || 'in';
      queueItem.deliveredData[targetPortId] = result.output;
    }
  }

  // Mark all unexecuted nodes as skipped
  for (const node of nodes) {
    if (!executedNodeIds.has(node.id)) {
      nodeResults[node.id] = {
        status: 'skipped',
        output: null,
        details: 'Not reached during execution (inactive branch or unconnected).'
      };
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    logs,
    nodeResults,
    finalOutputs,
    durationMs
  };
}
