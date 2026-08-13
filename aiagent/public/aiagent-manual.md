# AiAgent User Manual v2.0.0

Welcome to AiAgent v2.0.0! This major release unifies the AI Agent and the Marketing Tool into a seamless, dual-website interactive engine, unlocking new potentials for context-aware marketing content generation.

## 1. Dual Website Interactive Engine
AiAgent 2.0.0 breaks the walls between the AI Agent and your Marketing Tool. 
- You can now deep-link directly into project-specific chats.
- You can trigger powerful AI generations from the **AI Studio dashboard** and instantly transition into an interactive chat flow. 
- Bouncing between the apps is stable, fast, and remembers exactly which workspace you belong to (even for personal workspaces).

## 2. Dynamic Project Routing
No more losing your place. AiAgent now supports deep linking to your project-filtered chat history.
- **Dedicated URLs**: Navigate to `/[workspaceId]/chats/project/[projectId]` to bookmark or share a view of your chats for a specific project.
- **State-Free Filtering**: Your project selections are stored in the URL, not lost on refresh.

## 3. Advanced Agentic AI Studio
When you click **Generate** in the AI Studio, the UI seamlessly transforms into an interactive Agent Chat:
- **Interactive MCQ Clarification**: If your prompt is too vague or lacks direction, the agent will present an inline multiple-choice questionnaire to clarify your intent before writing an entire piece of content.
- **Deep Context Awareness**: By referencing your project's `product.md`, AiAgent inherently understands your target audience, tone, and goals without you having to re-type them.
- **Skill Selection Override**: Hand-pick the tools the agent should use (e.g., Web Search, Web Scraper, Jina Reader). The agent is also smart enough to adapt and override these skills if it deems another tool necessary to accomplish your brief perfectly.

## 4. Markdown Previews & Enhanced Output
AiAgent's generation quality is more transparent than ever.
- **Show Raw Markdown**: Validate formatting, headers, and code snippets directly from the chat UI with the new "Show raw markdown" toggle.
- **New Content Types**: AiAgent 2.0.0 expands its repertoire to include:
  - Newsletters
  - Tweet Threads
  - YouTube Scripts
  - Press Releases

## 5. Security and Routing Resiliency
- Personal workspaces are safely routed via their unique `workspaceId` UUIDs, ensuring SSO and AI Agent handoffs are smooth and bug-free, preventing any "Name" collision errors.

---
**Thank you for using AiAgent!** 
Our goal is to make your content pipeline as dynamic, grounded, and intelligent as possible.
