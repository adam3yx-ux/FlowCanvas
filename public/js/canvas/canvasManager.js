/**
 * FlowCanvas - Visual Canvas Manager
 * 
 * Manages:
 * - Rendering DOM node cards
 * - SVG dynamic bezier curve edges with port snap points
 * - Interactive dragging of nodes with smooth bezier recalculation
 * - Interactive port-to-port wiring (click or drag)
 * - Node selection and state highlighting (idle, running, success, skipped, error)
 */

import { NODE_SCHEMAS, NODE_TYPES } from '../engine/nodes.js';

export class CanvasManager {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.options = options; // callbacks: onNodeSelect, onWorkflowChange, etc.
    
    this.nodes = [];
    this.edges = [];
    this.selectedNodeId = null;
    this.selectedEdgeId = null;

    // Dragging state
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    // Connection creation state
    this.connectingSource = null; // { nodeId, portId, startX, startY } (world coords)
    this.mousePos = { x: 0, y: 0 }; // world coords

    // View transform applied to the whole canvas "world" (nodes + edges).
    // node.position and edge paths always live in world coordinates, so the
    // saved workflow data never depends on the current zoom.
    this.view = { scale: 1, tx: 0, ty: 0 };

    this.initDOM();
    this.bindGlobalEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="canvas-world" id="canvas-world">
      <svg class="canvas-svg-layer" id="canvas-svg-layer">
        <defs>
          <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
          </marker>
          <marker id="arrow-true" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
          </marker>
          <marker id="arrow-false" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>
        </defs>
        <g id="edges-group"></g>
        <path id="draft-edge" class="draft-edge" d="" style="display:none;"></path>
      </svg>
      <div class="canvas-nodes-layer" id="canvas-nodes-layer"></div>
      </div>
    `;

    this.worldEl = this.container.querySelector('#canvas-world');
    this.svgLayer = this.container.querySelector('#canvas-svg-layer');
    this.edgesGroup = this.container.querySelector('#edges-group');
    this.draftEdge = this.container.querySelector('#draft-edge');
    this.nodesLayer = this.container.querySelector('#canvas-nodes-layer');
  }

  bindGlobalEvents() {
    // Pointer move/up for node drag & edge drawing. Listen on window, not the
    // container: if the pointer leaves the canvas mid-drag and the button is
    // released outside it, a container-level mouseup is never delivered and the
    // node (or draft connection) stays glued to the cursor.
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    // Keep the whole workflow in view when the window is resized.
    let resizeFrame = null;
    window.addEventListener('resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        this.fitView();
        this.renderEdges();
      });
    });

    // Deselect when clicking blank canvas
    this.container.addEventListener('mousedown', (e) => {
      if (e.target === this.container || e.target === this.svgLayer || e.target.id === 'canvas-nodes-layer') {
        this.selectNode(null);
        this.selectEdge(null);
        if (this.connectingSource) {
          this.cancelConnecting();
        }
      }
    });

    // Keyboard delete for selected node or edge
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not typing in an input or textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        if (this.selectedNodeId) {
          this.deleteNode(this.selectedNodeId);
        } else if (this.selectedEdgeId) {
          this.deleteEdge(this.selectedEdgeId);
        }
      }
    });
  }

  loadWorkflow(workflow) {
    this.nodes = JSON.parse(JSON.stringify(workflow.nodes || []));
    this.edges = JSON.parse(JSON.stringify(workflow.edges || []));
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.render();
    // Nodes are in the DOM now, so their real sizes are measurable. Edges are
    // drawn in the next animation frame and will pick up this view.
    this.fitView();
  }

  getWorkflowData() {
    return {
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      edges: JSON.parse(JSON.stringify(this.edges))
    };
  }

  // --- View (fit-to-screen) ---

  // Viewport (client) pixels -> world coordinates, the space node.position and
  // the SVG edge paths are expressed in.
  clientToWorld(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.view.tx) / this.view.scale,
      y: (clientY - rect.top - this.view.ty) / this.view.scale
    };
  }

  // The part of the world currently visible inside the container.
  getVisibleWorldRect() {
    const { scale, tx, ty } = this.view;
    return {
      x0: -tx / scale,
      y0: -ty / scale,
      x1: (this.container.clientWidth - tx) / scale,
      y1: (this.container.clientHeight - ty) / scale
    };
  }

  applyView() {
    const { scale, tx, ty } = this.view;
    this.worldEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  getNodeSize(nodeId) {
    const el = document.getElementById(`node-el-${nodeId}`);
    return { w: el?.offsetWidth || 185, h: el?.offsetHeight || 110 };
  }

  // Scale (down only) and centre the workflow so every node is visible. A
  // workflow that already fits is left exactly as authored (scale 1, no shift).
  fitView() {
    const PADDING = 40;
    const MIN_SCALE = 0.45;
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;

    let view = { scale: 1, tx: 0, ty: 0 };

    if (this.nodes.length && cw > 0 && ch > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      this.nodes.forEach(node => {
        const x = node.position?.x ?? 100;
        const y = node.position?.y ?? 100;
        const { w, h } = this.getNodeSize(node.id);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const fitScale = Math.min((cw - 2 * PADDING) / contentW, (ch - 2 * PADDING) / contentH);
      const scale = Math.max(MIN_SCALE, Math.min(1, fitScale));

      if (scale < 1) {
        view = {
          scale,
          tx: (cw - contentW * scale) / 2 - minX * scale,
          ty: (ch - contentH * scale) / 2 - minY * scale
        };
      }
    }

    this.view = view;
    this.applyView();
  }

  render() {
    this.renderNodes();
    // Use requestAnimationFrame to ensure DOM bounding boxes are ready for edge port alignment
    requestAnimationFrame(() => {
      this.renderEdges();
    });
  }

  renderNodes() {
    this.nodesLayer.innerHTML = '';
    this.nodes.forEach(node => {
      const el = this.createNodeElement(node);
      this.nodesLayer.appendChild(el);
    });
  }

  createNodeElement(node) {
    const schema = NODE_SCHEMAS[node.type] || {
      name: node.type,
      category: 'General',
      badgeColor: '#64748b',
      inputs: [{ id: 'in', label: 'In' }],
      outputs: [{ id: 'out', label: 'Out' }]
    };

    const card = document.createElement('div');
    card.className = `node-card ${node.id === this.selectedNodeId ? 'selected' : ''}`;
    card.id = `node-el-${node.id}`;
    card.style.left = `${node.position?.x || 100}px`;
    card.style.top = `${node.position?.y || 100}px`;
    card.dataset.nodeId = node.id;

    // Node header with badge & type
    const header = document.createElement('div');
    header.className = 'node-header';
    header.innerHTML = `
      <div class="node-title-wrap">
        <span class="node-type-badge" style="background-color: ${schema.badgeColor}20; color: ${schema.badgeColor}; border: 1px solid ${schema.badgeColor}50;">
          ${schema.name}
        </span>
        <span class="node-title">${this.escapeHtml(node.title || schema.name)}</span>
      </div>
      <button class="node-btn-remove" title="Remove Node" data-action="remove">&times;</button>
    `;

    // Quick node body summary
    const body = document.createElement('div');
    body.className = 'node-body';
    body.innerHTML = this.getNodeBodySummary(node);

    // Ports container
    const portsWrap = document.createElement('div');
    portsWrap.className = 'node-ports-wrap';

    // Input ports (Left side)
    const inputsCol = document.createElement('div');
    inputsCol.className = 'ports-column ports-input-column';
    (schema.inputs || []).forEach(inp => {
      const portEl = document.createElement('div');
      portEl.className = 'node-port port-input';
      portEl.dataset.portId = inp.id;
      portEl.dataset.nodeId = node.id;
      portEl.dataset.portType = 'input';
      portEl.innerHTML = `
        <span class="port-handle" title="${inp.label}"></span>
        <span class="port-label">${inp.label}</span>
      `;
      inputsCol.appendChild(portEl);
    });

    // Output ports (Right side)
    const outputsCol = document.createElement('div');
    outputsCol.className = 'ports-column ports-output-column';
    (schema.outputs || []).forEach(outp => {
      const portEl = document.createElement('div');
      portEl.className = `node-port port-output ${outp.portClass || ''}`;
      portEl.dataset.portId = outp.id;
      portEl.dataset.nodeId = node.id;
      portEl.dataset.portType = 'output';
      portEl.innerHTML = `
        <span class="port-label">${outp.label}</span>
        <span class="port-handle" title="${outp.label}"></span>
      `;
      outputsCol.appendChild(portEl);
    });

    portsWrap.appendChild(inputsCol);
    portsWrap.appendChild(outputsCol);

    // Status pill (displayed when workflow executes)
    const statusPill = document.createElement('div');
    statusPill.className = 'node-status-pill';
    statusPill.id = `status-pill-${node.id}`;
    statusPill.style.display = 'none';

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(portsWrap);
    card.appendChild(statusPill);

    // Event Listeners for Node Card
    card.addEventListener('mousedown', (e) => {
      if (e.target.closest('[data-action="remove"]')) {
        e.stopPropagation();
        this.deleteNode(node.id);
        return;
      }

      // Check if clicking a port handle
      const portHandle = e.target.closest('.port-handle');
      if (portHandle) {
        e.stopPropagation();
        const portEl = portHandle.closest('.node-port');
        this.onPortHandleMouseDown(e, portEl);
        return;
      }

      // Otherwise, select node and start dragging
      e.stopPropagation();
      this.selectNode(node.id);
      this.startNodeDrag(e, node);
    });

    return card;
  }

  getNodeBodySummary(node) {
    const config = node.config || {};
    switch (node.type) {
      case NODE_TYPES.START:
        return `<div class="node-meta-text">Workflow entry point</div>`;
      case NODE_TYPES.INPUT:
        return `<div class="node-meta-value">Value: <strong>${this.escapeHtml(String(config.value ?? 10))}</strong> <span class="badge-subtle">${config.valueType || 'number'}</span></div>`;
      case NODE_TYPES.TRANSFORM:
        const op = config.operation || 'multiply';
        if (op === 'multiply') return `<div class="node-meta-value">Multiply: <strong>× ${config.operand ?? 2}</strong></div>`;
        if (op === 'add') return `<div class="node-meta-value">Add: <strong>+ ${config.operand ?? 0}</strong></div>`;
        return `<div class="node-meta-value">Uppercase text</div>`;
      case NODE_TYPES.CONDITION:
        return `<div class="node-meta-value">Condition: <strong>${config.operator || '>'} ${config.threshold ?? 15}</strong></div>`;
      case NODE_TYPES.OUTPUT:
        return `<div class="node-meta-value" id="output-val-${node.id}">Awaiting execution...</div>`;
      default:
        return '';
    }
  }

  // --- Dragging Nodes ---

  startNodeDrag(e, node) {
    this.draggedNode = node;
    // Offset between the pointer and the node's top-left, in world coordinates
    const pointer = this.clientToWorld(e.clientX, e.clientY);
    this.dragOffset = {
      x: pointer.x - (node.position?.x ?? 100),
      y: pointer.y - (node.position?.y ?? 100)
    };
  }

  onMouseMove(e) {
    // The button was released where we never saw it (e.g. outside the browser
    // window): finish the drag/connection instead of following the cursor.
    if ((this.draggedNode || this.connectingSource) && e.buttons === 0) {
      this.onMouseUp(e);
      return;
    }

    this.mousePos = this.clientToWorld(e.clientX, e.clientY);

    // If dragging node
    if (this.draggedNode) {
      let newX = this.mousePos.x - this.dragOffset.x;
      let newY = this.mousePos.y - this.dragOffset.y;

      // Keep the node inside the visible part of the canvas
      const vis = this.getVisibleWorldRect();
      const { w, h } = this.getNodeSize(this.draggedNode.id);
      newX = Math.max(vis.x0 + 10, Math.min(newX, Math.max(vis.x0 + 10, vis.x1 - w - 10)));
      newY = Math.max(vis.y0 + 10, Math.min(newY, Math.max(vis.y0 + 10, vis.y1 - h - 10)));

      this.draggedNode.position = { x: Math.round(newX), y: Math.round(newY) };
      
      const nodeEl = document.getElementById(`node-el-${this.draggedNode.id}`);
      if (nodeEl) {
        nodeEl.style.left = `${newX}px`;
        nodeEl.style.top = `${newY}px`;
      }
      this.renderEdges();
    }

    // If drawing connection edge
    if (this.connectingSource) {
      this.updateDraftEdge();
    }
  }

  onMouseUp(e) {
    if (this.draggedNode) {
      this.draggedNode = null;
      if (this.options.onWorkflowChange) {
        this.options.onWorkflowChange(this.getWorkflowData());
      }
    }

    if (this.connectingSource) {
      // Check if dropped on a valid input port
      const targetPort = e.target?.closest?.('.port-input');
      if (targetPort) {
        const targetNodeId = targetPort.dataset.nodeId;
        const targetPortId = targetPort.dataset.portId;
        this.completeConnection(targetNodeId, targetPortId);
      } else {
        this.cancelConnecting();
      }
    }
  }

  // --- Connections & Ports ---

  onPortHandleMouseDown(e, portEl) {
    const portType = portEl.dataset.portType;
    const nodeId = portEl.dataset.nodeId;
    const portId = portEl.dataset.portId;

    if (portType === 'output') {
      // Start drawing edge from output port
      const handle = portEl.querySelector('.port-handle');
      const handleRect = handle.getBoundingClientRect();
      const start = this.clientToWorld(
        handleRect.left + handleRect.width / 2,
        handleRect.top + handleRect.height / 2
      );

      this.connectingSource = {
        nodeId,
        portId,
        startX: start.x,
        startY: start.y
      };
      // Draw the draft line from the port to the pointer straight away
      this.mousePos = this.clientToWorld(e.clientX, e.clientY);

      this.draftEdge.style.display = 'block';
      this.updateDraftEdge();
    } else if (portType === 'input') {
      // If already connected, maybe user wants to remove or rewire
      const existingEdge = this.edges.find(edge => edge.targetNodeId === nodeId && edge.targetPortId === portId);
      if (existingEdge) {
        this.deleteEdge(existingEdge.id);
      }
    }
  }

  updateDraftEdge() {
    if (!this.connectingSource) return;
    const { startX, startY } = this.connectingSource;
    const endX = this.mousePos.x;
    const endY = this.mousePos.y;

    const pathData = this.calculateBezierPath(startX, startY, endX, endY);
    this.draftEdge.setAttribute('d', pathData);
  }

  completeConnection(targetNodeId, targetPortId) {
    if (!this.connectingSource) return;

    const { nodeId: sourceNodeId, portId: sourcePortId } = this.connectingSource;

    // Disallow self-connection
    if (sourceNodeId === targetNodeId) {
      this.cancelConnecting();
      return;
    }

    // Disallow duplicate edge
    const exists = this.edges.some(
      e => e.sourceNodeId === sourceNodeId &&
           e.sourcePortId === sourcePortId &&
           e.targetNodeId === targetNodeId &&
           e.targetPortId === targetPortId
    );

    if (!exists) {
      // Disallow multiple edges into the same input port (single input per port)
      this.edges = this.edges.filter(
        e => !(e.targetNodeId === targetNodeId && e.targetPortId === targetPortId)
      );

      const newEdge = {
        id: `edge_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        sourceNodeId,
        sourcePortId,
        targetNodeId,
        targetPortId
      };

      this.edges.push(newEdge);
      this.renderEdges();

      if (this.options.onWorkflowChange) {
        this.options.onWorkflowChange(this.getWorkflowData());
      }
    }

    this.cancelConnecting();
  }

  cancelConnecting() {
    this.connectingSource = null;
    this.draftEdge.style.display = 'none';
  }

  // --- Rendering Edges ---

  renderEdges() {
    this.edgesGroup.innerHTML = '';

    this.edges.forEach(edge => {
      const sourcePort = this.findPortElement(edge.sourceNodeId, edge.sourcePortId, 'output');
      const targetPort = this.findPortElement(edge.targetNodeId, edge.targetPortId, 'input');

      if (!sourcePort || !targetPort) return;

      const sHandle = sourcePort.querySelector('.port-handle');
      const tHandle = targetPort.querySelector('.port-handle');
      if (!sHandle || !tHandle) return;

      const sRect = sHandle.getBoundingClientRect();
      const tRect = tHandle.getBoundingClientRect();

      const { x: x1, y: y1 } = this.clientToWorld(sRect.left + sRect.width / 2, sRect.top + sRect.height / 2);
      const { x: x2, y: y2 } = this.clientToWorld(tRect.left + tRect.width / 2, tRect.top + tRect.height / 2);

      const pathData = this.calculateBezierPath(x1, y1, x2, y2);

      // SVG Path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      
      let edgeClass = 'workflow-edge';
      let markerId = 'arrow-default';

      if (edge.sourcePortId === 'true') {
        edgeClass += ' edge-branch-true';
        markerId = 'arrow-true';
      } else if (edge.sourcePortId === 'false') {
        edgeClass += ' edge-branch-false';
        markerId = 'arrow-false';
      }

      if (edge.id === this.selectedEdgeId) {
        edgeClass += ' selected';
        markerId = 'arrow-active';
      }

      path.setAttribute('class', edgeClass);
      path.setAttribute('id', `edge-el-${edge.id}`);
      path.setAttribute('marker-end', `url(#${markerId})`);

      // Edge click to select (Delete/Backspace then removes it).
      // selectEdge() already clears the node selection and notifies the
      // inspector; calling selectNode(null) afterwards would reset
      // selectedEdgeId and make edges impossible to select.
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectEdge(edge.id);
      });

      this.edgesGroup.appendChild(path);
    });
  }

  findPortElement(nodeId, portId, portType) {
    const nodeEl = document.getElementById(`node-el-${nodeId}`);
    if (!nodeEl) return null;
    return nodeEl.querySelector(`.node-port[data-port-id="${portId}"][data-port-type="${portType}"]`);
  }

  calculateBezierPath(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const curvature = Math.max(dx * 0.5, 40);
    const cx1 = x1 + curvature;
    const cy1 = y1;
    const cx2 = x2 - curvature;
    const cy2 = y2;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  // --- Node & Edge Selection ---

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    this.selectedEdgeId = null;

    document.querySelectorAll('.node-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.nodeId === nodeId);
    });

    this.renderEdges();

    if (this.options.onNodeSelect) {
      const node = this.nodes.find(n => n.id === nodeId);
      this.options.onNodeSelect(node || null);
    }
  }

  selectEdge(edgeId) {
    this.selectedEdgeId = edgeId;
    this.selectedNodeId = null;

    document.querySelectorAll('.node-card').forEach(el => el.classList.remove('selected'));
    this.renderEdges();

    if (this.options.onNodeSelect) {
      this.options.onNodeSelect(null);
    }
  }

  // --- Add & Delete Nodes / Edges ---

  // First free spot (left-to-right, top-to-bottom) inside the visible canvas
  // where a new node does not overlap an existing one. Returns null if full.
  findFreePosition(width = 185, height = 130) {
    const GAP = 24;
    const STEP = 40;
    const vis = this.getVisibleWorldRect();
    const taken = this.nodes.map(node => {
      const { w, h } = this.getNodeSize(node.id);
      return { x: node.position?.x ?? 100, y: node.position?.y ?? 100, w, h };
    });

    for (let y = vis.y0 + 20; y + height <= vis.y1 - 10; y += STEP) {
      for (let x = vis.x0 + 20; x + width <= vis.x1 - 10; x += STEP) {
        const clear = taken.every(r =>
          x + width + GAP <= r.x || r.x + r.w + GAP <= x ||
          y + height + GAP <= r.y || r.y + r.h + GAP <= y
        );
        if (clear) return { x: Math.round(x), y: Math.round(y) };
      }
    }
    return null;
  }

  /**
   * @param {string} type  One of NODE_TYPES.
   * @param {{x:number,y:number}|null} position  Optional drop point in
   *   container-relative pixels (what the library drop handler in app.js
   *   passes). It is converted to world coordinates here so it stays correct
   *   when the view is scaled. Omit it to auto-place in a free spot.
   */
  addNode(type, position = null) {
    const schema = NODE_SCHEMAS[type];
    if (!schema) return null;

    const id = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let pos;
    if (position) {
      const vis = this.getVisibleWorldRect();
      const x = (position.x - this.view.tx) / this.view.scale;
      const y = (position.y - this.view.ty) / this.view.scale;
      pos = {
        x: Math.round(Math.max(vis.x0 + 10, Math.min(x, vis.x1 - 195))),
        y: Math.round(Math.max(vis.y0 + 10, Math.min(y, vis.y1 - 120)))
      };
    } else {
      const vis = this.getVisibleWorldRect();
      const offset = (this.nodes.length * 30) % 200;
      pos = this.findFreePosition() || { x: Math.round(vis.x0 + 20 + offset), y: Math.round(vis.y0 + 20 + offset) };
    }

    const newNode = {
      id,
      type,
      title: schema.name,
      position: pos,
      config: JSON.parse(JSON.stringify(schema.defaultConfig || {}))
    };

    this.nodes.push(newNode);
    this.render();
    this.selectNode(id);

    if (this.options.onWorkflowChange) {
      this.options.onWorkflowChange(this.getWorkflowData());
    }

    return newNode;
  }

  deleteNode(nodeId) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.edges = this.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId);

    if (this.selectedNodeId === nodeId) {
      this.selectNode(null);
    }

    this.render();

    if (this.options.onWorkflowChange) {
      this.options.onWorkflowChange(this.getWorkflowData());
    }
  }

  deleteEdge(edgeId) {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    if (this.selectedEdgeId === edgeId) {
      this.selectedEdgeId = null;
    }
    this.renderEdges();

    if (this.options.onWorkflowChange) {
      this.options.onWorkflowChange(this.getWorkflowData());
    }
  }

  updateNodeConfig(nodeId, newConfig, newTitle = null) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (newConfig) {
      node.config = { ...node.config, ...newConfig };
    }
    if (newTitle !== null) {
      node.title = newTitle;
    }

    // Refresh node element body
    const nodeEl = document.getElementById(`node-el-${nodeId}`);
    if (nodeEl) {
      const titleEl = nodeEl.querySelector('.node-title');
      if (titleEl && newTitle !== null) titleEl.textContent = newTitle;

      const bodyEl = nodeEl.querySelector('.node-body');
      if (bodyEl) bodyEl.innerHTML = this.getNodeBodySummary(node);
    }

    if (this.options.onWorkflowChange) {
      this.options.onWorkflowChange(this.getWorkflowData());
    }
  }

  // --- Execution Highlighting & Feedback ---

  setNodeState(nodeId, state, output = null, details = null) {
    const nodeEl = document.getElementById(`node-el-${nodeId}`);
    if (!nodeEl) return;

    nodeEl.classList.remove('status-running', 'status-success', 'status-skipped', 'status-error');

    if (state !== 'idle') {
      nodeEl.classList.add(`status-${state}`);
    }

    const pill = nodeEl.querySelector(`#status-pill-${nodeId}`);
    if (pill) {
      if (state === 'running') {
        pill.style.display = 'inline-flex';
        pill.className = 'node-status-pill pill-running';
        pill.innerHTML = `<span class="spinner-small"></span> Running`;
      } else if (state === 'success') {
        pill.style.display = 'inline-flex';
        pill.className = 'node-status-pill pill-success';
        const displayVal = output !== null && output !== undefined ? (typeof output === 'object' ? JSON.stringify(output) : output) : '✓ Done';
        pill.innerHTML = `✓ ${this.escapeHtml(String(displayVal))}`;
      } else if (state === 'skipped') {
        pill.style.display = 'inline-flex';
        pill.className = 'node-status-pill pill-skipped';
        pill.innerHTML = `Skipped (Inactive Branch)`;
      } else if (state === 'error') {
        pill.style.display = 'inline-flex';
        pill.className = 'node-status-pill pill-error';
        pill.innerHTML = `✕ Error`;
      } else {
        pill.style.display = 'none';
      }
    }

    // Also update output node value preview if applicable
    const outValEl = nodeEl.querySelector(`#output-val-${nodeId}`);
    if (outValEl && output !== null && output !== undefined) {
      outValEl.innerHTML = `Output: <strong style="color:#4f46e5;">${this.escapeHtml(JSON.stringify(output))}</strong>`;
    }
  }

  resetAllStates() {
    this.nodes.forEach(node => {
      this.setNodeState(node.id, 'idle');
    });
    document.querySelectorAll('.workflow-edge').forEach(edgeEl => {
      edgeEl.classList.remove('edge-active');
    });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
