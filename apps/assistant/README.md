# Assistant demo

Claude in the studio: a chat beside a shared deck. It is the realtime demo with an assistant: Claude comes into the room as one more person, and answers by changing the deck with the tools of `@reboslides/mcp`, so everyone in the room sees it happen.

```bash
cp apps/assistant/.env.example apps/assistant/.env   # and put ANTHROPIC_API_KEY in it
npm run assistant                                      # from the root: http://localhost:5193
```

Without a key the chat says so, and the rest works as the realtime demo does.

`server/assistant.ts` runs Claude (`claude-opus-5-5`, adaptive thinking, effort from `ASSISTANT_EFFORT`) with the SDK's tool runner; each tool of the MCP server runs on the room's deck, and what it changes is sent through the collaboration server. The API key never leaves the backend.
