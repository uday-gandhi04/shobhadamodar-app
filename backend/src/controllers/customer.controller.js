import mongoose from 'mongoose';

import Customer from '../models/Customer.js';
import UdhariTransaction from '../models/UdhariTransaction.js';
import { recordAuditLog } from '../utils/auditLog.js';

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
};

const getBusinessDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const getCustomerStatus = (customer) => {
  if (customer?.isBlocked) {
    return 'BLOCKED';
  }

  return Number(customer?.outstandingBalance || 0) > 0 ? 'ACTIVE' : 'SETTLED';
};

const formatCustomer = (customer) => {
  if (!customer) {
    return null;
  }

  const normalized = { ...customer };
  normalized.outstandingBalance = Number(normalized.outstandingBalance || 0);
  normalized.creditLimitPaise = Number(normalized.creditLimitPaise || 0);
  normalized.isBlocked = Boolean(normalized.isBlocked);
  normalized.status = getCustomerStatus(normalized);
  return normalized;
};

const buildLedger = (transactions = []) => {
  const ledger = [...transactions]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((transaction) => {
      const type = transaction.transactionType || 'CREDIT';
      const amountPaise = Number(transaction.amountPaise || 0);
      const signedAmount = type === 'SETTLEMENT' ? -amountPaise : amountPaise;

      return {
        _id: transaction._id,
        date: transaction.createdAt,
        transactionType: type,
        paymentMethod: transaction.paymentMethod || null,
        referenceNumber: transaction.referenceNumber || null,
        amountPaise,
        signedAmount,
        fuelType: transaction.fuelType || null,
        litres: Number(transaction.litres || 0),
        vehicleNumber: transaction.vehicleNumber || null,
        employee: transaction.employeeId
          ? {
              _id: transaction.employeeId._id || transaction.employeeId,
              name: transaction.employeeId.name || 'Unknown employee',
              employeeId: transaction.employeeId.employeeId || null,
            }
          : null,
      };
    });

  let runningBalance = 0;
  return ledger.map((entry) => {
    runningBalance += entry.signedAmount;
    return {
      ...entry,
      runningBalance,
    };
  });
};

const buildCustomerSummary = (transactions = []) => {
  const totals = {
    totalCreditPaise: 0,
    totalSettlementsPaise: 0,
    transactionCount: transactions.length,
  };

  for (const transaction of transactions) {
    const amountPaise = Number(transaction.amountPaise || 0);
    const type = transaction.transactionType || 'CREDIT';

    if (type === 'SETTLEMENT') {
      totals.totalSettlementsPaise += amountPaise;
      continue;
    }

    totals.totalCreditPaise += amountPaise;
  }

  return totals;
};

