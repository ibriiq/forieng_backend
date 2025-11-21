import path from "path";
import mime from "mime-types";
import prisma from "../lib/prisma.js";
import Joi from "joi";

const buildDocumentPayload = (files = []) =>
  files
    .filter((file) => file)
    .map((file) => {
      const fallbackPath =
        (file.destination && file.filename
          ? path.join(file.destination, file.filename)
          : file.filename) || "";

      const absolutePath = file.path || fallbackPath;
      const normalizedPath = absolutePath
        ? path.relative(process.cwd(), absolutePath).replace(/\\/g, "/")
        : "";

      const detectedMime =
        file.mimetype ||
        mime.lookup(file.originalname || "") ||
        mime.lookup(fallbackPath || "") ||
        "application/octet-stream";

      return {
        fileName: file.originalname ?? file.filename ?? "document",
        filePath: normalizedPath,
        fileSizeKb: Math.max(1, Math.ceil(((file.size ?? 1) || 1) / 1024)),
        fileType: detectedMime,
        fieldname: file.fieldname,
      };
    })
    .filter((doc) => doc.filePath);

const sponsorSchema = Joi.object({
  sponsorName: Joi.string().trim().min(3).max(255).required(),
  companyName: Joi.string().allow("", null).max(255),
  type: Joi.string().required(),
  email: Joi.string().trim().lowercase().email().required(),
  phone: Joi.string().trim().min(5).max(50).required(),
  emergencyPhone: Joi.string().trim().min(5).max(50).required(),
  nationalId: Joi.string().trim().min(2).max(100).required(),
  licenseNumber: Joi.string().allow("", null).max(255),
  licenseType: Joi.string().allow("", null).max(255),
  licenseMinistry: Joi.string().allow("", null).max(255),
  address: Joi.string().trim().max(2000).required(),
  region: Joi.string().trim().max(100).required(),
  maxCapacity: Joi.number().integer().min(1).max(1000).required(),
  status: Joi.string().trim().max(50).default("Pending"),
  sponsoredCount: Joi.number().integer().min(0).default(0),
  registrationDate: Joi.date().iso().required(),
  documents: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().trim().required(),
        filePath: Joi.string().trim().required(),
        fileSizeKb: Joi.number().integer().positive().required(),
        fileType: Joi.string().trim().required(),
        fieldname: Joi.string().trim().required(),
      })
    )
    .default([]),
  responsibilityScore: Joi.number().integer().min(0).max(100).required(),
  nationalIdDocument: Joi.string().allow("", null),
  licenseDocument: Joi.string().allow("", null),
  id: Joi.any().strip(), // client-generated IDs are ignored on create
});

