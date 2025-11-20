import express from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import mime from 'mime-types';
import { login, logout, userInfo } from './Controllers/LoginController.js';
import { index, create, getSingle, destroy } from './Controllers/RegionController.js';
import { create as createUser, getRoles, index as indexUsers } from './Controllers/UserController.js';
import {
  create as createForeigner,
  index as indexForeigner, search,
  applicationForeigner, getApplication,
  ApproveApplication, payApplication, profile,
  getSponsers
} from './Controllers/ForeignerController.js';
import { create as createSponsor, index as indexSponsor, getSingle as getSingleSponsor, updateStatus as updateStatusSponsor } from './Controllers/SponsorController.js';
import { 
  create as createExpenseCategory, 
  index as indexExpenseCategory, 
  getSingle as getSingleExpenseCategory, 
  destroy as destroyExpenseCategory,
} from './Controllers/ExpenseCategoryController.js';


import {
  create as createExpenseSubCategory,
  index as indexExpenseSubCategory,
  getSingle as getSingleExpenseSubCategory,
  destroy as destroyExpenseSubCategory,
  getByCategory as getByCategoryExpenseSubCategory
} from './Controllers/ExpenseSubCategoryController.js';

import {
  create as createWithdrawal,
  index as indexWithdrawal,
  getSingle as getSingleWithdrawal,
  destroy as destroyWithdrawal,
  history as historyWithdrawal,
  balance as balanceWithdrawal,
  dashboard_cards
} from './Controllers/WithdrawalController.js';






const router = express.Router();

const uploadsDir = path.resolve('uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const baseName = (file.originalname || "document").replace(/\.[^/.]+$/, "");
    const sanitizedBase =
      baseName.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";

    const originalExt = path.extname(file.originalname || "");
    const mimeExt = file.mimetype ? mime.extension(file.mimetype) : "";
    const resolvedExt = originalExt || (mimeExt ? `.${mimeExt}` : ".bin");

    cb(null, `${randomUUID()}-${sanitizedBase}${resolvedExt}`);
  },
});

const upload = multer({ storage });


router.post('/login', login);
router.post('/logout', logout);
router.post('/user', userInfo);

// Settings routes begin here
router.post('/settings/', index);
router.post('/settings/create', create);
router.post('/settings/getSingle', getSingle);
router.post('/settings/destroy', destroy);

// User routes begin here
router.post('/users/create', createUser);
router.post('/users/roles', getRoles);
router.post('/users', indexUsers);



router.post('/foreigners/create', upload.any(), createForeigner);
router.post('/foreigners', indexForeigner);
router.post('/foreigners/search', search);
router.post('/foreigners/applications', upload.any(), applicationForeigner);
router.post('/foreigners/get_applications', getApplication);
router.post('/foreigners/approve_approval', ApproveApplication);
router.post('/foreigners/pay_application', payApplication);
router.post('/foreigners/profile', profile);
router.post('/foreigners/sponsers', getSponsers);









// Sponsor routes begin here
router.post('/sponsors/create', upload.any(), createSponsor);
router.post('/sponsors/', indexSponsor);
router.post('/sponsors/getSingle', getSingleSponsor);
router.post('/sponsors/updateStatus', updateStatusSponsor);





// Expense Category routes begin here
router.post('/expense_category/create', createExpenseCategory);
router.post('/expense_category/', indexExpenseCategory);
router.post('/expense_category/getSingle', getSingleExpenseCategory);
router.post('/expense_category/destroy', destroyExpenseCategory);






// Expense Sub Category routes begin here
router.post('/expense_subcategory/create', createExpenseSubCategory);
router.post('/expense_subcategory/', indexExpenseSubCategory);
router.post('/expense_subcategory/getSingle', getSingleExpenseSubCategory);
router.post('/expense_subcategory/destroy', destroyExpenseSubCategory);
router.post('/expense_subcategory/getByCategory', getByCategoryExpenseSubCategory);





// Withdrawal routes begin here
router.post('/withdrawal/create', createWithdrawal);
router.post('/withdrawal/', indexWithdrawal);
router.post('/withdrawal/getSingle', getSingleWithdrawal);
router.post('/withdrawal/destroy', destroyWithdrawal);
router.post('/withdrawal/history', historyWithdrawal);
router.post('/withdrawal/balance', balanceWithdrawal);


router.post('/withdrawal/dashboard_cards', dashboard_cards);








export default router;
