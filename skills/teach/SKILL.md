---
name: teach
description: "Explain technical concepts, subsystems, protocols, or code plainly so a person actually understands it. Use for 'teach me this', 'help me understand X', 'explain this subsystem/code to me'."
---

# Teach

**Explain what a thing is, how it works, and why it was built that way in a clear, conversational account at the reader's pace. The goal is understanding, not lecturing.**

## Process

1. **Start with a plain definition:** 
   Name the concept and define it in concrete terms the way a senior engineer would say it out loud, with its common industry name. Connect it to the immediate context ("in networking, we use this to...").
2. **Explain the mechanism (how it works):**
   Describe what happens step-by-step as an action occurs (e.g. as a packet traverses a subnet, or as a socket connection is negotiated). Focus on cause and effect.
3. **Show, don't just tell:**
   Use short, progressive ASCII or Mermaid diagrams when illustrating flows or states. Build up complex systems one part at a time rather than dumping a massive chart at once.
4. **Keep it conversational:**
   Give the smallest complete answer first (a few sentences), then offer clear branches to go deeper. Avoid quizzes, patronizing framing, or walls of text.
5. **Run through `unslop`:**
   Write in plain spoken English. State concrete mechanisms rather than abstract metaphors. Cut fluff, hedging, and filler phrases.
