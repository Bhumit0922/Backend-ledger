const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieParser());

/**
 * - Routes
 */
const accountRouter = require("./routes/account.routes");
const authRouter = require("./routes/auth.routes");
const transactionRouter = require("./routes/transaction.routes");
/**
 * - use Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);

module.exports = app;
