/**
 * FlowCanvas - Main Application Coordinator
 */

import { CanvasManager } from './canvas/canvasManager.js';
import { NodeLibrary } from './ui/nodeLibrary.js';
import { NodeInspector } from './ui/inspector.js';
import { ExecutionLog } from './ui/executionLog.js';
import { SAMPLES } from './samples.js';
import { executeWorkflow } from './engine/workflowEngine.js';

class FlowCanvasApp {
  constructor() {
    this.currentWorkflowName = 'Demo: Multiply & Condition';
    this.isExecuting = false;

    this.initElements();
    this.initModules();
    this.bindToolbarEvents();
    this.loadSample('CANONICAL_DEMO');
  }

  initElements() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.nodeLibraryContainer = document.getElementById('sidebar-node-library');
    this.inspectorContainer = document.getElementById('panel-inspector');
    this.executionLogContainer = document.getElementById('panel-execution-log');
    
    // Buttons & controls
    this.btnRun = document.getElementById('btn-run-workflow');
    this.btnReset = document.getElementById('btn-reset-demo');
    this.btnClear = document.getElementById('btn-clear-canvas');
    this.selectPreset = document.getElementById('select-sample-preset');
    this.btnExport = document.getElementById('btn-export-json');
    this.btnImport = document.getElementById('btn-import-json');
    this.fileInput = document.getElementById('file-input-json');
    this.workflowTitleEl = document.getElementById('workflow-title-display');

    // Right panel tabs
    this.tabInspectorBtn = document.getElementById('tab-btn-inspector');
    this.tabResultsBtn = document.getElementById('tab-btn-results');
  }

  initModules() {
    // 1. Canvas Manager
    this.canvas = new CanvasManager(this.canvasContainer, {
      onNodeSelect: (node) => {
        this.inspector.inspect(node);
        if (node) {
          this.switchTab('inspector');
        }
      },
      onWorkflowChange: (workflow) => {
        // Can be used for auto-save if needed
      }
    });

    // 2. Node Library
    this.library = new NodeLibrary(this.nodeLibraryContainer, (type) => {
      this.canvas.addNode(type);
    });

    // 3. Properties Inspector
    this.inspector = new NodeInspector(
      this.inspectorContainer,
      (nodeId, newConfig, newTitle) => {
        this.canvas.updateNodeConfig(nodeId, newConfig, newTitle);
      },
      (nodeId) => {
        this.canvas.deleteNode(nodeId);
        this.inspector.renderEmpty();
      }
    );

    // 4. Execution Log Panel
    this.executionLog = new ExecutionLog(this.executionLogContainer);

    // Support drag and drop from library onto canvas
    this.canvasContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.canvasContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('application/flowcanvas-node-type');
      if (nodeType) {
        const rect = this.canvasContainer.getBoundingClientRect();
        const pos = {
          x: Math.round(e.clientX - rect.left - 80),
          y: Math.round(e.clientY - rect.top - 40)
        };
        this.canvas.addNode(nodeType, pos);
      }
    });
  }

  bindToolbarEvents() {
    // Run Workflow
    this.btnRun.addEventListener('click', () => this.runWorkflow());

    // Reset Demo
    this.btnReset.addEventListener('click', () => {
      this.loadSample('CANONICAL_DEMO');
      this.selectPreset.value = 'CANONICAL_DEMO';
    });

    // Clear Canvas
    this.btnClear.addEventListener('click', () => {
      if (confirm('Clear all nodes and connections from the canvas?')) {
        this.canvas.loadWorkflow({ nodes: [], edges: [] });
        this.inspector.renderEmpty();
        this.executionLog.renderReady();
      }
    });

    // Sample preset dropdown
    this.selectPreset.addEventListener('change', (e) => {
      this.loadSample(e.target.value);
    });

    // Export JSON
    this.btnExport.addEventListener('click', () => {
      const data = this.canvas.getWorkflowData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowcanvas-workflow-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import JSON
    this.btnImport.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.nodes || !parsed.edges) {
            alert('Invalid FlowCanvas JSON format.');
            return;
          }
          this.canvas.loadWorkflow(parsed);
          this.inspector.renderEmpty();
          this.executionLog.renderReady();
          this.workflowTitleEl.textContent = 'Imported Workflow';
        } catch (err) {
          alert('Failed to parse JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset file input
    });

    // Tabs
    this.tabInspectorBtn.addEventListener('click', () => this.switchTab('inspector'));
    this.tabResultsBtn.addEventListener('click', () => this.switchTab('results'));
  }

  switchTab(tabName) {
    if (tabName === 'inspector') {
      this.tabInspectorBtn.classList.add('active');
      this.tabResultsBtn.classList.remove('active');
      this.inspectorContainer.style.display = 'block';
      this.executionLogContainer.style.display = 'none';
    } else {
      this.tabInspectorBtn.classList.remove('active');
      this.tabResultsBtn.classList.add('active');
      this.inspectorContainer.style.display = 'none';
      this.executionLogContainer.style.display = 'block';
    }
  }

  loadSample(sampleKey) {
    const sample = SAMPLES[sampleKey] || SAMPLES.CANONICAL_DEMO;
    this.canvas.loadWorkflow(sample.workflow);
    this.canvas.resetAllStates();
    this.inspector.renderEmpty();
    this.executionLog.renderReady();
    this.workflowTitleEl.textContent = sample.name;
  }

  async runWorkflow() {
    if (this.isExecuting) return;

    this.isExecuting = true;
    this.btnRun.disabled = true;
    this.btnRun.innerHTML = `<span class="spinner-small"></span> Running...`;

    // Switch to Results panel
    this.switchTab('results');
    this.executionLog.showRunning();
    this.canvas.resetAllStates();

    const workflowData = this.canvas.getWorkflowData();

    try {
      // Execute through our engine
      const result = await executeWorkflow(workflowData);

      if (!result.success) {
        // Highlight error node if identified
        if (result.nodeResults) {
          for (const [nodeId, nodeRes] of Object.entries(result.nodeResults)) {
            if (nodeRes.status === 'error') {
              this.canvas.setNodeState(nodeId, 'error');
            }
          }
        }
        this.executionLog.displayResult(result);
        return;
      }

      // Animate execution step-by-step so teammates can see flow visually
      for (const step of result.logs) {
        if (step.nodeId) {
          this.canvas.setNodeState(step.nodeId, 'running');
          await this.sleep(180); // Visual step pace
          this.canvas.setNodeState(step.nodeId, 'success', step.output, step.details);
        }
      }

      // Mark unexecuted nodes as skipped
      if (result.nodeResults) {
        for (const [nodeId, nodeRes] of Object.entries(result.nodeResults)) {
          if (nodeRes.status === 'skipped') {
            this.canvas.setNodeState(nodeId, 'skipped');
          }
        }
      }

      this.executionLog.displayResult(result);
    } catch (err) {
      this.executionLog.displayResult({
        success: false,
        error: `Unexpected error during execution: ${err.message}`
      });
    } finally {
      this.isExecuting = false;
      this.btnRun.disabled = false;
      this.btnRun.innerHTML = `▶ Run Workflow`;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.flowCanvasApp = new FlowCanvasApp();
});
