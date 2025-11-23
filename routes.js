import express from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import mime from 'mime-types';
import { login, logout, userInfo, getPermissions } from './Controllers/LoginController.js';
import { index, create, getSingle, destroy } from './Controllers/RegionController.js';
import { create as createUser, getRoles, index as indexUsers } from './Controllers/UserController.js';
import {
  create as createForeigner,
  index as indexForeigner, search,
  applicationForeigner, getApplication,
  ApproveApplication, payApplication, profile,
  getSponsers,
  ProfileForeigner,
  getSingle as getSingleForeigner,
  getDocumentsForeigner
} from './Controllers/ForeignerController.js';
import { create as createSponsor, 
  index as indexSponsor, 
  getSingle as getSingleSponsor, 
  updateStatus as updateStatusSponsor,
  destroy as destroySponsor,
  getSponsorDocuments,
  getSponsorSponsoredBy
} from './Controllers/SponsorController.js';

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

import {
  create as createDocumentType,
  index as indexDocumentType,
  getSingle as getSingleDocumentType,
  destroy as destroyDocumentType,
} from './Controllers/DocumentTypesController.js';

import {
  create as createRole,
  index as indexRole,
  getSingle as getSingleRole,
  destroy as destroyRole,
  getPermissions as getRolePermissions,
  setPermissions as setRolePermissions,
} from './Controllers/RolesController.js';

import {
  create as createCountryOfOrigin,
  index as indexCountryOfOrigin,
  getSingle as getSingleCountryOfOrigin,
  destroy as destroyCountryOfOrigin,
  getCountryOfOriginById
} from './Controllers/CountryOfOriginController.js';

import {
  create as createDistrict,
  index as indexDistrict,
  getSingle as getSingleDistrict,
  destroy as destroyDistrict,
  getByRegionDistrict,
} from './Controllers/DistrictsController.js';


import {
  analytics,
  getKeyMetrics,
  getRegistrationTrends,
  getNationalityDistribution,
  getRecentAlerts,
  getWeeklyIncidentTrends,
  appliction_trends
} from './Controllers/DashboardController.js';


import { 
  index as indexReports,
  load_report as load_report,
  run_report,
  get_param_values
 } from './Controllers/ReportsController.js';





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
router.post('/getPermissions', getPermissions);
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
router.post('/foreigners/foreign_profile', ProfileForeigner);
router.post('/foreigners/getSingle', getSingleForeigner);
router.post('/foreigners/Documents', getDocumentsForeigner);










// Sponsor routes begin here
router.post('/sponsors/create', upload.any(), createSponsor);
router.post('/sponsors/', indexSponsor);
router.post('/sponsors/getSingle', getSingleSponsor);
router.post('/sponsors/updateStatus', updateStatusSponsor);
router.post('/sponsors/destroy', destroySponsor);
router.post('/sponsors/getDocuments', getSponsorDocuments);
router.post('/sponsors/sponseredby', getSponsorSponsoredBy);






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








// Document Types routes begin here
router.post('/document_type/', indexDocumentType);
router.post('/document_type/create', createDocumentType);
router.post('/document_type/getSingle', getSingleDocumentType);
router.post('/document_type/destroy', destroyDocumentType);




// Roles routes begin here
router.post('/roles/', indexRole);
router.post('/roles/create', createRole);
router.post('/roles/getSingle', getSingleRole);
router.post('/roles/destroy', destroyRole);
router.post('/roles/getPermissions', getRolePermissions);
router.post('/roles/setPermissions', setRolePermissions);


// Dashboard routes begin here
router.post('/dashboard/analytics', analytics);
router.post('/dashboard/appliction_trends', appliction_trends);
router.post('/dashboard/getKeyMetrics', getKeyMetrics);
router.post('/dashboard/getRegistrationTrends', getRegistrationTrends);
router.post('/dashboard/getNationalityDistribution', getNationalityDistribution);
router.post('/dashboard/recent-alerts', getRecentAlerts);
router.post('/dashboard/weekly-incident-trends', getWeeklyIncidentTrends);

// Country of Origin routes begin here
router.post('/country-of-origin/', indexCountryOfOrigin);
router.post('/country-of-origin/create', createCountryOfOrigin);
router.post('/country-of-origin/getSingle', getSingleCountryOfOrigin);
router.post('/country-of-origin/destroy', destroyCountryOfOrigin);
router.post('/country-of-origin/getById', getCountryOfOriginById);


// Reports routes begin here
router.post('/reports/', indexReports);
router.post('/reports/load_report', load_report);
router.post('/reports/run_report', run_report);
router.post('/reports/get_param_values', get_param_values);

// Districts routes begin here
router.post('/district/', indexDistrict);
router.post('/district/create', createDistrict);
router.post('/district/getSingle', getSingleDistrict);
router.post('/district/destroy', destroyDistrict);
router.post('/district/getByRegion', getByRegionDistrict);



export default router;
