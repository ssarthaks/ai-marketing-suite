# AiAgent: Low-Level Architecture & Function Interactions

This document dives deep into the specific files, hooks, and function pipelines that power the AiAgent Marketing Assistant. It bridges the high-level concepts with actual codebase implementation details.

---

## 1. State Management & Persistence

The application is completely serverless from a database perspective. State is heavily reliant on the client-side browser storage, synchronized via custom events.
The application maintains chat threads, sessions, and marketing skills. State is synchronized across views and workflows.

### `src/lib/threads.ts`

- **Storage Pipeline:** Chat messages and threads are stored in the relational database with local caching for instant UI responsiveness.
- **Cross-Tab Sync:** Whenever state is updated, custom events notify React hooks, immediately updating the UI across all open browser tabs without polling.

This is the core state manager for the chat application.

- **Functions:** `readThreads`, `writeThreads`, `readMessages`, `writeMessages`
- **Hooks:**
  - `useThreads()`: Retrieves all chat sessions.
  - `useThreadMessages(threadId)`: Retrieves the message array for a specific thread.
- **Cross-Tab Sync:** Whenever a message is written to `localStorage`, `writeMessages` dispatches a `new CustomEvent("aiagent:messages-changed")`. The React hooks listen for this event, immediately updating the UI across all open browser tabs without polling.

---

## 2. The Heuristic Context Pipeline (Prompt Generation)

Before a message is sent to an LLM, the backend dynamically constructs a system prompt. This happens entirely within `src/lib/marketing-prompt.ts`.

### `getMarketingSystemPrompt(messages)`

This function is called right before the API request is formatted. It calls two critical sub-functions:

#### A. `getProductContext(messages)`

1. **Reverse Iteration:** It takes the chat history and iterates _backwards_ (`[...messages].reverse()`), looking at only the user's messages.
2. **Keyword Matching:** It matches the message content against a `PRODUCT_KEYWORDS` dictionary (e.g., `"acme"` maps to `demo-saas`).
3. **File System Injection:** As soon as a match is found, it uses `fs.readFileSync` to read the exact `.agents/<product>/product.md` file and injects it into the prompt. It then `break`s the loop so old topics from 20 turns ago don't accidentally trigger old products.

#### B. `getRelevantSkills(messages)`

1. Similar to the product context, it iterates backwards through the user's messages.
2. It scans for trigger phrases mapped to the 12 directories inside `aiagent/skills/`.
3. If the user mentions "competitor", it reads `aiagent/skills/competitors-research/SKILL.md` and injects those precise operating instructions into the system prompt.

---

## 3. LLM API Routing

Once the prompt is assembled, the chat engine must stream the response from the correct model.

### `src/components/chat/chat-view.tsx` -> `runModel`

When you submit a prompt, `runModel` executes.

1. **Model Selection:** It checks the active `modelId` state (e.g., `llama-3.1-8b-instant`).
2. **Handler Mapping:** It dynamically maps the ID to a specific API handler file:
   - `geminiChat` -> `src/lib/gemini.ts`
   - `deepseekChat` -> `src/lib/deepseek.ts`
   - `groqChat` -> `src/lib/groq.ts`
3. **Streaming Execution:** The chosen handler is called with the formatted messages. These handlers communicate with the respective provider APIs (using `process.env.*` keys) and yield a stream of tokens back to the client. The frontend runs a `setTimeout` loop (the `tick()` function) to simulate smooth token streaming into the UI state.

---

## 4. Generative UI Pipeline (Interactive MCQs)

This is the most complex front-end interaction, turning raw AI text into interactive React components.

### 1. `src/components/chat/message-list.tsx` (`AssistantBubble`)

As tokens stream in from `runModel`, the `AssistantBubble` component constantly evaluates the raw text string.

- **String Parsing:** It uses `.indexOf("<mcq>")` and `.indexOf("</mcq>")`.
- **Separation:** If it finds the tags, it violently splits the string. The text _before_ the `<mcq>` tag is rendered normally using `MessageResponse` (which uses the `Streamdown` library to render Markdown).
- **JSON Parsing:** The content _inside_ the tags is passed to `JSON.parse()`. If parsing succeeds, it renders `<InteractiveMcq>`. If it's still streaming and parsing fails, it gracefully hides the broken JSON from the user.

### 2. `src/components/chat/interactive-mcq.tsx`

This component receives the parsed JSON array.

- **State:** It maintains two states: `answers` (radio button selections) and `otherTexts` (custom text input).
- **Mutual Exclusivity Logic:** If a user types in the custom text box, the `onChange` handler deletes that question's key from the `answers` state, instantly deselecting the radio button.
- **Submission:** When the user clicks "Submit", it formats the data (e.g., "1. Option A\n2. Custom Text") and fires the `onSubmit` prop.

### 3. The Feedback Loop

The `onSubmit` prop bubbles back up:
`InteractiveMcq` -> `MessageList` (`onInteractiveSubmit`) -> `chat-view.tsx` (`handleSubmit`)
The answers are instantly appended to the `messages` array as a new User message, which recursively triggers `runModel` again to continue the AI conversation.
