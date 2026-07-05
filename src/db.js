import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!config.mongodbUri) throw new Error("MONGODB_URI is missing");

  await mongoose.connect(config.mongodbUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function closeDb() {
  await mongoose.disconnect();
}
