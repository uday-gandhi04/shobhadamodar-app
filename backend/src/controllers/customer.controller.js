import Customer from '../models/Customer.js';

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
};

export const searchCustomers = async (
  req,
  res,
  next,
) => {
  try {
    const query = String(
      req.query.q || '',
    ).trim();

    if (!query) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const regex = new RegExp(
      escapeRegex(query),
      'i',
    );

    const customers =
      await Customer.find({
        $or: [
          { name: regex },
          { vehicleNumber: regex },
        ],
      })
        .select(
          'name vehicleNumber phoneNumber outstandingBalance',
        )
        .sort({
          name: 1,
        })
        .limit(10)
        .lean();

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};