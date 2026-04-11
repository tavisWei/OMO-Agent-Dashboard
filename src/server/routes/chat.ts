import { Router, Request, Response } from 'express';

const router = Router();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatRequest {
  messages: ChatMessage[];
  agentId?: number;
  model?: string;
  temperature?: number;
}

const conversations = new Map<number, ChatMessage[]>();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, agentId = 1, model = 'gpt-4', temperature = 0.7 } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const history = conversations.get(agentId) || [];
    conversations.set(agentId, [...history, ...messages]);

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    const responseText = await streamResponse(lastUserMessage, model, temperature, (chunk) => {
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ type: 'done', content: responseText })}\n\n`);

    const updatedHistory = conversations.get(agentId) || [];
    updatedHistory.push({
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
    });
    conversations.set(agentId, updatedHistory);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:agentId', (req: Request, res: Response) => {
  const agentId = parseInt(req.params.agentId as string, 10);
  const history = conversations.get(agentId) || [];
  res.json({ messages: history });
});

router.delete('/:agentId', (req: Request, res: Response) => {
  const agentId = parseInt(req.params.agentId as string, 10);
  conversations.delete(agentId);
  res.json({ success: true });
});

async function streamResponse(
  userMessage: string,
  _model: string,
  _temperature: number,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = `I received your message: "${userMessage}"

Here's a code example:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

I can help you with various tasks including:
- Writing and debugging code
- Explaining complex concepts
- Analyzing projects
- And much more!`;

  const words = response.split('');

  for (const word of words) {
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
    onChunk(word);
  }

  return response;
}

export default router;