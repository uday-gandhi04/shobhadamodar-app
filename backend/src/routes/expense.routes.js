import express from 'express';

import {
	createExpense,
	getManagerExpenses,
	getMyShiftExpenses,
} from '../controllers/expense.controller.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
	createExpenseSchema,
	getManagerExpensesSchema,
	getMyShiftExpensesSchema,
} from '../validations/expense.validation.js';

const router = express.Router();

router.post(
	'/',
	protect,
	validate(createExpenseSchema),
	createExpense,
);

router.get(
	'/my-shift',
	protect,
	validate(getMyShiftExpensesSchema),
	getMyShiftExpenses,
);

router.get(
	'/manager',
	protect,
	authorize('MANAGER'),
	validate(getManagerExpensesSchema),
	getManagerExpenses,
);

export default router;
