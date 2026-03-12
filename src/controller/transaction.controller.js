const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.services");
const accountModel = require("../models/account.model");
const mongoose = require("mongoose");
/**
 * create a new transaction
 * The 10-Step Transfer Flow:
 * 1. validate request
 * 2. check idempotency key
 * 3. check account status
 * 4. derive sender balance from ledger
 * 5. create transaction with PENDING status
 * 6. create DEBIT ledger entry for sender
 * 7. create CREDIT ledger entry for receiver
 * 8. mark transaction as COMPLETED
 * 9. commit mongodb transaction
 * 10. send email notifications
 */

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "Missing required fields: toAccount, amount, idempotencyKey",
    });
  }

  console.log("toAccount:", toAccount);
  const accounts = await accountModel.find();
  console.log(accounts);

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!toUserAccount) {
    return res.status(404).json({
      message: "To account not found",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    systemAccount: true,
    user: req.user._id,
  });

  if (!fromUserAccount) {
    return res.status(404).json({
      message: "System account not found for the user",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  });

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromUserAccount._id,
        amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );

  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toAccount,
        amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    message: "Initial funds transaction created successfully",
    transaction: transaction,
  });
}

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
};
