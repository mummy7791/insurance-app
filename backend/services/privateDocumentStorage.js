const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

const configured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const ensureConfigured = () => {
  if (!configured()) throw new Error("Private document storage is not configured");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const uploadPrivateDocument = ({ buffer, mimeType, customerId, documentType }) =>
  new Promise((resolve, reject) => {
    try {
      ensureConfigured();
      const safeType = String(documentType || "document").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
      const publicId = `kyc/${customerId}/${Date.now()}-${safeType}`;
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "raw",
          type: "authenticated",
          overwrite: false,
          tags: ["securelife-kyc"],
        },
        (error, result) => error ? reject(error) : resolve(result)
      );
      streamifier.createReadStream(buffer).pipe(stream);
    } catch (error) {
      reject(error);
    }
  });

const signedDownloadUrl = (publicId) => {
  ensureConfigured();
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
};

const deletePrivateDocument = async (publicId) => {
  if (!publicId) return;
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
};

module.exports = { configured, uploadPrivateDocument, signedDownloadUrl, deletePrivateDocument };
