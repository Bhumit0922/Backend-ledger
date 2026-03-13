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
  /**
   * 1. Validate request
   */
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message:
        "Missing required fields: fromAccount, toAccount, amount, idempotencyKey",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromUserAccount || !toUserAccount) {
    return res.status(404).json({
      message: "From or To account not found",
    });
  }

  /**
   * 2. Check idempotency key
   */
  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already completed",
        transaction: isTransactionAlreadyExists,
      });
    }

    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(202).json({
        message: "Transaction is still pending",
      });
    }

    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction previously failed. Please retry.",
      });
    }

    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction previously reversed. Please retry.",
      });
    }
  }

  /**
   * 3. Check account status
   */
  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message:
        "Both from and to accounts must be ACTIVE to perform a transaction",
    });
  }

  /**
   * 4. Derive sender balance from ledger
   */
  const balance = await fromUserAccount.getBalance();

  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}.`,
    });
  }

  let transaction;
  /**
   * 5. Create transaction with PENDING status
   */
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (
      await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
          },
        ],
        { session },
      )
    )[0];

    /**
     * 6. Create DEBIT ledger entry for sender
     */
    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await (() => {
      return new Promise((resolve) => setTimeout(resolve, 100 * 1000));
    })();
    /**
     * 7. Create CREDIT ledger entry for receiver
     */
    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    /**
     * 8. Mark transaction as COMPLETED
     */
    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );
    /**
     * 9. Commit mongodb transaction
     */
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    return res.status(400).json({
      message:
        "transacion is pending due to some error. Please retry after some time.",
    });
  }

  /**
   * 10. Send email notifications
   */
  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    toUserAccount._id,
  );

  return res.status(201).json({
    message: "Transaction created successfully",
    transaction: transaction,
  });
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
