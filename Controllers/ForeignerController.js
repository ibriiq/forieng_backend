import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import joi from "joi";

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const buildFileUrl = (req, relativePath) => {
  if (!relativePath) return null;
  const sanitizedPath = relativePath.replace(/^\/+/, "");
  const baseUrl =
    process.env.APP_URL || `${req.protocol}://${req.get("host") || "localhost"}`;
  return `${baseUrl}/${sanitizedPath}`;
};

const imageToBase64 = async (relativePath) => {
  try {
    if (!relativePath) return null;

    // Convert relative path to absolute path
    const absolutePath = path.resolve(relativePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    // Read file as buffer
    const buffer = await fs.promises.readFile(absolutePath);

    // Determine MIME type from file extension
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };

    const mimeType = mimeMap[ext] || "image/jpeg";

    // Convert buffer to base64
    const base64String = buffer.toString("base64");

    // Return data URI
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
};

const saveBase64Image = async (dataUri) => {
  try {
    if (!dataUri || typeof dataUri !== "string") {
      return "";
    }

    const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return "";
    }

    const [, mimeType, base64Data] = match;
    const extensionMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    const extension = extensionMap[mimeType] || "bin";
    const buffer = Buffer.from(base64Data, "base64");
    const uploadsDir = path.resolve("uploads", "biometrics");
    ensureDirectory(uploadsDir);

    const filename = `${randomUUID()}.${extension}`;
    const absolutePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(absolutePath, buffer);

    return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
  } catch (error) {
    console.error("Failed to save base64 image:", error);
    return "";
  }
};

// Helper function to get setting ID by name/label and dropdown type
const getSettingId = async (value, dropdownType) => {
  if (!value) return 0;

  // Try to parse as integer first (in case it's already an ID)
  const parsed = parseInt(value);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Otherwise, look it up in the Settings table (check both name and label)
  try {
    const setting = await prisma.Setting.findFirst({
      where: {
        OR: [
          { name: value },
          { label: value }
        ],
        dropdown_type: dropdownType,
        status: "active"
      }
    });
    return setting ? setting.id : 0;
  } catch (error) {
    console.error(`Error looking up setting ${value} for ${dropdownType}:`, error);
    return 0;
  }
};

const buildAttachmentPaths = (files = []) =>
  (files || [])
    .filter((file) => file)
    .map((file) => {
      const fallbackPath =
        (file.destination && file.filename
          ? path.join(file.destination, file.filename)
          : file.filename) || "";

      const absolutePath = file.path || fallbackPath;
      return absolutePath
        ? path.relative(process.cwd(), absolutePath).replace(/\\/g, "/")
        : "";
    })
    .filter((normalizedPath) => normalizedPath);

