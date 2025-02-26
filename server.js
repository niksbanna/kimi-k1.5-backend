// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

// Configure CORS with more options
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL
});

app.options('*', cors(corsOptions));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: process.env.AI_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'Provide direct responses without explaining your thinking process. Be concise and clear.'
        },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens=8192,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
