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
    "https://docs.okto.tech/docs/introduction-to-okto/future-sdk-scope",
    "https://docs.okto.tech/docs/developer-admin-dashboard/overview",
    "https://docs.okto.tech/docs/developer-admin-dashboard/dashboard-account",
    "https://docs.okto.tech/docs/developer-admin-dashboard/okto-environments/sandbox",
    "https://docs.okto.tech/docs/developer-admin-dashboard/okto-environments/upgrade-to-prod",
    "https://docs.okto.tech/docs/developer-admin-dashboard/okto-environments/pricing",
    "https://docs.okto.tech/docs/developer-admin-dashboard/api-key",
    "https://docs.okto.tech/docs/developer-admin-dashboard/ui-customizations/overview",
    "https://docs.okto.tech/docs/developer-admin-dashboard/ui-customizations/user-login-method",
    "https://docs.okto.tech/docs/developer-admin-dashboard/ui-customizations/ui-theme",
    "https://docs.okto.tech/docs/developer-admin-dashboard/wallet-control",
    "https://docs.okto.tech/docs/developer-admin-dashboard/sponsorship/overview",
    "https://docs.okto.tech/docs/developer-admin-dashboard/sponsorship/using-sponsorship",
    "https://docs.okto.tech/docs/developer-admin-dashboard/user-order-logs/user-log",
    "https://docs.okto.tech/docs/developer-admin-dashboard/user-order-logs/user-order-history",
    "https://docs.okto.tech/docs/react-sdk/getting-started/overview-okto-react",
    "https://docs.okto.tech/docs/react-sdk/getting-started/quickstart-okto-react/prerequisites",
    "https://docs.okto.tech/docs/react-sdk/getting-started/quickstart-okto-react/new-okto-react-setup",
    "https://docs.okto.tech/docs/react-sdk/using-react-features/components/OktoProvider",
    "https://docs.okto.tech/docs/react-sdk/using-react-features/hooks/useOkto",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/chains-tokens/supported-networks",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/authenticate-users/google-oauth/learn",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/authenticate-users/auth-user-via-code",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/setup-embedded-wallets/create-embedded-wallets",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-embedded-wallet-details",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-user-details",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-user-balance-portfolio",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/transfer-tokens",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/transfer-nfts",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/raw-transactions",
    "https://docs.okto.tech/docs/react-sdk/advanced-sdk-config/okto-embedded-wallet/built-in-ui-screens/show-ui-screen-via-code",
    "https://docs.okto.tech/docs/react-sdk/example-apps/template-app",
    "https://docs.okto.tech/docs/react-sdk/example-apps/example-repos",
    "https://docs.okto.tech/docs/react-sdk/troubleshooting-faq/sdk-error-warnings",
    "https://docs.okto.tech/docs/react-sdk/troubleshooting-faq/contact-us",
    "https://docs.okto.tech/docs/flutter-sdk/getting-started/overview-okto-flutter",
    "https://docs.okto.tech/docs/flutter-sdk/getting-started/quickstart-okto-flutter/prerequisites",
    "https://docs.okto.tech/docs/flutter-sdk/getting-started/quickstart-okto-flutter/new-okto-flutter-setup",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/chains-tokens/supported-networks",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/authenticate-users/google-oauth/learn",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup-web",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup-android",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup-ios",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/authenticate-users/auth-user-via-code",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/setup-embedded-wallets/create-embedded-wallets",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-embedded-wallet-details",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-user-details",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-user-balance-portfolio",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/transfer-tokens",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/transfer-nfts",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/raw-transactions",
    "https://docs.okto.tech/docs/flutter-sdk/advanced-sdk-config/okto-embedded-wallet/built-in-ui-screens/show-ui-screen-via-code",
    "https://docs.okto.tech/docs/flutter-sdk/example-apps/template-app",
    "https://docs.okto.tech/docs/react-native-sdk/getting-started/overview-okto-react-native",
    "https://docs.okto.tech/docs/react-native-sdk/getting-started/quickstart-okto-react-native/prerequisites",
    "https://docs.okto.tech/docs/react-native-sdk/getting-started/quickstart-okto-react-native/new-okto-react-setup",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/chains-tokens/supported-networks",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/authenticate-users/google-oauth/learn",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup-web",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup-android",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/authenticate-users/google-oauth/google-console-setup-ios",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/authenticate-users/auth-user-via-code",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/setup-embedded-wallets/create-embedded-wallets",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-embedded-wallet-details",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-user-details",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/get-user-balance-portfolio",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/transfer-tokens",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/transfer-nfts",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/use-user-embedded-wallet/raw-transactions",
    "https://docs.okto.tech/docs/react-native-sdk/advanced-sdk-config/okto-embedded-wallet/built-in-ui-screens/show-ui-screen-via-code"
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

    const welcomeMessage = `Welcome to the Gaianet Bot! You can click below to see available commands or ask anything related to Gaianet.`;
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

/start - Start interacting with the Gaianet bot and get the welcome message
/topics - Show a list of common topics to ask about
/help - Display this help message with available commands
    `;
    ctx.reply(helpMessage);
});

bot.command("topics", (ctx) => {
    const quickReplyKeyboard = new Keyboard()
        .text("What is Gaianet?")
        .text("How to install Gaianet Node?")
        .row()
        .text("Gaianet User Guide")
        .text("Gaianet Creator Guide");

    ctx.reply("Here are some topics you can ask about:", {
        reply_markup: {
            keyboard: quickReplyKeyboard.build(),
            resize_keyboard: true,
            one_time_keyboard: true
        },
    });
});

bot.callbackQuery("ask_again", (ctx) => {
    ctx.reply("Please ask your next question about Gaianet:");
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
              console.log(result?.candidates[0]?.content.parts);
              gaiaResponse = result?.candidates[0]?.content.parts[0].text
        } catch (err) {
            console.error("Error interacting with Gaianet Gemma API:", err);
        }

        const inlineKeyboard = new InlineKeyboard()
            .text("Ask Another Question", "ask_again")
            .row()
            .url("View Docs", "https://docs.gaianet.ai/intro");

        let sanitizedRes = telegramifyMarkdown(gaiaResponse ?? '', 'escape');
        await ctx.reply(`${sanitizedRes}`, {
            parse_mode: "MarkdownV2",
            reply_markup: inlineKeyboard,
        });
    } catch (error) {
        console.error("Error interacting with Gaianet LLM:", error);
        ctx.reply("There was an issue reaching Gaianet's knowledge base. Please try again later.");
    }
});

initializeBot();
bot.start();