const create = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      documents: buildDocumentPayload(req.files),
    };

    const { error, value } = sponsorSchema.validate(payload, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      return res.status(400).json({ error: error.details });
    }

    const sponsorData = {
      sponsor_name: value.sponsorName,
      national_id_number: value.nationalId,
      sponsor_type: value.type,
      email_address: value.email,
      primary_phone_number: value.phone,
      emergency_contact_number: value.emergencyPhone,
      complete_address: value.address,
      region: value.region,
      maximum_sponsorship_capacity: value.maxCapacity,
      company_name: value.companyName,
      license_number: value.licenseNumber,
      license_type: value.licenseType,
      license_ministry: value.licenseMinistry
      // Optional fields (companyName, status, etc.) can be persisted
      // once dedicated columns are available in the schema.
    };
    
    const documents = value.documents ?? [];


    console.log(documents);

    if (req.body.id) {

      const createdSponsor = await prisma.$transaction(async (tx) => {
        const sponsor = await tx.sponsors.update({
          where: { id: parseInt(req.body.id) },
          data: sponsorData,
        });

        if (documents.length) {
          await tx.sponsor_documents.deleteMany({ where: { sponsor_id: parseInt(req.body.id) } });
          await tx.sponsor_documents.createMany({
            data: documents.map((doc) => ({
              sponsor_id: sponsor.id,
              file_name: doc.fileName,
              file_path: doc.filePath,
              file_size_kb: doc.fileSizeKb,
              file_type: doc.fileType,
              type: doc.fieldname,
            })),
          });
        }

        return sponsor;
      });

    }
    else {

      const createdSponsor = await prisma.$transaction(async (tx) => {
        const sponsor = await tx.sponsors.create({
          data: sponsorData,
        });

        if (documents.length) {
          await tx.sponsor_documents.createMany({
            data: documents.map((doc) => ({
              sponsor_id: sponsor.id,
              file_name: doc.fileName,
              file_path: doc.filePath,
              file_size_kb: doc.fileSizeKb,
              file_type: doc.fileType,
              type: doc.fieldname,
            })),
          });
        }

        return sponsor;
      });
    }

    return res.status(200).json(req.body.id ? "Sponsor updated successfully" : "Sponsor created successfully");
  } catch (error) {
    console.error("Error creating sponsor:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



const index = async (req, res) => {
  try {
    const sponsors = await prisma.$queryRaw`
     SELECT 
    sponsors.*, 
    COUNT(foreigners.id) AS sponsored_count
FROM sponsors
LEFT JOIN foreigners ON sponsors.id = foreigners.sponser_id
GROUP BY 
    sponsors.id,
    sponsors.sponsor_name,
    sponsors.national_id_number,
    sponsors.sponsor_type,
    sponsors.email_address,
    sponsors.primary_phone_number,
    sponsors.emergency_contact_number,
    sponsors.complete_address,
    sponsors.region,
    sponsors.maximum_sponsorship_capacity,
    sponsors.created_at,
    sponsors.updated_at,
    sponsors.company_name,
    sponsors.license_number,
    sponsors.license_type,
    sponsors.license_ministry,
    sponsors.status,
    sponsors.responsibility_score
    `;
    return res.status(200).json(sponsors);
  } catch (error) {
    console.error("Error getting sponsors:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



const getSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const sponsor = await prisma.sponsors.findUnique({ where: { id } });
    return res.status(200).json(sponsor);
  } catch (error) {
    console.error("Error getting sponsor:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await prisma.sponsors.update({ where: { id: parseInt(id) }, data: { status } });
    return res.status(200).json("Status updated successfully");
  } catch (error) {
    console.error("Error updating status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const destroy = async (req, res) => {
  try {
    const { id } = req.body;

    const foreigners = await prisma.foreigners.findMany({ where: { sponser_id: parseInt(id) } });
    if (foreigners.length > 0) {
      return res.status(400).json("Sponsor has foreigners and cannot be deleted");
    }

    await prisma.sponsor_documents.deleteMany({ where: { sponsor_id: parseInt(id) } });
    await prisma.sponsors.delete({ where: { id: parseInt(id) } });
    return res.status(200).json("Sponsor deleted successfully");
  } catch (error) {
    console.error("Error deleting sponsor:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



export const getSponsorDocuments = async (req, res) => {
  try {
    const { sponsor_id } = req.body;

    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3000;
    const baseUrl = `http://${host}:${port}`;

    const documents = await prisma.$queryRaw`
      SELECT sponsor_documents.*,REPLACE(REPLACE(sponsor_documents.type, '[', ''), ']', '') AS type
      FROM sponsor_documents
      where sponsor_id = ${sponsor_id}
    `;

    const transformedDocuments = documents.map(doc => ({
      ...doc,
      file_path: `${baseUrl}/${doc.file_path}`
    }));


    return res.status(200).json(transformedDocuments);

  } catch (error) {
    console.error("Error getting sponsor documents:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const getSponsorSponsoredBy = async (req, res) => {
  try {
    const { sponsor_id } = req.body;
    const sponsoredBy = await prisma.$queryRaw`
      SELECT sponsors.id,concat(foreigners.first_name, ' ', foreigners.last_name) as fullName, foreigners.registration_id, settings.name as nationality,
      foreigners.gender,occupation.name as occupation,
    DATEDIFF(YEAR, CAST(foreigners.dob AS DATE), GETDATE()) AS age,
    foreigners.created_at

      
      
      FROM foreigners
      join sponsors on foreigners.sponser_id = sponsors.id
      join settings on foreigners.nationality = settings.id and settings.dropdown_type = 'nationalities'
      join settings as occupation on foreigners.occupation = occupation.id and occupation.dropdown_type = 'occupations'
      where foreigners.sponser_id = ${parseInt(sponsor_id)}
    `;

    // {
    //   id: "F001",
    //   fullName: "Ahmed Hassan Ali",
    //   nationality: "Ethiopian",
    //   passportNumber: "ET1234567",
    //   status: "Active",
    //   registrationDate: "2023-07-15",
    //   expiryDate: "2024-07-15",
    //   sponsorId: "1",
    //   occupation: "Construction Worker",
    //   age: 28,
    //   gender: "Male",
    // },


    return res.status(200).json(sponsoredBy);
  } catch (error) {
    console.error("Error getting sponsor sponsored by:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};




export { create, index, getSingle, updateStatus, destroy };