/**
 * FlowCanvas - Node Definitions & Execution Logic
 * 
 * Supports the 5 required node types:
 * 1. Start: Workflow entry point
 * 2. Input: Provides a constant or configurable input value
 * 3. Transform: Predefined operations (add, multiply, uppercase)
 * 4. Condition: Branching logic (>, <, ==) with True and False output ports
 * 5. Output: Captures and displays the final value
 */

export const NODE_TYPES = {
  START: 'start',
  INPUT: 'input',
  TRANSFORM: 'transform',
  CONDITION: 'condition',
  OUTPUT: 'output'
};

export const NODE_SCHEMAS = {
  [NODE_TYPES.START]: {
    type: NODE_TYPES.START,
    name: 'Start',
    category: 'Trigger',
    description: 'Marks the beginning of the workflow execution.',
    badgeColor: '#10b981', // Emerald
    inputs: [],
    outputs: [
      { id: 'out', label: 'Trigger' }
    ],
    defaultConfig: {}
  },

  [NODE_TYPES.INPUT]: {
    type: NODE_TYPES.INPUT,
    name: 'Input',
    category: 'Data',
    description: 'Provides a configurable initial value (number or text).',
    badgeColor: '#0ea5e9', // Sky blue
    inputs: [
      { id: 'in', label: 'Flow (Optional)', optional: true }
    ],
    outputs: [
      { id: 'out', label: 'Value' }
    ],
    defaultConfig: {
      value: 10,
      valueType: 'number' // 'number' | 'text'
    }
  },

  [NODE_TYPES.TRANSFORM]: {
    type: NODE_TYPES.TRANSFORM,
    name: 'Transform',
    category: 'Process',
    description: 'Transforms incoming data with add, multiply, or uppercase.',
    badgeColor: '#8b5cf6', // Violet
    inputs: [
      { id: 'in', label: 'Input' }
    ],
    outputs: [
      { id: 'out', label: 'Result' }
    ],
    defaultConfig: {
      operation: 'multiply', // 'multiply' | 'add' | 'uppercase'
      operand: 2
    }
  },

  [NODE_TYPES.CONDITION]: {
    type: NODE_TYPES.CONDITION,
    name: 'Condition',
    category: 'Logic',
    description: 'Evaluates a condition and routes flow to True or False branches.',
    badgeColor: '#f59e0b', // Amber
    inputs: [
      { id: 'in', label: 'Input' }
    ],
    outputs: [
      { id: 'true', label: 'True', portClass: 'port-true' },
      { id: 'false', label: 'False', portClass: 'port-false' }
    ],
    defaultConfig: {
      operator: '>', // '>' | '<' | '=='
      threshold: 15
    }
  },

  [NODE_TYPES.OUTPUT]: {
    type: NODE_TYPES.OUTPUT,
    name: 'Output',
    category: 'Sink',
    description: 'Displays and records the final workflow output.',
    badgeColor: '#6366f1', // Indigo
    inputs: [
      { id: 'in', label: 'Value' }
    ],
    outputs: [],
    defaultConfig: {}
  }
};

/**
 * Execute a single node given its configuration and input values.
 * 
 * @param {Object} node Node object containing id, type, config
 * @param {Object} inputValues Map of portId -> value delivered by upstream edges
 * @returns {Object} Execution result { success: boolean, output: any, details: string, activeBranch?: string }
 */
