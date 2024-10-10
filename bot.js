var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
let vectorStore = null;
function buildVectorDB() {
    return __awaiter(this, void 0, void 0, function* () {
        let allSplits = [];
        for (const link of links) {
            const loader = new CheerioWebBaseLoader(link);
            const docs = yield loader.load();
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const splits = yield textSplitter.splitDocuments(docs);
            allSplits = allSplits.concat(splits);
        }
        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HF_API_KEY,
            model: "sentence-transformers/all-MiniLM-L6-v2",
        });
        const vectorStore = yield MemoryVectorStore.fromDocuments(allSplits, embeddings);
        console.log("Vector store is built and ready to use.");
        return vectorStore;
    });
}
function retrieveRelevantDocs(question, vectorStore) {
    return __awaiter(this, void 0, void 0, function* () {
        const retriever = vectorStore.asRetriever();
        const retrievedDocs = yield retriever.invoke(question);
        return retrievedDocs.map((doc) => doc.pageContent).join("\n\n");
    });
}
function escapeMarkdown(text) {
    return text
        .replace(/_/g, "\\_") // Escapes underscore
        .replace(/\*/g, "\\*") // Escapes asterisk
        .replace(/\[/g, "\\[") // Escapes square brackets
        .replace(/\]/g, "\\]") // Escapes square brackets
        .replace(/`/g, "\\`") // Escapes backtick
        .replace(/\(/g, "\\(") // Escapes parenthesis
        .replace(/\)/g, "\\)") // Escapes parenthesis
        .replace(/>/g, "\\>") // Escapes angle brackets
        .replace(/</g, "\\<") // Escapes angle brackets
        .replace(/-/g, "\\-"); // Escapes dash (hyphen)
}
const bot = new Bot(process.env.TELEGRAM_BOT_KEY);
function initializeBot() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Initializing bot and building vector store...");
            vectorStore = yield buildVectorDB();
            console.log("Bot is ready.");
        }
        catch (error) {
            console.error("Failed to initialize bot:", error);
        }
    });
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
        .text("How to get started with Okto?");
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
bot.on("message:text", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userMessage = ctx.message.text;
    try {
        yield ctx.replyWithChatAction("typing");
        if (!vectorStore) {
            throw new Error("Vector store not initialized yet. Please try again later.");
        }
        const relevantDocs = yield retrieveRelevantDocs(userMessage, vectorStore);
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
            const response = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyBysP5L75QitgCOaxvNussdpYzZ8QgGl7Q`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = yield response.json();
            gaiaResponse = (_a = result === null || result === void 0 ? void 0 : result.candidates[0]) === null || _a === void 0 ? void 0 : _a.content.parts[0].text;
        }
        catch (err) {
            console.error("Error interacting with Gemma API:", err);
        }
        const inlineKeyboard = new InlineKeyboard()
            .text("Ask Another Question", "ask_again")
            .row()
            .url("View Docs", "https://docs.okto.tech");
        let sanitizedRes = telegramifyMarkdown(gaiaResponse !== null && gaiaResponse !== void 0 ? gaiaResponse : '', 'escape');
        yield ctx.reply(`${sanitizedRes}`, {
            parse_mode: "MarkdownV2",
            reply_markup: inlineKeyboard,
        });
    }
    catch (error) {
        console.error("Error interacting with LLM:", error);
        ctx.reply("There was an issue reaching Okto's knowledge base. Please try again later.");
    }
}));
initializeBot();
bot.start();
