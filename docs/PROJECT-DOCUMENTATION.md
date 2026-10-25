# FlowCanvas — Project Documentation

## 1. Project Overview

**FlowCanvas** is a proposed visual workflow builder and execution system. It aims to allow users to create workflows by arranging connected nodes on a visual canvas and execute the resulting workflow.

The project will be developed as part of the Software Engineering course, following software engineering principles, collaborative development practices, and structured project management.

> Note: The detailed scope and technical design must be reviewed and agreed upon by the team before implementation.

## 2. Problem Statement

Building workflows often requires users to understand the sequence of operations and how data moves between them. Representing these operations visually can make workflows easier to understand, modify, and execute.

FlowCanvas aims to provide a visual interface for creating simple workflows and observing their execution results.

## 3. Project Objectives

- Provide a visual canvas for creating workflows.
- Allow users to add nodes and connect them.
- Support execution of a defined sequence of operations.
- Display execution results and basic errors.
- Apply proper software engineering and version control practices.
- Maintain clear documentation, testing, and project management records.

## 4. Target Users

The initial target users are people who want to create and understand simple workflows through a visual interface.

The exact user roles and use cases will be defined during requirements analysis.

## 5. Proposed Core Features

1. **Visual Workflow Canvas:** Display workflow nodes in a visual workspace.
2. **Node Management:** Add and configure supported nodes.
3. **Connections:** Connect nodes to define the workflow sequence.
4. **Workflow Execution:** Execute supported operations in the defined order.
5. **Execution Results:** Display outputs and basic execution errors.

## 6. Proposed Demonstration Scenario

A simple workflow:

Start → Input → Transform → Output

The user creates the workflow, connects its nodes, configures the required values, executes it, and views the resulting output.

This scenario is a proposed demonstration and must be validated against the final agreed requirements.

## 7. Project Scope

### Initial Implementation

The first implementation will prioritize a small, functioning workflow that demonstrates the project's main idea.

### Potential Future Enhancements

Features such as complex branching, parallel execution, external integrations, and advanced scheduling may be considered later if time and course requirements allow.

These enhancements are not confirmed requirements.

## 8. Development and Collaboration

The team will use GitHub to manage source code, tasks, and collaboration.

The planned practices include:

- GitHub Issues for tracking tasks and bugs.
- GitHub Projects for the project backlog and Scrum board.
- Dedicated branches for individual features and bug fixes.
- Clear and meaningful commit messages.
- Pull requests and clean merging practices.
- Meaningful contributions from every team member.
- Meeting notes and progress summaries.

## 9. Testing and Quality Assurance

The team will test the core functionalities and document the results.

The final testing plan will include appropriate test cases for valid workflows, invalid workflows, node connections, execution results, and error handling, depending on the implemented features.

A comprehensive test suite is a Phase 2 deliverable.

## 10. System Design and Documentation

The project documentation will include the relevant engineering artifacts required by the course, such as:

- Software Requirements Specification (SRS).
- Use Case Diagrams.
- Sequence Diagrams.
- Class Diagrams.
- Other relevant UML and architectural models.
- Test documentation.
- Project backlog and Scrum meeting notes.

Each artifact will be updated as the requirements and implementation evolve.

## 11. Deployment and DevOps

The team plans to configure an automated CI/CD pipeline using GitHub Actions for testing and deployment.

The final application must be deployed live as required by Phase 2.

The hosting platform and deployment architecture will be selected after the technology stack is confirmed.

## 12. Team Members

- **Adam Abdelazim:** Team Lead and Project Coordinator.
- **Mazen El-Sayed:** Team Member.
- **Mohamed El-Daghidi:** Team Member.

Specific responsibilities will be recorded in the project task register.

## 13. Project Phases

### Phase 1 — Implementation and Project Management Baseline

- Develop a functioning project demo.
- Use GitHub Issues and Projects.
- Demonstrate meaningful individual contributions.
- Follow a feature-branch workflow and clean merging practices.

### Phase 2 — Comprehensive Engineering and Documentation

- Develop a comprehensive test suite.
- Complete the required UML and architectural models.
- Produce detailed software requirements and documentation.
- Maintain the product backlog, Scrum board, and meeting notes.
- Maintain a clean pull request history.
- Configure GitHub Actions CI/CD.
- Deploy the application live.

## 14. Open Decisions

The following items must be agreed upon and documented before they are treated as final:

- Final functional and non-functional requirements.
- Technology stack and system architecture.
- Detailed Phase 1 scope and acceptance criteria.
- Task ownership and deadlines.
- Testing strategy.
- Deployment platform.

## 15. Document Status

**Status:** Initial Draft

This document provides the initial project overview. It must be reviewed and updated as the team confirms the requirements, design decisions, and implementation details.
