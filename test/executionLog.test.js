import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionLog } from '../public/js/ui/executionLog.js';

// A fake "container" so we can test without a browser.
// ExecutionLog only writes to container.innerHTML, so this is enough.
function makePanel() {
  const container = { innerHTML: '' };
  const log = new ExecutionLog(container);
  return { container, log };
}

test('Output panel - empty state shows Ready message', () => {
  const { container } = makePanel();
  assert.match(container.innerHTML, /Ready/);
  assert.match(container.innerHTML, /Run Workflow/);
});

test('Output panel - loading state shows Running', () => {
  const { container, log } = makePanel();
  log.showRunning();
  assert.match(container.innerHTML, /Running/);
  assert.match(container.innerHTML, /Executing Workflow/);
});

test('Output panel - success shows the final output value', () => {
  const { container, log } = makePanel();
  log.displayResult({
    success: true,
    durationMs: 3,
    logs: [{ step: 1, nodeId: 'n1', nodeTitle: 'Input', nodeType: 'input', details: 'Value 10', output: 10, type: 'success' }],
    finalOutputs: { node_output: { title: 'Output', value: 20 } }
  });
  assert.match(container.innerHTML, /Success/);
  assert.match(container.innerHTML, /Workflow Final Result/);
  assert.match(container.innerHTML, />20</);
  assert.match(container.innerHTML, /1 step\(s\)/);
});

test('Output panel - success without an Output node shows a clear message', () => {
  const { container, log } = makePanel();
  log.displayResult({ success: true, logs: [], finalOutputs: {}, durationMs: 1 });
  assert.match(container.innerHTML, /without reaching an active Output node/);
});

test('Output panel - validation errors are listed to the user', () => {
  const { container, log } = makePanel();
  log.displayResult({
    success: false,
    validationFailed: true,
    errors: ['Workflow needs a Start node.', 'Output node is not connected.']
  });
  assert.match(container.innerHTML, /Validation Error/);
  assert.match(container.innerHTML, /Workflow needs a Start node\./);
  assert.match(container.innerHTML, /Output node is not connected\./);
});

test('Output panel - runtime error is shown, not swallowed', () => {
  const { container, log } = makePanel();
  log.displayResult({ success: false, error: 'Division by zero' });
  assert.match(container.innerHTML, /Execution Error/);
  assert.match(container.innerHTML, /Division by zero/);
});

test('Output panel - failure with no message still shows a default error', () => {
  const { container, log } = makePanel();
  log.displayResult({ success: false });
  assert.match(container.innerHTML, /Workflow execution failed\./);
});

test('Output panel - steps that ran before a failure are shown', () => {
  const { container, log } = makePanel();
  log.displayResult({
    success: false,
    error: 'Transform failed',
    logs: [{ step: 1, nodeTitle: 'Input', details: 'Value 10', type: 'success' }]
  });
  assert.match(container.innerHTML, /Steps Executed Before Failure/);
  assert.match(container.innerHTML, /Input/);
});

test('Output panel - HTML in messages is escaped (safe display)', () => {
  const { container, log } = makePanel();
  log.displayResult({ success: false, error: '<script>alert(1)</script>' });
  assert.ok(!container.innerHTML.includes('<script>'));
  assert.match(container.innerHTML, /&lt;script&gt;/);
});

test('Output panel - empty result goes back to Ready', () => {
  const { container, log } = makePanel();
  log.displayResult(null);
  assert.match(container.innerHTML, /Ready/);
});
