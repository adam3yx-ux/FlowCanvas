/**
 * FlowCanvas - Node Properties Inspector (Right Panel)
 */

import { NODE_SCHEMAS, NODE_TYPES } from '../engine/nodes.js';

export class NodeInspector {
  constructor(containerEl, onUpdateNode, onDeleteNode) {
    this.container = containerEl;
    this.onUpdateNode = onUpdateNode;
    this.onDeleteNode = onDeleteNode;
    this.currentNode = null;
    this.renderEmpty();
  }

  renderEmpty() {
    this.currentNode = null;
    this.container.innerHTML = `
      <div class="inspector-empty-state">
        <div class="empty-icon">⚙️</div>
        <h4>No Node Selected</h4>
        <p>Select any node on the canvas to configure its properties and view execution details.</p>
      </div>
    `;
  }

  inspect(node) {
    if (!node) {
      this.renderEmpty();
      return;
    }

    this.currentNode = node;
    const schema = NODE_SCHEMAS[node.type] || {};
    const config = node.config || {};

    this.container.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-header-info">
          <span class="node-type-badge" style="background-color: ${schema.badgeColor}20; color: ${schema.badgeColor}; border: 1px solid ${schema.badgeColor}50;">
            ${schema.name}
          </span>
          <h3 class="inspector-title">${this.escapeHtml(node.title || schema.name)}</h3>
        </div>
        <button class="btn-delete-node" id="inspector-btn-delete" title="Delete this node">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
      </div>

      <div class="inspector-body">
        <!-- Node Label -->
        <div class="form-group">
          <label class="form-label" for="inp-node-title">Node Label</label>
          <input type="text" id="inp-node-title" class="form-input" value="${this.escapeHtml(node.title || '')}" placeholder="Label..." />
        </div>

        <hr class="inspector-divider" />

        <!-- Node Specific Configuration -->
        <div id="type-specific-config">
          ${this.renderTypeSpecificForm(node)}
        </div>
      </div>
    `;

    // Event Bindings
    const titleInput = this.container.querySelector('#inp-node-title');
    titleInput.addEventListener('input', (e) => {
      this.onUpdateNode(this.currentNode.id, null, e.target.value);
    });

    const deleteBtn = this.container.querySelector('#inspector-btn-delete');
    deleteBtn.addEventListener('click', () => {
      if (this.onDeleteNode && this.currentNode) {
        this.onDeleteNode(this.currentNode.id);
      }
    });

    this.bindTypeSpecificEvents(node);
  }

  renderTypeSpecificForm(node) {
    const config = node.config || {};

    switch (node.type) {
      case NODE_TYPES.START:
        return `
          <div class="info-callout">
            <strong>Start Trigger</strong>
            <p>This node kicks off the workflow execution sequence. No configuration required.</p>
          </div>
        `;

      case NODE_TYPES.INPUT:
        const isNum = (config.valueType || 'number') === 'number';
        return `
          <div class="form-group">
            <label class="form-label" for="inp-input-type">Data Type</label>
            <select id="inp-input-type" class="form-select">
              <option value="number" ${isNum ? 'selected' : ''}>Number</option>
              <option value="text" ${!isNum ? 'selected' : ''}>Text (String)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-input-value">Input Value</label>
            <input 
              type="${isNum ? 'number' : 'text'}" 
              id="inp-input-value" 
              class="form-input" 
              value="${this.escapeHtml(String(config.value ?? 10))}" 
              placeholder="Enter initial value..." 
            />
            <small class="form-help">This value is emitted to all downstream nodes.</small>
          </div>
        `;

      case NODE_TYPES.TRANSFORM:
        const op = config.operation || 'multiply';
        const isTextOp = op === 'uppercase';
        return `
          <div class="form-group">
            <label class="form-label" for="inp-transform-op">Transform Operation</label>
            <select id="inp-transform-op" class="form-select">
              <option value="multiply" ${op === 'multiply' ? 'selected' : ''}>Multiply by a number (×)</option>
              <option value="add" ${op === 'add' ? 'selected' : ''}>Add a number (+)</option>
              <option value="uppercase" ${op === 'uppercase' ? 'selected' : ''}>Convert text to UPPERCASE</option>
            </select>
          </div>
          <div class="form-group" id="operand-group" style="${isTextOp ? 'display:none;' : ''}">
            <label class="form-label" for="inp-transform-operand">Operand</label>
            <input 
              type="number" 
              id="inp-transform-operand" 
              class="form-input" 
              value="${this.escapeHtml(String(config.operand ?? 2))}" 
              step="any"
            />
            <small class="form-help">Value used in the calculation.</small>
          </div>
        `;

      case NODE_TYPES.CONDITION:
        const opComp = config.operator || '>';
        return `
          <div class="form-group">
            <label class="form-label" for="inp-condition-op">Comparison Operator</label>
            <select id="inp-condition-op" class="form-select">
              <option value=">" ${opComp === '>' ? 'selected' : ''}>Greater than (&gt;)</option>
              <option value="<" ${opComp === '<' ? 'selected' : ''}>Less than (&lt;)</option>
              <option value="==" ${opComp === '==' ? 'selected' : ''}>Equal to (==)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-condition-threshold">Threshold Value</label>
            <input 
              type="number" 
              id="inp-condition-threshold" 
              class="form-input" 
              value="${this.escapeHtml(String(config.threshold ?? 15))}" 
              step="any"
            />
            <small class="form-help">Value compared against incoming input data.</small>
          </div>
          <div class="info-callout callout-condition">
            <strong>Branching Behavior:</strong>
            <p>• If condition evaluates to <b>True</b>, only the <span style="color:#10b981;font-weight:600;">True</span> branch executes.</p>
            <p>• If condition evaluates to <b>False</b>, only the <span style="color:#f59e0b;font-weight:600;">False</span> branch executes.</p>
          </div>
        `;

      case NODE_TYPES.OUTPUT:
        return `
          <div class="info-callout callout-output">
            <strong>Final Workflow Output</strong>
            <p>Receives and presents the result produced by the workflow.</p>
          </div>
        `;

      default:
        return '';
    }
  }

  bindTypeSpecificEvents(node) {
    if (node.type === NODE_TYPES.INPUT) {
      const typeSel = this.container.querySelector('#inp-input-type');
      const valInput = this.container.querySelector('#inp-input-value');

      typeSel.addEventListener('change', (e) => {
        const newType = e.target.value;
        valInput.type = newType === 'number' ? 'number' : 'text';
        let parsedVal = valInput.value;
        if (newType === 'number' && !isNaN(Number(parsedVal))) {
          parsedVal = Number(parsedVal);
        }
        this.onUpdateNode(node.id, { valueType: newType, value: parsedVal });
      });

      valInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (typeSel.value === 'number') {
          val = val === '' ? '' : Number(val);
        }
        this.onUpdateNode(node.id, { value: val });
      });
    } else if (node.type === NODE_TYPES.TRANSFORM) {
      const opSel = this.container.querySelector('#inp-transform-op');
      const operandInput = this.container.querySelector('#inp-transform-operand');
      const operandGroup = this.container.querySelector('#operand-group');

      opSel.addEventListener('change', (e) => {
        const op = e.target.value;
        operandGroup.style.display = op === 'uppercase' ? 'none' : 'block';
        this.onUpdateNode(node.id, { operation: op });
      });

      operandInput.addEventListener('input', (e) => {
        const operand = e.target.value === '' ? 0 : Number(e.target.value);
        this.onUpdateNode(node.id, { operand });
      });
    } else if (node.type === NODE_TYPES.CONDITION) {
      const opSel = this.container.querySelector('#inp-condition-op');
      const threshInput = this.container.querySelector('#inp-condition-threshold');

      opSel.addEventListener('change', (e) => {
        this.onUpdateNode(node.id, { operator: e.target.value });
      });

      threshInput.addEventListener('input', (e) => {
        const threshold = e.target.value === '' ? 0 : Number(e.target.value);
        this.onUpdateNode(node.id, { threshold });
      });
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
