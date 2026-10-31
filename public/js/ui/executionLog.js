/**
 * FlowCanvas - Execution Results & Trace Panel
 */

export class ExecutionLog {
  constructor(containerEl) {
    this.container = containerEl;
    this.renderReady();
  }

  renderReady() {
    this.container.innerHTML = `
      <div class="log-card">
        <div class="log-header">
          <div class="log-status-wrap">
            <span class="status-badge badge-idle">● Ready</span>
            <span class="log-title">Execution Output</span>
          </div>
          <span class="log-meta">Click "Run Workflow" to execute</span>
        </div>
        <div class="log-body">
          <div class="log-placeholder">
            <p>Click the <strong>▶ Run Workflow</strong> button above to validate and execute the canvas graph.</p>
          </div>
        </div>
      </div>
    `;
  }

  showRunning() {
    this.container.innerHTML = `
      <div class="log-card running">
        <div class="log-header">
          <div class="log-status-wrap">
            <span class="status-badge badge-running">
              <span class="spinner-small"></span> Running
            </span>
            <span class="log-title">Executing Workflow...</span>
          </div>
        </div>
        <div class="log-body">
          <div class="log-loading-bar"></div>
        </div>
      </div>
    `;
  }

  displayResult(result) {
    if (!result) {
      this.renderReady();
      return;
    }

    if (!result.success) {
      this.renderErrors(result);
      return;
    }

    const { logs = [], finalOutputs = {}, durationMs = 0 } = result;

    // Check if any final output was produced
    const outputEntries = Object.entries(finalOutputs);

    let outputBannerHtml = '';
    if (outputEntries.length > 0) {
      outputBannerHtml = `
        <div class="final-output-banner">
          <div class="output-banner-title">Workflow Final Result:</div>
          <div class="output-banner-values">
            ${outputEntries.map(([nodeId, item]) => `
              <div class="output-item">
                <span class="output-label">${this.escapeHtml(item.title)}:</span>
                <span class="output-value">${this.escapeHtml(JSON.stringify(item.value))}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      outputBannerHtml = `
        <div class="final-output-banner output-empty">
          <div class="output-banner-title">Workflow completed without reaching an active Output node.</div>
        </div>
      `;
    }

    // Step-by-step logs table
    const stepsHtml = logs.map(step => `
      <div class="trace-step-row ${step.type === 'error' ? 'step-error' : 'step-success'}">
        <div class="step-num-col">
          <span class="step-badge">#${step.step}</span>
        </div>
        <div class="step-details-col">
          <div class="step-header-line">
            <strong class="step-node-name">${this.escapeHtml(step.nodeTitle || step.nodeId)}</strong>
            <span class="step-node-type badge-subtle">${step.nodeType}</span>
            <span class="step-time">${step.timestamp || ''}</span>
          </div>
          <div class="step-message">${this.escapeHtml(step.details || '')}</div>
        </div>
        <div class="step-val-col">
          ${step.output !== undefined && step.output !== null ? `<span class="step-value-pill">${this.escapeHtml(JSON.stringify(step.output))}</span>` : ''}
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="log-card success">
        <div class="log-header">
          <div class="log-status-wrap">
            <span class="status-badge badge-success">✓ Success</span>
            <span class="log-title">Execution Completed</span>
          </div>
          <div class="log-meta">
            <span>${logs.length} step(s)</span> • <span>${durationMs}ms</span>
          </div>
        </div>
        <div class="log-body">
          ${outputBannerHtml}
          <div class="trace-section-title">Execution Trace</div>
          <div class="trace-steps-list">
            ${stepsHtml}
          </div>
        </div>
      </div>
    `;
  }

  renderErrors(result) {
    const isValidation = result.validationFailed;
    const errors = result.errors || [result.error || 'Workflow execution failed.'];

    this.container.innerHTML = `
      <div class="log-card error">
        <div class="log-header">
          <div class="log-status-wrap">
            <span class="status-badge badge-error">✕ ${isValidation ? 'Validation Error' : 'Execution Error'}</span>
            <span class="log-title">${isValidation ? 'Workflow Configuration Issues' : 'Runtime Failure'}</span>
          </div>
        </div>
        <div class="log-body">
          <div class="error-banner">
            <div class="error-banner-header">Please resolve the following before running:</div>
            <ul class="error-list">
              ${errors.map(err => `<li>${this.escapeHtml(err)}</li>`).join('')}
            </ul>
          </div>
          ${result.logs && result.logs.length > 0 ? `
            <div class="trace-section-title">Steps Executed Before Failure</div>
            <div class="trace-steps-list">
              ${result.logs.map(s => `
                <div class="trace-step-row ${s.type === 'error' ? 'step-error' : 'step-success'}">
                  <div class="step-num-col"><span class="step-badge">#${s.step}</span></div>
                  <div class="step-details-col">
                    <strong class="step-node-name">${this.escapeHtml(s.nodeTitle || s.nodeId || 'System')}</strong>
                    <div class="step-message">${this.escapeHtml(s.details || s.message || '')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
