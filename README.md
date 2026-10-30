<<<<<<< HEAD
# FlowCanvas

FlowCanvas is a proposed visual workflow builder and execution system that aims to help users create workflows by connecting nodes on a visual canvas and executing supported operations.

## Project Overview

The project is being developed as part of a Software Engineering course, with a focus on implementation, collaboration, software engineering practices, and project management.

## Team Members

- **Adam Abdelazim** — Team Lead and Project Coordinator
- **Mazen El-Sayed** — Team Member
- **Mohamed El-Daghidi** — Team Member
- **Maha** — Team Member
- **Hagar** — Team Member

## Documentation

- [Project Documentation](https://github.com/adam3yx-ux/FlowCanvas/blob/main/docs/PROJECT-DOCUMENTATION.md)
- [Requirements](https://github.com/adam3yx-ux/FlowCanvas/tree/main/docs/requirements)
- [UML Diagrams](https://github.com/adam3yx-ux/FlowCanvas/tree/main/docs/diagrams)
- [Design Decisions](https://github.com/adam3yx-ux/FlowCanvas/tree/main/docs/decisions)
- [Task Register](https://github.com/adam3yx-ux/FlowCanvas/blob/main/docs/management/TASK-REGISTER.md)

## Project Status

Initial setup and documentation. The detailed requirements, technical design, and implementation scope are still being finalized.

## Development Practices

The team plans to use GitHub Issues, GitHub Projects, feature branches, meaningful commits, and pull requests to manage development and collaboration.
=======
# FlowCanvas 🎨

> **A simple, visual workflow builder demo for university Software Engineering.**

FlowCanvas is a lightweight, responsive, light-mode visual workflow builder. It allows users to visually assemble nodes, connect them with dynamic bezier curves, configure parameters in an inspector panel, execute the workflow deterministically, and view step-by-step execution traces and final results.

---

## 🚀 Quick Start (Windows)

FlowCanvas has **zero external dependencies** (`node_modules` not required!). It runs directly with native Node.js (v18+).

### 1. Open Terminal / PowerShell
Navigate to the project directory:
```powershell
cd C:\Users\asus\.gemini\antigravity\scratch\flowcanvas
```

### 2. Start the Local Server
```powershell
node server.js
```
*Or using npm:*
```powershell
npm start
```

### 3. Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```
*(Or `http://127.0.0.1:3000`)*

---

## 🧪 Automated Testing

FlowCanvas includes automated unit and integration tests using Node's built-in test runner (`node:test`):

```powershell
npm test
```
*Or directly:*
```powershell
node --test test/engine.test.js test/server.test.js
```

---

## 🎯 Required Demo Workflow

FlowCanvas loads with the required university demo pre-configured:

$$\text{Start} \longrightarrow \text{Input (10)} \longrightarrow \text{Transform (} \times 2 \text{)} \longrightarrow \text{Condition (} > 15 \text{)} \longrightarrow \text{Output (True Branch: 20)}$$

### Step-by-Step Demo Behavior:
1. When you click **▶ Run Workflow**:
   - **Step 1 (Start)**: Triggered.
   - **Step 2 (Input)**: Emits `10`.
   - **Step 3 (Transform)**: Multiplies $10 \times 2 = 20$.
   - **Step 4 (Condition)**: Checks $20 > 15$ $\rightarrow$ **True**. Follows the green **True** branch port.
   - **Step 5 (Output)**: True branch output receives and displays **`20`**.
   - The False branch output is marked **Skipped (Inactive Branch)**.
2. **Interactive Testing (Change Input)**:
   - Click the **Input** node card on the canvas.
   - In the right-hand **Node Properties** panel, change the value from `10` to `5`.
   - Click **▶ Run Workflow**.
   - **Result**: Transform outputs $5 \times 2 = 10$. Condition evaluates $10 > 15$ to **False**. The **False** branch executes and receives `10`, while the True branch is skipped!

---

## 🧩 The 5 Core Node Types

| Node Type | Category | Inputs | Outputs | Description & Options |
| :--- | :--- | :--- | :--- | :--- |
| **Start** | Trigger | 0 | 1 (`out`) | Marks the execution entry point. |
| **Input** | Data | 1 (optional) | 1 (`out`) | Configurable value (`number` or `text`). Emits initial data. |
| **Transform** | Process | 1 (`in`) | 1 (`out`) | Operations: `Multiply (×)`, `Add (+)`, `Uppercase Text`. |
| **Condition** | Logic | 1 (`in`) | 2 (`true`, `false`) | Comparisons: `>`, `<`, `==`. Routes execution to True or False ports. |
| **Output** | Sink | 1 (`in`) | 0 | Displays and records final result. |

---

## 🎨 UI & Design Principles

- **Light Mode Only**: Clean `#f8fafc` background with soft indigo/violet accents (`#6366f1`).
- **Dotted Grid Canvas**: Subtle `24px` grid pattern (`radial-gradient`).
- **Dynamic Bezier Connections**: SVG cubic bezier curves smoothly recomputed when dragging nodes.
- **Color-Coded Handles**:
  - Green handle for Condition **True** branch.
  - Amber handle for Condition **False** branch.
  - Blue/Gray handles for standard Flow ports.
- **Execution Feedback**:
  - Active nodes pulse with an indigo ring during execution.
  - Successfully executed nodes receive a green check badge displaying their computed value.
  - Inactive/skipped nodes fade slightly to convey branching decisions.
  - Execution panel lists step number, timestamp, node title, operation details, and outputs.

---

## 📂 Project Architecture

```
flowcanvas/
├── package.json              # Project metadata & npm test/start scripts
├── server.js                 # Zero-dependency HTTP static server (node:http)
├── README.md                 # Project guide & teammate documentation
├── test/
│   ├── engine.test.js        # Unit tests for workflow engine & validator
│   └── server.test.js        # Integration tests for HTTP asset serving
└── public/
    ├── index.html            # Semantic layout (Toolbar, Sidebar, Canvas, Inspector)
    ├── css/
    │   └── style.css         # Light-mode design system & animations
    └── js/
        ├── app.js            # App coordinator & execution animator
        ├── samples.js        # Preloaded sample workflows & presets
        ├── engine/
        │   ├── nodes.js      # Schemas & execution handlers for 5 node types
        │   └── workflowEngine.js # DAG validator, branch router, execution trace
        ├── canvas/
        │   └── canvasManager.js  # DOM cards, dragging, SVG connections
        └── ui/
            ├── nodeLibrary.js    # Sidebar palette (+ button / drag-drop)
            ├── inspector.js      # Node properties configuration form
            └── executionLog.js   # Execution results banner & trace table
```

---

## 👥 Proposed Task Division for 5 Teammates

This prototype is modularized to allow the 5 teammates to divide work without conflicts:

| Teammate | Suggested Subsystem | Primary Files |
| :--- | :--- | :--- |
| **Teammate 1** | **Execution Engine & Graph Validation** | `public/js/engine/workflowEngine.js`, `test/engine.test.js` |
| **Teammate 2** | **Canvas Rendering & SVG Connections** | `public/js/canvas/canvasManager.js`, `public/css/style.css` |
| **Teammate 3** | **Node Types & Transformation Logic** | `public/js/engine/nodes.js` |
| **Teammate 4** | **Inspector & Property Forms** | `public/js/ui/inspector.js`, `public/js/ui/nodeLibrary.js` |
| **Teammate 5** | **Execution Log, Trace UI & Presets** | `public/js/ui/executionLog.js`, `public/js/samples.js` |

---

## 📋 Manual Testing Checklist

- [x] **Page Load**: Open `http://localhost:3000`. The 5-node canonical demo is rendered on the dotted canvas.
- [x] **Run Default Demo**: Click **▶ Run Workflow**. Verify:
  - Input: `10`
  - Transform: `20`
  - Condition: `20 > 15` is `True`
  - Output (True): `20`
  - Output (False): Skipped
- [x] **Change Input Value**:
  - Click the **Input** node.
  - In properties, change `10` to `5`.
  - Click **▶ Run Workflow**.
  - Verify Condition is `False` and Output (False) receives `10`.
- [x] **Add New Node**: Click `+` or drag **Transform** from the left sidebar onto the canvas.
- [x] **Connect Ports**: Drag from any output port handle to an input port handle.
- [x] **Delete Node / Edge**: Select a node and press `Delete` or click `Delete` in the inspector.
- [x] **Presets**: Switch between presets using the toolbar dropdown (e.g., *Text Uppercase*).
- [x] **Export / Import**: Click **Export** to download the JSON workflow; click **Import** to reload it.
>>>>>>> 128e177 (feat: initial FlowCanvas working demo with 5 core node types, visual canvas, execution engine, and test suites)
