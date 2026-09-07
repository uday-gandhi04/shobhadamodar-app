import User from '../models/User.js';

/**
 * Create an employee account.
 *
 * @route POST /api/users/employees
 * @access MANAGER
 */
export const createEmployee = async (req, res, next) => {
  try {
    const { name, employeeId, password } = req.body;

    // Authorization should already be enforced by middleware,
    // but keep this defensive check here as well.
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can create employee accounts.',
        code: 'FORBIDDEN',
      });
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    const existingUser = await User.findOne({
      employeeId: normalizedEmployeeId,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this Employee ID already exists.',
        code: 'EMPLOYEE_ID_EXISTS',
      });
    }

    const employee = await User.create({
      name: name.trim(),
      employeeId: normalizedEmployeeId,
      password,
      role: 'EMPLOYEE',
      isActive: true,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Employee account created successfully.',
      data: {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        role: employee.role,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this Employee ID already exists.',
        code: 'EMPLOYEE_ID_EXISTS',
      });
    }

    next(error);
  }
};