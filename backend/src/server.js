import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bp from "body-parser";
import { config } from "dotenv";
import router from "./router.js";


const env = config();
const app = express();

app.use(cors()).use("/uploads", express.static("uploads")).use(express.json()).use(cookieParser()).use(bp.urlencoded({ extended: true  })).use("/api/v1",router);

// disable x-powered-by header
app.disable("x-powered-by");

export { app as server, env };
