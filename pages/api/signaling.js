import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const objectBucket = process.env.ZENGREET_USERS_BUCKET;
const bucketRegion = process.env.ZENGREET_USERS_BUCKET_REGION;
const s3Client = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: process.env.ZENGREET_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.ZENGREET_AWS_SECRET_ACCESS_KEY,
  }
});

export default async function handler(req, res) {
   
    if (req.method === 'POST') {
    // const objectKey = `${orderId}/${uuid()}.png`;
    const objectKey = `grabby`;
    
    const user = await s3Client.send(new PutObjectCommand({
      Bucket: objectBucket,
      Key: objectKey,
    }));
    return res.status(201).json(user)
    }

    if (req.method === 'GET') {
    
      const data = await s3Client.send(new GetObjectCommand({
        Bucket: objectBucket,
        Key: "testuser.json",
      }));

      const dataBody = new Response(data.Body);
      const resBf = await dataBody.buffer();
      const resStr = resBf.toString();

      return res.status(200).json(resStr)
    
    }

}
  
