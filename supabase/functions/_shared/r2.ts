import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";

interface R2Resources {
  client: S3Client;
  bucket: string;
}

function getR2(): R2Resources {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Missing R2 configuration: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET",
    );
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: new FetchHttpHandler(),
    }),
    bucket,
  };
}

export function createPresignedUploadUrl(
  key: string,
  contentType?: string,
  expiresInSeconds = 15 * 60,
): Promise<string> {
  const { client, bucket } = getR2();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(contentType ? { ContentType: contentType } : {}),
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const { client, bucket } = getR2();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}