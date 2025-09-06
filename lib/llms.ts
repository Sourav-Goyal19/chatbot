import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const chatLlama = new ChatOpenAI({
  model: "meta-llama/llama-3.3-70b-instruct",
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

const chatGoogle = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.0-flash",
});

const chatMoonshotai = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "moonshotai/kimi-k2-instruct",
});

const chatGptOSS = new ChatOpenAI({
  model: "openai/gpt-oss-20b:free",
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

const chatDeepseek = new ChatOpenAI({
  model: "deepseek/deepseek-chat-v3-0324:free",
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

const LLMS = {
  llama: chatLlama,
  gptoss: chatGptOSS,
  google: chatGoogle,
  deepseek: chatDeepseek,
  moonshotai: chatMoonshotai,
};

export default LLMS;