export const searchCustomers = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const regex = new RegExp(escapeRegex(query), 'i');

    const customers = await Customer.find({
      $or: [
        { name: regex },
        { vehicleNumber: regex },
        { phoneNumber: regex },
      ],
    })
      .select('name vehicleNumber phoneNumber outstandingBalance isBlocked')
      .sort({ name: 1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      data: customers.map((customer) => ({
        ...formatCustomer(customer),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const listManagerCustomers = async (req, res, next) => {
  try {
    const searchTerm = String(req.query.q || '').trim();
    const statusFilter = String(req.query.filter || 'all').toLowerCase();

    const conditions = {};

    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), 'i');
      conditions.$or = [
        { name: regex },
        { phoneNumber: regex },
        { vehicleNumber: regex },
      ];
    }

    if (statusFilter === 'outstanding') {
      conditions.outstandingBalance = { $gt: 0 };
      conditions.isBlocked = false;
    }

    if (statusFilter === 'settled') {
      conditions.outstandingBalance = { $lte: 0 };
      conditions.isBlocked = false;
    }

    if (statusFilter === 'blocked') {
      conditions.isBlocked = true;
    }

    const customers = await Customer.find(conditions)
      .sort({ name: 1 })
      .lean();

    const normalizedCustomers = customers.map(formatCustomer);
    const totalOutstandingPaise = normalizedCustomers.reduce(
      (sum, customer) => sum + Number(customer.outstandingBalance || 0),
      0,
    );
    const customersWithOutstanding = normalizedCustomers.filter(
      (customer) => Number(customer.outstandingBalance || 0) > 0,
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOutstandingPaise,
          totalCustomers: normalizedCustomers.length,
          customersWithOutstanding,
          blockedCustomers: normalizedCustomers.filter((customer) => customer.isBlocked).length,
        },
        customers: normalizedCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerDetail = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer id.',
      });
    }

    const customer = await Customer.findById(customerId).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const transactions = await UdhariTransaction.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .populate('employeeId', 'name employeeId')
      .lean();

    const ledger = buildLedger(transactions);
    const summary = buildCustomerSummary(transactions);
    summary.currentOutstandingPaise = Number(customer.outstandingBalance || 0);

    return res.status(200).json({
      success: true,
      data: {
        customer: formatCustomer(customer),
        summary,
        ledger,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, phoneNumber, vehicleNumber, address, notes, creditLimitPaise = 0 } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      });
    }

    const customer = await Customer.create({
      name: String(name).trim(),
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : null,
      address: address ? String(address).trim() : null,
      notes: notes ? String(notes).trim() : null,
      outstandingBalance: 0,
      creditLimitPaise,
    });

    await recordAuditLog({
      actor: req.user,
      action: 'UDHARI_CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      metadata: { customerId: String(customer._id) },
    });

    return res.status(201).json({
      success: true,
      data: formatCustomer(customer.toObject ? customer.toObject() : customer),
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer id.',
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const changedFields = {};
    
    if (req.body.name && String(req.body.name).trim() && customer.name !== String(req.body.name).trim()) {
      changedFields.name = String(req.body.name).trim();
      customer.name = changedFields.name;
    }

    if (req.body.phoneNumber !== undefined) {
      const val = req.body.phoneNumber ? String(req.body.phoneNumber).trim() : null;
      if (customer.phoneNumber !== val) {
        changedFields.phoneNumber = val;
        customer.phoneNumber = val;
      }
    }

    if (req.body.vehicleNumber !== undefined) {
      const val = req.body.vehicleNumber ? String(req.body.vehicleNumber).trim().toUpperCase() : null;
      if (customer.vehicleNumber !== val) {
        changedFields.vehicleNumber = val;
        customer.vehicleNumber = val;
      }
    }

    if (req.body.address !== undefined) {
      const val = req.body.address ? String(req.body.address).trim() : null;
      if (customer.address !== val) {
        changedFields.address = val;
        customer.address = val;
      }
    }

    if (req.body.notes !== undefined) {
      const val = req.body.notes ? String(req.body.notes).trim() : null;
      if (customer.notes !== val) {
        changedFields.notes = val;
        customer.notes = val;
      }
    }

    if (req.body.creditLimitPaise !== undefined && customer.creditLimitPaise !== req.body.creditLimitPaise) {
      changedFields.creditLimitPaise = req.body.creditLimitPaise;
      customer.creditLimitPaise = req.body.creditLimitPaise;
    }

    await customer.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UDHARI_CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      metadata: { customerId: String(customer._id), changedFields },
    });

    return res.status(200).json({
      success: true,
      data: formatCustomer(customer.toObject ? customer.toObject() : customer),
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCustomerBlockedStatus = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { blocked } = req.body;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer id.',
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    customer.isBlocked = Boolean(blocked);
    await customer.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UDHARI_CUSTOMER_BLOCK_STATUS_CHANGED',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      metadata: { customerId: String(customer._id), blocked: customer.isBlocked },
    });

    return res.status(200).json({
      success: true,
      data: formatCustomer(customer.toObject ? customer.toObject() : customer),
    });
  } catch (error) {
    next(error);
  }
};

export const settleCustomerBalance = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const rawAmount = Number(req.body.amountPaise ?? req.body.amount ?? 0);
    const paymentMethod = String(req.body.paymentMethod || 'CASH').toUpperCase();
    const referenceNumber = req.body.referenceNumber ? String(req.body.referenceNumber).trim() : null;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer id.',
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Settlement amount must be greater than zero.',
      });
    }

    if (rawAmount > Number(customer.outstandingBalance || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Settlement amount cannot exceed the outstanding balance.',
      });
    }

    const validMethods = ['CASH', 'UPI', 'CARD'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported payment method.',
      });
    }

    const settlement = await UdhariTransaction.create({
      customerId: customer._id,
      shiftId: null,
      employeeId: req.user._id,
      businessDate: getBusinessDate(),
      transactionType: 'SETTLEMENT',
      paymentMethod,
      referenceNumber,
      fuelType: null,
      litres: 0,
      ratePaise: 0,
      amountPaise: rawAmount,
    });

    customer.outstandingBalance = Math.max(0, Number(customer.outstandingBalance || 0) - rawAmount);
    await customer.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UDHARI_SETTLEMENT_RECORDED',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      metadata: {
        customerId: String(customer._id),
        amountPaise: rawAmount,
        paymentMethod,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Settlement recorded successfully.',
      data: {
        customer: formatCustomer(customer.toObject ? customer.toObject() : customer),
        settlement,
      },
    });
  } catch (error) {
    next(error);
  }
};
