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
      };
    })
    .filter((doc) => doc.filePath);

const sponsorSchema = Joi.object({
  sponsorName: Joi.string().trim().min(10).max(255).required(),
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
          })),
        });
      }

      return sponsor;
    });

    return res.status(200).json("Sponsor created successfully");
  } catch (error) {
    console.error("Error creating sponsor:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



const index = async (req, res) => {
  try {
    const sponsors = await prisma.sponsors.findMany();
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



export { create, index, getSingle, updateStatus };