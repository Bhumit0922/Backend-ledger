const { Router } = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controller/transaction.controller");

const transactionRoutes = Router();
// const transactionController = require("../controller/")

transactionRoutes.post(
  "/",
  authMiddleware.authMiddleware,
  transactionController.createTransaction,
);
/**
 *  - POST /api/transactions
 *  - create a new transaction
 */
transactionRoutes.post(
  "/system/intial-funds",
  authMiddleware.authSystemUserMiddleware,
  transactionController.createInitialFundsTransaction,
);

module.exports = transactionRoutes;
