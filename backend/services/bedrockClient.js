import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config();

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // ✅ include session token
  },
});

export default bedrockClient;