const create = async (req, res) => {
  try {
    console.log("req.body", req.body);
    // console.log("req.files", req.files);

    // Extract data from nested structure
    const personalInfo = req.body.personalInfo || {};
    const contactInfo = req.body.contactInfo || {};
    const entryInfo = req.body.entryInfo || {};
    const biometricData = req.body.biometricData || {};
    const documentsMeta = req.body.documents || [];

    // Match files with document metadata
    // Files have fieldnames like documents[0][file], documents[1][file]
    // Documents array has metadata with type, name, etc.
    const documents = [];
    if (req.files && Array.isArray(req.files) && documentsMeta.length > 0) {
      req.files.forEach((file) => {
        const match = file.fieldname.match(/^documents\[(\d+)\]\[file\]$/);
        if (match) {
          const index = parseInt(match[1]);
          const docMeta = documentsMeta[index];

          if (docMeta && docMeta.type) {
            // Get relative path from project root (matching SponsorController pattern)
            const fallbackPath =
              (file.destination && file.filename
                ? path.join(file.destination, file.filename)
                : file.filename) || "";

            const absolutePath = file.path || fallbackPath;
            const normalizedPath = absolutePath
              ? path.relative(process.cwd(), absolutePath).replace(/\\/g, "/")
              : "";

            if (normalizedPath) {
              documents.push({
                type_id: parseInt(docMeta.type),
                file_name: normalizedPath,
              });
            }
          }
        }
      });
    }

    // Extract emergency contact info
    const emergencySomaliland = contactInfo.emergencyContactSomaliland || {};
    const emergencyEthiopia = contactInfo.emergencyContactEthiopia || {};

    // Build phone number with country code
    const phoneNumber = contactInfo.countryCode && contactInfo.phone
      ? `${contactInfo.countryCode}${contactInfo.phone}`
      : contactInfo.phone || "";

    const somalilandPhone = emergencySomaliland.countryCode && emergencySomaliland.phone
      ? `${emergencySomaliland.countryCode}${emergencySomaliland.phone}`
      : emergencySomaliland.phone || "";

    const ethiopiaPhone = emergencyEthiopia.countryCode && emergencyEthiopia.phone
      ? `${emergencyEthiopia.countryCode}${emergencyEthiopia.phone}`
      : emergencyEthiopia.phone || "";

    // Look up marital status and occupation IDs if they're strings
    const maritalStatusId = personalInfo.maritalStatus;
    const occupationId = await getSettingId(personalInfo.occupation, "occupation");

    const timestamp = new Date().getTime();
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleDateString('en-CA').replace(/-/g, '');



    let savedImagePath = "";

    // Create foreigner and documents in a transaction
    if (biometricData.photo) {
      savedImagePath = await saveBase64Image(biometricData.photo);
    } else {
      savedImagePath = "";
    }


    let  createdForeigner = null;
    
    // console.log("req.id", req.body.id);
    if (req.body.id) {
      const createdForeigner = await prisma.$transaction(async (tx) => {
        // Create foreigner record
        const foreigner = await tx.foreigners.update({
          where: {id: parseInt(req.body.id)},
          data: {
            first_name: personalInfo.firstName || "",
            last_name: personalInfo.lastName || "",
            mother_name: personalInfo.motherFullName || "",
            dob: new Date(personalInfo.dateOfBirth ? personalInfo.dateOfBirth : new Date()),
            gender: personalInfo.gender || "",
            nationality: parseInt(personalInfo.nationality) || 0,
            country_of_origin: personalInfo.countryOfOrigin ? parseInt(personalInfo.countryOfOrigin) : 0,
            marital_status: maritalStatusId,
            occupation: occupationId,
            number: phoneNumber,
            email: contactInfo.email || null,
            current_address: contactInfo.address || null,
            fullname_somaliland: emergencySomaliland.name || null,
            relationship_somaliland: emergencySomaliland.relationship || null,
            contactnumber_somaliland: somalilandPhone || null,
            address_somaliland: emergencySomaliland.address || null,
            fullname_other: emergencyEthiopia.name || null,
            relationship_other: emergencyEthiopia.relationship || null,
            contactnumber_other: ethiopiaPhone || null,
            address_other: emergencyEthiopia.address || null,
            sponser_id: parseInt(contactInfo.sponsorId || entryInfo.sponsorId || req.body.sponsorInfo?.sponsorId || 0),
            entry_date: new Date(entryInfo.entryDate ? entryInfo.entryDate : new Date()),
            entry_point: entryInfo.entryPoint || "",
            purpose: entryInfo.purposeOfEntry || "",
            type_status: entryInfo.typeOfStay || "",
            image: savedImagePath || "",
            created_by: parseInt(req.body.created_by || 1), // Default to 1 if not provided
            created_at: new Date(),
            updated_at: new Date(),
            registration_id: "FRN-".concat(formattedDate).concat("-").concat(await tx.foreigners.count() + 1),
          },
        });

        // Create document records
        if (documents.length > 0) {
          await tx.foreigner_documents.where({where: {foreign_id: parseInt(req.id)}}).deleteMany();
          await tx.foreigner_documents.createMany({
            data: documents.map((doc) => ({
              foreign_id: foreigner.id,
              type_id: doc.type_id,
              file_name: doc.file_name,
            })),
          });
        }

        return foreigner;
      });
    } else {
      const createdForeigner = await prisma.$transaction(async (tx) => {
        // Create foreigner record
        const foreigner = await tx.foreigners.create({
          data: {
            first_name: personalInfo.firstName || "",
            last_name: personalInfo.lastName || "",
            mother_name: personalInfo.motherFullName || "",
            dob: new Date(personalInfo.dateOfBirth ? personalInfo.dateOfBirth : new Date()),
            gender: personalInfo.gender || "",
            nationality: parseInt(personalInfo.nationality) || 0,
            country_of_origin: personalInfo.countryOfOrigin ? parseInt(personalInfo.countryOfOrigin) : 0,
            marital_status: maritalStatusId,
            occupation: occupationId,
            number: phoneNumber,
            email: contactInfo.email || null,
            current_address: contactInfo.address || null,
            fullname_somaliland: emergencySomaliland.name || null,
            relationship_somaliland: emergencySomaliland.relationship || null,
            contactnumber_somaliland: somalilandPhone || null,
            address_somaliland: emergencySomaliland.address || null,
            fullname_other: emergencyEthiopia.name || null,
            relationship_other: emergencyEthiopia.relationship || null,
            contactnumber_other: ethiopiaPhone || null,
            address_other: emergencyEthiopia.address || null,
            sponser_id: parseInt(contactInfo.sponsorId || entryInfo.sponsorId || req.body.sponsorInfo?.sponsorId || 0),
            entry_date: new Date(entryInfo.entryDate ? entryInfo.entryDate : new Date()),
            entry_point: entryInfo.entryPoint || "",
            purpose: entryInfo.purposeOfEntry || "",
            type_status: entryInfo.typeOfStay || "",
            image: savedImagePath || "",
            created_by: parseInt(req.body.created_by || 1), // Default to 1 if not provided
            created_at: new Date(),
            updated_at: new Date(),
            registration_id: "FRN-".concat(formattedDate).concat("-").concat(await tx.foreigners.count() + 1),
            status: 'Registered'
          },
        });

        // Create document records
        if (documents.length > 0) {
          await tx.foreigner_documents.createMany({
            data: documents.map((doc) => ({
              foreign_id: foreigner.id,
              type_id: doc.type_id,
              file_name: doc.file_name,
            })),
          });
        }

        return foreigner;
      });
    }



    return res.status(200).json({
      message: "Foreigner created successfully",
      id: createdForeigner?.id || null
    });
  } catch (error) {
    console.error("Error creating foreigner:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

const index = async (req, res) => {
  try {
    const foreigners = await prisma.$queryRaw`
        SELECT foreigners.*, settings.name as nationality
        FROM foreigners

        left join settings on foreigners.nationality = settings.id
    `;

    // Convert images to base64 for all foreigners
    const foreignersWithImages = await Promise.all(
      foreigners.map(async (foreigner) => ({
        ...foreigner,
        image_base64: await imageToBase64(foreigner.image),
      }))
    );

    return res.status(200).json(foreignersWithImages);
  } catch (error) {
    console.error("Error fetching foreigners:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const search = async (req, res) => {
  try {

    const registrationId = req.body.search;

    console.log(registrationId);

    const foreigner = await prisma.$queryRaw`
        SELECT foreigners.*, settings.name as nationality
        FROM foreigners
        left JOIN settings on foreigners.nationality = settings.id and settings.dropdown_type = 'nationalities'
            WHERE 
            (foreigners.registration_id  LIKE ${'%' + registrationId + '%'} or concat(foreigners.first_name, ' ', foreigners.last_name) LIKE ${'%' + registrationId + '%'})
    `;

    // const application = await prisma.$queryRaw`
    //     SELECT *
    //     FROM applications
    //     join foreigners on applications.foreign_id = foreigners.id
    //     where foreigners.registration_id LIKE ${'%' + registrationId + '%'}
    // `;


    // const foreigner = await prisma.$queryRaw`
    //     SELECT top 1 foreigners.*, settings.name as nationality
    //     FROM foreigners
    //     left JOIN settings on foreigners.nationality = settings.id and settings.dropdown_type = 'nationalities'
    // `;

    const foreignerData = await Promise.all(foreigner.map(async (item) => {
      const applications = await prisma.$queryRaw`
        SELECT *
        FROM applications
        join foreigners on applications.foreign_id = foreigners.id
        where foreigners.id = ${item.id}
      `;
      item.applications = applications;
      return item;
    }));


    return res.status(200).json(foreignerData);
  } catch (error) {
    console.error("Error getting foreigner by registration id:", error);
    return res.status(500).json("Internal server error");
  }
};


const applicationForeigner = async (req, res) => {
  try {
    const {
      foreigner_id,
      application_type,
      document_type,
      purpose,
      expiry_date,
      status
    } = req.body || {};

    if (!foreigner_id || !application_type || !document_type) {
      return res.status(400).json({
        error:
          "foreigner_id, application_type, and document_type are required fields.",
      });
    }

    const attachments = buildAttachmentPaths(req.files);

    let amount = await prisma.$queryRaw`
        SELECT label FROM settings WHERE id = ${parseInt(document_type)}
    `;

    if (amount.length < 1) {
      return res.status(400).json("Please select a valid document type");
    }

    amount = amount[0].label ? amount[0].label : 0;

    const createdApplication = await prisma.$transaction(async (tx) => {
      const application = await tx.applications.create({
        data: {
          foreign_id: parseInt(foreigner_id),
          application_type: application_type,
          document_type: document_type,
          note: purpose,
          expiry_date: new Date(),
          status: status || "Pending",
          created_by: parseInt(req.user.id),
          created_at: new Date(),
          updated_at: new Date(),
          amount: amount
        },
      });

      if (attachments.length) {
        await tx.application_documents.createMany({
          data: attachments.map((filePath) => ({
            application_id: application.id,
            file_name: filePath,
          })),
        });
      }

      return application;
    });

    return res.status(200).json(createdApplication);
  } catch (error) {
    console.error("Error storing application:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getApplication = async (req, res) => {
  try {

    // Access server host and port from environment variables (with defaults)
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3000;

    const baseUrl = `http://${host}:${port}`;

    const application = await prisma.$queryRaw`
        SELECT applications.*, concat(foreigners.first_name, ' ', foreigners.last_name) as full_name, foreigners.registration_id, settings.name as nationality,
        sponsors.sponsor_name as sponsor_name,
        foreigners.registration_id as passport_number,
        applications.amount as amount,
        concat('base_url', foreigners.image) as photoUrl
        FROM applications
        JOIN foreigners ON applications.foreign_id = foreigners.id
        join sponsors on foreigners.sponser_id = sponsors.id
        join settings on foreigners.nationality = settings.id and settings.dropdown_type = 'nationalities'
        order by applications.created_at desc
    `;

    // Transform results to add base URL
    const transformedApplications = application.map(app => ({
      ...app,
      photoUrl: `${baseUrl}/${app.photoUrl.replace('base_url', '')}` // Clean path here
    }));


    return res.status(200).json(transformedApplications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const ApproveApplication = async (req, res) => {
  try {

    const result = await prisma.$transaction(async (tx) => {
      const app = await tx.applications.update({
        where: { id: parseInt(req.body.id) },
        data: { status: req.body.status }
      });

      await tx.$queryRaw`
        INSERT INTO application_statuses (application_id, status, created_by, created_at)
        VALUES (${app.id}, '${req.body.status}', ${req.user.id}, ${new Date()})
      `;

      return app;
    });


    return res.status(200).json("Application approved successfully");
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json("Internal server error");
  }


}


const payApplication = async (req, res) => {
  try {
    const { id, payment_info: paymentInfo = {} } = req.body || {};

    if (!id || !paymentInfo.receiptNumber || !paymentInfo.paymentType) {
      return res.status(400).json({
        error: "id, receiptNumber, and paymentType are required fields.",
      });
    }

    // joi.object({
    //   receiptNumber: joi.string().required(),
    //   paymentType: joi.string().required(),
    //   accountSentTo: joi.string().required(),
    //   amount: joi.number().required(),
    //   currency: joi.string().required(),
    //   paymentDate: joi.date().required(),
    //   bankName: joi.string().required(),
    // });

    // const { error } = schema.validate(paymentInfo);

    // if (error) {
    //   return res.status(400).json({ error: error.message });
    // }


    let payment = await prisma.$queryRaw`
        SELECT *
        FROM payments
        where application_id = ${parseInt(id)}
    `;

    if (payment.length > 0) {
      return res.status(500).json("Payment already exists for this application");
    }


    const {
      receiptNumber,
      paymentType,
      accountSentTo,
      amount,
      currency,
      paymentDate,
      bankName,
      transactionId,
      paymentMethod,
      paidBy,
      notes,
    } = paymentInfo;

    await prisma.$transaction(async (tx) => {
      await tx.payments.create({
        data: {
          application_id: parseInt(id),
          receipt_number: receiptNumber,
          payment_date: paymentDate ? new Date(paymentDate) : null,
          payment_type: paymentType,
          payment_method: paymentMethod || null,
          amount: amount !== undefined ? String(amount) : null,
          currency: currency || null,
          paid_by: paidBy || null,
          account_sent_to: accountSentTo || null,
          bank_name: bankName || null,
          transcion_id: transactionId || null,
          notes: notes || null,
          created_by: parseInt(req.user?.id || 1),
          created_at: new Date(),
        },
      });

      await tx.applications.update({
        where: { id: parseInt(id) },
        data: {
          status: "payment_verified",
          is_paid: 1,
          updated_at: new Date(),
        },
      });

      await tx.$queryRaw`
        INSERT INTO application_statuses (application_id, status, created_by, created_at)
        VALUES (${parseInt(id)}, 'payment_verified', ${parseInt(req.user?.id || 1)}, ${new Date()})
      `;
    });

    return res.status(200).json("Application paid successfully");
  } catch (error) {
    console.error("Error paying application:", error);
    return res.status(500).json("Internal server error");
  }
}


const profile = async (req, res) => {
  try {
    const { id } = req.body;
    const applicationArr = await prisma.$queryRaw`
        SELECT applications.*, concat(foreigners.first_name, ' ', foreigners.last_name) as full_name, foreigners.registration_id, settings.name as nationality,
        sponsors.sponsor_name as sponsor_name,
        foreigners.registration_id as passport_number,
        foreigners.occupation as occupation,
        foreigners.marital_status as marital_status,
        foreigners.email as email,
        foreigners.gender as gender,
        foreigners.current_address as address,
        foreigners.fullname_somaliland as fullname_somaliland,
        foreigners.relationship_somaliland as relationship_somaliland,
        foreigners.contactnumber_somaliland as contactnumber_somaliland,
        foreigners.address_somaliland as address_somaliland,
        CONVERT(VARCHAR(10), foreigners.dob, 120) as dob,
        foreigners.number as phone
        FROM applications
        JOIN foreigners ON applications.foreign_id = foreigners.id
        join sponsors on foreigners.sponser_id = sponsors.id
        join settings on foreigners.nationality = settings.id and settings.dropdown_type = 'nationalities'
        where applications.id = ${parseInt(id)}
    `;
    const application = Array.isArray(applicationArr) && applicationArr.length > 0 ? applicationArr[0] : null;
    return res.status(200).json(application);
  } catch (error) {
    console.error("Error fetching application profile:", error);
    return res.status(500).json("Internal server error");
  }
};



const getSponsers = async (req, res) => {
  try {
    const sponsers = await prisma.$queryRaw`
        SELECT sponsors.id,sponsor_name FROM foreigners
        join sponsors on foreigners.sponser_id = sponsors.id
        where foreigners.id = ${parseInt(req.body.id)}
    `;
    return res.status(200).json(sponsers);
  } catch (error) {
    console.error("Error fetching sponsers:", error);
    return res.status(500).json("Internal server error");
  }
};


const getSingle = async (req, res) => {
  try {
    const { id } = req.body;
    const foreigner = await prisma.$queryRaw`
        SELECT foreigners.*
        FROM foreigners
        where foreigners.id = ${parseInt(id)}
    `;
    return res.status(200).json(foreigner[0] || []);
  } catch (error) {
    console.error("Error fetching foreigner:", error);
    return res.status(500).json("Internal server error");
  }
};



const ProfileForeigner = async (req, res) => {
  try {
    const { id } = req.body;
    const foreigner = await prisma.$queryRaw`
        SELECT foreigners.*, settings.name as nationality, sponsors.sponsor_name as sponsor_name,
        entry_point.name as entry_point_name
        FROM foreigners
        join sponsors on foreigners.sponser_id = sponsors.id
        left JOIN settings on foreigners.nationality = settings.id
        left JOIN settings as entry_point on foreigners.entry_point = entry_point.id
        where foreigners.id = ${parseInt(id)}
    `;

    const documents = await prisma.$queryRaw`
        SELECT *
        FROM foreigner_documents
        where foreign_id = ${parseInt(id)}
    `;


    return res.status(200).json(foreigner[0] || []);
  } catch (error) {
    console.error("Error fetching foreigner:", error);
    return res.status(500).json("Internal server error");
  }
}


const getDocumentsForeigner = async (req, res) => {
  try {
    const { id } = req.body;
    const documents = await prisma.$queryRaw`
        SELECT applications.*
        FROM applications
        where applications.foreign_id = ${parseInt(id)}
    `;
    return res.status(200).json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return res.status(500).json("Internal server error");
  }
}




export {
  create,
  index,
  search,
  applicationForeigner,
  getApplication,
  ApproveApplication,
  payApplication,
  profile,
  getSponsers,
  getSingle,
  ProfileForeigner,
  getDocumentsForeigner
};