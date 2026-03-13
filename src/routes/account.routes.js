const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controller/account.controller");

const router = express.Router();

/**
 * - POST /api/accounts/
 * - Create new account
 * - Protected route
 */

router.post(
  "/",
  authMiddleware.authMiddleware,
  accountController.createAccountController,
);

/**
 * -GET /api/accounts/
 * - Get all accounts for the authenticated user
 * - Protected route
 */
router.get(
  "/",
  authMiddleware.authMiddleware,
  accountController.getUserAccountsController,
);

/**
 * - GET /api/accounts/balance/:accountId
 */

router.get(
  "/balance/:accountId",
  authMiddleware.authMiddleware,
  accountController.getAccountBalanceController,
);  

module.exports = router;
