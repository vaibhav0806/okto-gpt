import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { config } from "dotenv";
import fetch from "node-fetch";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import telegramifyMarkdown from "telegramify-markdown";

config();

const links = [
    "https://docs.okto.tech/docs/overview",
    "https://docs.okto.tech/docs/quickstart/react-quickstart",
    "https://docs.okto.tech/docs/quickstart/react-native-quickstart",
    "https://docs.okto.tech/docs/quickstart/flutter-quickstart",
    "https://docs.okto.tech/docs/introduction-to-okto/okto-universe",
    "https://docs.okto.tech/docs/introduction-to-okto/overview-embedded-wallets",
    "https://docs.okto.tech/docs/introduction-to-okto/okto-sdk-architecture",
    "https://docs.okto.tech/docs/introduction-to-okto/chains-supported-tokens",
    "https://docs.okto.tech/docs/introduction-to-okto/okto-vendor-user",
    "https://docs.okto.tech/docs/introduction-to-okto/how-okto-manages-keys",
    "https://docs.okto.tech/docs/introduction-to-okto/onchain-execution",
    "https://docs.okto.tech/docs/introduction-to-okto/future-sdk-scope"
];

let vectorStore: MemoryVectorStore | null = null;

async function buildVectorDB() {
    let allSplits: any = [];

    for (const link of links) {
        const loader = new CheerioWebBaseLoader(link);
        const docs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const splits = await textSplitter.splitDocuments(docs);
        allSplits = allSplits.concat(splits);
    }

    const embeddings = new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HF_API_KEY,
        model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(allSplits, embeddings);
    console.log("Vector store is built and ready to use.");
    return vectorStore;
}

async function retrieveRelevantDocs(question: string, vectorStore: MemoryVectorStore) {
    const retriever = vectorStore.asRetriever();
    const retrievedDocs = await retriever.invoke(question);
    return retrievedDocs.map((doc) => doc.pageContent).join("\n\n");
}

function escapeMarkdown(text: string) {
    return text
        .replace(/_/g, "\\_")   // Escapes underscore
        .replace(/\*/g, "\\*")  // Escapes asterisk
        .replace(/\[/g, "\\[")  // Escapes square brackets
        .replace(/\]/g, "\\]")  // Escapes square brackets
        .replace(/`/g, "\\`")   // Escapes backtick
        .replace(/\(/g, "\\(")  // Escapes parenthesis
        .replace(/\)/g, "\\)")  // Escapes parenthesis
        .replace(/>/g, "\\>")   // Escapes angle brackets
        .replace(/</g, "\\<")   // Escapes angle brackets
        .replace(/-/g, "\\-");  // Escapes dash (hyphen)
}

const bot = new Bot(process.env.TELEGRAM_BOT_KEY!);

async function initializeBot() {
    try {
        console.log("Initializing bot and building vector store...");
        vectorStore = await buildVectorDB();
        console.log("Bot is ready.");
    } catch (error) {
        console.error("Failed to initialize bot:", error);
    }
}

bot.command("start", (ctx) => {
    const inlineKeyboard = new InlineKeyboard()
        .text("Available Commands", "show_commands");

    const welcomeMessage = `Welcome to the Okto GPT! You can click below to see available commands or ask anything related to Okto.`;
    ctx.reply(welcomeMessage, {
        reply_markup: inlineKeyboard,
    });
});

bot.callbackQuery("show_commands", (ctx) => {
    const commandsMessage = `
Here are the available commands:
/start - Start interacting with the bot
/topics - Show a list of common topics
/help - Display the help message with available commands
    `;
    ctx.reply(commandsMessage);
    ctx.answerCallbackQuery();
});

bot.command("help", (ctx) => {
    const helpMessage = `
Here are the commands you can use:

/start - Start interacting with the Okto bot and get the welcome message
/topics - Show a list of common topics to ask about
/help - Display this help message with available commands
    `;
    ctx.reply(helpMessage);
});

bot.command("topics", (ctx) => {
    const quickReplyKeyboard = new Keyboard()
        .text("What is Okto?")
        .text("How to get started with Okto?")
        
    ctx.reply("Here are some topics you can ask about:", {
        reply_markup: {
            keyboard: quickReplyKeyboard.build(),
            resize_keyboard: true,
            one_time_keyboard: true
        },
    });
});

bot.callbackQuery("ask_again", (ctx) => {
    ctx.reply("Please ask your next question about Okto:");
    ctx.answerCallbackQuery();
});


bot.on("message:text", async (ctx) => {
    const userMessage = ctx.message.text;

    try {
        await ctx.replyWithChatAction("typing");

        if (!vectorStore) {
            throw new Error("Vector store not initialized yet. Please try again later.");
        }

        const relevantDocs = await retrieveRelevantDocs(userMessage, vectorStore);

        const prompt = JSON.stringify({
            contents: [{
                parts: [{
                    text: 'Explain how AI works'
                }]
            }]
        });

        const data = {
            contents: [
              {
                parts: [
                  {
                    text: `${relevantDocs}\n. From this context answer the following question: ${userMessage}`
                  }
                ]
              }
            ]
          };

        let gaiaResponse;
        try {
            // const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent${process.env.GEMMA_API_KEY}`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: prompt
            // });

            // const data = await response.json();
            // console.log(data);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyBysP5L75QitgCOaxvNussdpYzZ8QgGl7Q`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              });
          
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
          
              const result: any = await response.json()
              gaiaResponse = result?.candidates[0]?.content.parts[0].text
        } catch (err) {
            console.error("Error interacting with Gemma API:", err);
        }

        const inlineKeyboard = new InlineKeyboard()
            .text("Ask Another Question", "ask_again")
            .row()
            .url("View Docs", "https://docs.okto.tech");

        let sanitizedRes = telegramifyMarkdown(gaiaResponse ?? '', 'escape');
        await ctx.reply(`${sanitizedRes}`, {
            parse_mode: "MarkdownV2",
            reply_markup: inlineKeyboard,
        });
    } catch (error) {
        console.error("Error interacting with LLM:", error);
        ctx.reply("There was an issue reaching Okto's knowledge base. Please try again later.");
    }
});

initializeBot();
bot.start();
