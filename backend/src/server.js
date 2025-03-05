import { join as _platformJoin } from "path";
import expressEjsLayouts from "express-ejs-layouts";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bp from "body-parser";
import { config } from "dotenv";
import apiRouter from "./router.js";
import pagesRouter from "./views/index.js";


const env = config();
const app = express();

app.locals = {
    encodeURIComponent,
    showBreadCrumbs: false,
}

app.use(cors()).set("view engine", "ejs").use(expressEjsLayouts).set("views", _platformJoin(process.cwd(), "/backend/src/views")).set("layout", _platformJoin(process.cwd(), "/backend/src/views/layouts/main")).use("/assets", express.static(_platformJoin(process.cwd(), "assets"))).use("/uploads", express.static("uploads")).use(express.json()).use(cookieParser()).use(bp.urlencoded({ extended: true  })).use("/", pagesRouter).use("/api/v1",apiRouter);
// disable x-powered-by header
app.disable("x-powered-by");

export { app as server, env };
