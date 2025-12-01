import { BlobServiceClient } from "@azure/storage-blob";
import { config } from "dotenv";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
// Ensure Node has a Web Crypto polyfill available for Azure SDK (some runtimes expect globalThis.crypto)
import { webcrypto as nodeCrypto } from "crypto";
if (typeof globalThis.crypto === "undefined") {
  // Attach Node's Web Crypto to globalThis so browser-targeted libs work.
  // eslint-disable-next-line no-undef
  globalThis.crypto = nodeCrypto;
}

config();

const provider = process.env.STORAGE_PROVIDER || "azure"; // 'azure' or 'local'

// MinIO removed — Azure Blob Storage is the primary supported provider now.

let blobServiceClient;
if (provider === "azure") {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.log("AZURE_STORAGE_CONNECTION_STRING not set - azure storage disabled");
  } else {
    try {
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerName = process.env.AZURE_STORAGE_CONTAINER || "chatapp";
      (async () => {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const exists = await containerClient.exists();
          if (!exists) {
            await containerClient.create();
            console.log("Created Azure blob container:", containerName);
          }
        } catch (err) {
          console.log("Azure container check error:", err.message || err);
        }
      })();
    } catch (err) {
      console.log("Azure BlobServiceClient init error:", err.message || err);
      blobServiceClient = null;
    }
  }
}

// MinIO helper removed.

async function uploadToAzureFromDataUrl(dataUrl) {
  if (!blobServiceClient) throw new Error("Azure storage not configured");
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid data URL");
  const mime = matches[1];
  const b64 = matches[2];
  const buffer = Buffer.from(b64, "base64");

  const ext = mime.split("/").pop();
  const name = `${uuidv4()}.${ext}`;
  const containerName = process.env.AZURE_STORAGE_CONTAINER || "chatapp";

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(name);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mime },
  });

  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME; // optional
  if (account) {
    return `https://${account}.blob.core.windows.net/${containerName}/${name}`;
  }
  try {
    const baseUrl = blobServiceClient.url || '';
    return `${baseUrl.replace(/\/$/, '')}/${containerName}/${name}`;
  } catch (err) {
    return `${containerName}/${name}`;
  }
}

async function uploadImage(profilePic) {
  // MinIO support removed. Use `STORAGE_PROVIDER=azure` or `STORAGE_PROVIDER=local`.

  if (provider === "azure") {
    // support data URLs
    if (typeof profilePic === "string" && profilePic.startsWith("data:")) {
      return await uploadToAzureFromDataUrl(profilePic);
    }
    // support remote URL uploads: fetch and upload
    if (typeof profilePic === "string" && (profilePic.startsWith("http://") || profilePic.startsWith("https://"))) {
      const res = await fetch(profilePic);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = res.headers.get("content-type") || "application/octet-stream";
      const ext = mime.split("/").pop();
      const name = `${uuidv4()}.${ext}`;
      const containerName = process.env.AZURE_STORAGE_CONTAINER || "chatapp";
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(name);
      await blockBlobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mime } });
      const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      if (account) return `https://${account}.blob.core.windows.net/${containerName}/${name}`;
      const baseUrl = blobServiceClient.url || "";
      return `${baseUrl.replace(/\/$/, "")}/${containerName}/${name}`;
    }
    throw new Error("Unsupported profilePic format for Azure storage");
  }

  // local fallback: save in ./uploads and return a path served by nginx (you'd need to serve it)
  if (provider === "local") {
    if (typeof profilePic === "string" && profilePic.startsWith("data:")) {
      const matches = profilePic.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new Error("Invalid data URL");
      const mime = matches[1];
      const b64 = matches[2];
      const buffer = Buffer.from(b64, "base64");
      const ext = mime.split("/").pop();
      const name = `${uuidv4()}.${ext}`;
      const uploadsDir = process.env.LOCAL_UPLOADS_DIR || "./uploads";
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = `${uploadsDir}/${name}`;
      fs.writeFileSync(filePath, buffer);
      return filePath; // note: you'll need to serve this route from nginx if you want HTTP URL
    }
    throw new Error("Unsupported profilePic format for local storage");
  }

  throw new Error("No storage provider available");
}

export default { uploadImage };
