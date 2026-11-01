/**
 * FlowCanvas - Node Library (Left Sidebar)
 */

import { NODE_SCHEMAS, NODE_TYPES } from '../engine/nodes.js';

export class NodeLibrary {
  constructor(containerEl, onAddNode) {
    this.container = containerEl;
    this.onAddNode = onAddNode;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="sidebar-section-header">
        <h3 class="section-title">Node Library</h3>
        <p class="section-subtitle">Click or drag a node to add it to your workflow canvas.</p>
      </div>
      <div class="node-library-list" id="node-library-list"></div>
    `;

    const list = this.container.querySelector('#node-library-list');

    // Order of nodes in sidebar
    const types = [
      NODE_TYPES.START,
      NODE_TYPES.INPUT,
      NODE_TYPES.TRANSFORM,
      NODE_TYPES.CONDITION,
      NODE_TYPES.OUTPUT
    ];

    types.forEach(type => {
      const schema = NODE_SCHEMAS[type];
      const item = document.createElement('div');
      item.className = 'library-item';
      item.dataset.nodeType = type;
      item.draggable = true;

      item.innerHTML = `
        <div class="library-item-left">
          <div class="library-badge" style="background-color: ${schema.badgeColor}15; color: ${schema.badgeColor}; border: 1px solid ${schema.badgeColor}40;">
            ${this.getNodeIcon(type)}
          </div>
          <div class="library-item-info">
            <span class="library-item-name">${schema.name}</span>
            <span class="library-item-desc">${schema.description}</span>
          </div>
        </div>
        <button class="btn-add-node" title="Add to Canvas">+</button>
      `;

      // Click to add
      item.addEventListener('click', () => {
        if (this.onAddNode) {
          this.onAddNode(type);
        }
      });

      // Drag to canvas
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/flowcanvas-node-type', type);
        e.dataTransfer.effectAllowed = 'copy';
      });

      list.appendChild(item);
    });
  }

  getNodeIcon(type) {
    switch (type) {
      case NODE_TYPES.START:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      case NODE_TYPES.INPUT:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>`;
      case NODE_TYPES.TRANSFORM:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4"/><path d="m14 10 7-7M3 21l7-7"/></svg>`;
      case NODE_TYPES.CONDITION:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`;
      case NODE_TYPES.OUTPUT:
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`;
      default:
        return `●`;
    }
  }
}
