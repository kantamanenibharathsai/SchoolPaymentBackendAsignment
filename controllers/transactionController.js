// import { Transaction } from '../models/transaction.js';

// export const getAllTransactions = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 10, status, start_date, end_date } = req.query;
//         const filter = {};

//         if (status) filter.status = status;
//         if (start_date || end_date) {
//             filter.transaction_date = {};
//             if (start_date) filter.transaction_date.$gte = new Date(start_date);
//             if (end_date) filter.transaction_date.$lte = new Date(end_date);
//         }

//         const transactions = await Transaction.find(filter)
//             .select('collect_id school_id gateway order_amount transaction_amount status custom_order_id')
//             .skip((page - 1) * limit)
//             .limit(Number(limit))
//             .sort({ transaction_date: -1 });

//         const total = await Transaction.countDocuments(filter);

//         res.json({
//             page: Number(page),
//             totalPages: Math.ceil(total / limit),
//             totalRecords: total,
//             data: transactions,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// export const getTransactionsBySchool = async (req, res, next) => {
//     try {
//         const { school_id } = req.params;
//         const { start_date, end_date } = req.query;
//         const filter = { school_id };

//         if (start_date || end_date) {
//             filter.transaction_date = {};
//             if (start_date) filter.transaction_date.$gte = new Date(start_date);
//             if (end_date) filter.transaction_date.$lte = new Date(end_date);
//         }

//         const transactions = await Transaction.find(filter)
//             .select('collect_id school_id gateway order_amount transaction_amount status custom_order_id')
//             .sort({ transaction_date: -1 });

//         res.json(transactions);
//     } catch (error) {
//         next(error);
//     }
// };

// export const checkTransactionStatus = async (req, res, next) => {
//     try {
//         const { custom_order_id } = req.params;
//         const transaction = await Transaction.findOne({ custom_order_id }).select('status');
//         if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
//         res.json({ status: transaction.status });
//     } catch (error) {
//         next(error);
//     }
// };

// export const webhookTransactionStatus = async (req, res, next) => {
//     try {
//         const { status, order_info } = req.body;
//         const { order_id, order_amount, transaction_amount, gateway, bank_reference } = order_info;

//         const transaction = await Transaction.findOne({ collect_id: order_id });
//         if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

//         transaction.status = status === 200 ? 'Success' : 'Failed';
//         transaction.order_amount = order_amount;
//         transaction.transaction_amount = transaction_amount;
//         transaction.gateway = gateway;
//         transaction.bank_reference = bank_reference;

//         await transaction.save();

//         res.json({ message: 'Transaction updated successfully' });
//     } catch (error) {
//         next(error);
//     }
// };

// export const manualUpdateTransaction = async (req, res, next) => {
//     try {
//         const { custom_order_id, new_status } = req.body;
//         const transaction = await Transaction.findOne({ custom_order_id });
//         if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

//         transaction.status = new_status;
//         await transaction.save();

//         res.json({ message: 'Transaction status updated', transaction });
//     } catch (error) {
//         next(error);
//     }
// };
// backend/controllers/transactionController.js
import {
  getTransactions,
  getTransactionsBySchool,
  getTransactionByCustomOrderId,
  getTransactionByCollectId,
  updateTransactionStatus,
  updateTransactionForWebhook,
} from "../services/transactionService.js";

export const getAllTransactions = async (req, res, next) => {
  console.log("request query", req.query);
  try {
    const { page = 1, limit = 10, status } = req.query;
    const search_term = req.query.searchTerm;
    const start_date = req.query.startDate;
    const end_date = req.query.endDate;
    console.log("page", page, limit, "limit");
    const filter = {};
    if (status) filter.status = status;
    if (search_term) {
      filter.$or = [
        { collect_id: { $regex: search_term, $options: "i" } },
        { custom_order_id: { $regex: search_term, $options: "i" } },
      ];
    }
    if (start_date || end_date) {
      filter.transaction_date = {};
      if (start_date) filter.transaction_date.$gte = new Date(start_date);
      if (end_date) filter.transaction_date.$lte = new Date(end_date);
    }
    const { transactions, total } = await getTransactions(filter, {
      page,
      limit,
    });
    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionsBySchoolController = async (req, res, next) => {
  try {
    const { school_id } = req.params;
    const start_date = req.query.startDate;
    const end_date = req.query.endDate;
    const transactions = await getTransactionsBySchool(
      school_id,
      start_date,
      end_date
    );
    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
};

export const checkTransactionStatus = async (req, res, next) => {
  try {
    const { custom_order_id } = req.params;
    const transaction = await getTransactionByCustomOrderId(custom_order_id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(200).json({ status: transaction.status });
  } catch (error) {
    next(error);
  }
};

export const webhookTransactionStatus = async (req, res, next) => {
  try {
    const { status, order_info } = req.body;
    const {
      order_id,
      order_amount,
      transaction_amount,
      gateway,
      bank_reference,
    } = order_info;

    const transaction = await getTransactionByCollectId(order_id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const updatedTransaction = await updateTransactionForWebhook(order_id, {
      status: status === 200 ? "Success" : "Failed",
      order_amount,
      transaction_amount,
      gateway,
      bank_reference,
    });

    res.status(200).json({
      message: "Transaction updated successfully",
      transaction: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const manualUpdateTransaction = async (req, res, next) => {
  try {
    const { custom_order_id, new_status } = req.body;
    const transaction = await updateTransactionStatus(
      custom_order_id,
      new_status
    );
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res
      .status(200)
      .json({ message: "Transaction status updated", transaction });
  } catch (error) {
    next(error);
  }
};