export function executeNode(node, inputValues = {}) {
  const config = node.config || {};
  
  switch (node.type) {
    case NODE_TYPES.START: {
      return {
        success: true,
        output: null,
        details: 'Workflow initiated successfully.',
        activeBranch: 'out'
      };
    }

    case NODE_TYPES.INPUT: {
      let rawVal = config.value;
      if (rawVal === undefined || rawVal === null || rawVal === '') {
        return {
          success: false,
          error: `Node "${node.title || node.id}": Input value is required.`
        };
      }

      let parsedVal = rawVal;
      if (config.valueType === 'number' || (typeof rawVal === 'string' && !isNaN(Number(rawVal)) && rawVal.trim() !== '')) {
        const num = Number(rawVal);
        if (!isNaN(num)) {
          parsedVal = num;
        }
      }

      return {
        success: true,
        output: parsedVal,
        details: `Provided value: ${JSON.stringify(parsedVal)} (${typeof parsedVal})`,
        activeBranch: 'out'
      };
    }

    case NODE_TYPES.TRANSFORM: {
      const incomingVal = inputValues['in'];
      if (incomingVal === undefined) {
        return {
          success: false,
          error: `Node "${node.title || node.id}": Missing input data on port "in".`
        };
      }

      const operation = config.operation || 'multiply';
      const operand = Number(config.operand ?? 0);

      let result;
      let details;

      if (operation === 'add') {
        const numIn = Number(incomingVal);
        if (isNaN(numIn)) {
          return {
            success: false,
            error: `Node "${node.title || node.id}": Add operation requires a numeric input. Received: "${incomingVal}".`
          };
        }
        if (isNaN(operand)) {
          return {
            success: false,
            error: `Node "${node.title || node.id}": Add operation requires a numeric operand.`
          };
        }
        result = numIn + operand;
        details = `Added ${operand}: ${numIn} + ${operand} = ${result}`;
      } else if (operation === 'multiply') {
        const numIn = Number(incomingVal);
        if (isNaN(numIn)) {
          return {
            success: false,
            error: `Node "${node.title || node.id}": Multiply operation requires a numeric input. Received: "${incomingVal}".`
          };
        }
        if (isNaN(operand)) {
          return {
            success: false,
            error: `Node "${node.title || node.id}": Multiply operation requires a numeric operand.`
          };
        }
        result = numIn * operand;
        details = `Multiplied by ${operand}: ${numIn} × ${operand} = ${result}`;
      } else if (operation === 'uppercase') {
        result = String(incomingVal).toUpperCase();
        details = `Converted to uppercase: "${incomingVal}" → "${result}"`;
      } else {
        return {
          success: false,
          error: `Node "${node.title || node.id}": Unsupported operation "${operation}".`
        };
      }

      return {
        success: true,
        output: result,
        details,
        activeBranch: 'out'
      };
    }

    case NODE_TYPES.CONDITION: {
      const incomingVal = inputValues['in'];
      if (incomingVal === undefined) {
        return {
          success: false,
          error: `Node "${node.title || node.id}": Missing input data to evaluate condition.`
        };
      }

      const operator = config.operator || '>';
      const rawThreshold = config.threshold ?? 15;
      const numIncoming = Number(incomingVal);
      const numThreshold = Number(rawThreshold);

      let conditionMet = false;
      let comparisonStr = '';

      if (operator === '>') {
        if (isNaN(numIncoming) || isNaN(numThreshold)) {
          return {
            success: false,
            error: `Node "${node.title || node.id}": Greater-than (>) comparison requires numeric values. Got: ${incomingVal} and ${rawThreshold}.`
          };
        }
        conditionMet = numIncoming > numThreshold;
        comparisonStr = `${numIncoming} > ${numThreshold}`;
      } else if (operator === '<') {
        if (isNaN(numIncoming) || isNaN(numThreshold)) {
          return {
            success: false,
            error: `Node "${node.title || node.id}": Less-than (<) comparison requires numeric values. Got: ${incomingVal} and ${rawThreshold}.`
          };
        }
        conditionMet = numIncoming < numThreshold;
        comparisonStr = `${numIncoming} < ${numThreshold}`;
      } else if (operator === '==') {
        if (!isNaN(numIncoming) && !isNaN(numThreshold)) {
          conditionMet = numIncoming === numThreshold;
          comparisonStr = `${numIncoming} == ${numThreshold}`;
        } else {
          conditionMet = String(incomingVal) === String(rawThreshold);
          comparisonStr = `"${incomingVal}" == "${rawThreshold}"`;
        }
      } else {
        return {
          success: false,
          error: `Node "${node.title || node.id}": Unsupported comparison operator "${operator}".`
        };
      }

      const activeBranch = conditionMet ? 'true' : 'false';
      const details = `Condition evaluated: ${comparisonStr} is ${conditionMet ? 'TRUE' : 'FALSE'}. Taking [${activeBranch.toUpperCase()}] branch.`;

      return {
        success: true,
        output: incomingVal, // Pass through the incoming value to the chosen branch
        conditionResult: conditionMet,
        details,
        activeBranch
      };
    }

    case NODE_TYPES.OUTPUT: {
      const incomingVal = inputValues['in'];
      if (incomingVal === undefined) {
        return {
          success: false,
          error: `Node "${node.title || node.id}": No value received on input port.`
        };
      }

      return {
        success: true,
        output: incomingVal,
        details: `Final output recorded: ${JSON.stringify(incomingVal)}`,
        activeBranch: null
      };
    }

    default:
      return {
        success: false,
        error: `Unknown node type: "${node.type}".`
      };
  }
}
