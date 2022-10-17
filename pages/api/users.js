import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from 'uuid';

const objectBucket = process.env.ZENGREET_USERS_BUCKET;
const bucketRegion = process.env.ZENGREET_USERS_BUCKET_REGION;
const s3Client = new S3Client({
  region: "us-west-1",
  credentials: {
    accessKeyId: "AKIAWZJQJI5O6KYEPUKP",
    secretAccessKey: "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",
  }
});
// process.env.ZENGREET_AWS_ACCESS


export default async function handler(req, res) {

  if (req.method === "GET") {
    try {
      const data = await s3Client.send(new GetObjectCommand({
        Bucket: objectBucket,
        Key: "user2/currentPartner/video-offer/user1",
      }));

      console.log("data from get ", data)
      const stream = data.Body

      const buffer = await new Promise((resolve, reject) => {
        const chunks = []
        stream.on('data', chunk => chunks.push(chunk))
        stream.once('end', () => resolve(Buffer.concat(chunks)))
        stream.once('error', reject)
      })
      const bufferToString = buffer.toString();

      console.log("buffer ", bufferToString)
      return res.status(200).json(bufferToString)
    } catch (error) {
      console.log("error ", error)
      return res.status(500).json({ error: error })
    }

  }

  if (req.method === "PUT") {

    console.log("this is from users PUT")
    const putBody = JSON.stringify({
      "yobodykey": "yobody field"
    })
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: "zengreet.users",
        Key: "BUTIWILLNOTDOTHAT/hella",
        Body: putBody,
      }));
      return res.status(201).json({ message: 'File processed' })
    } catch (error) {
      return res.status(500).json({ error: error })
    }
  }

  if (req.method === "DELETE") {

    console.log("this is from users PUT")
    const putBody = JSON.stringify({
      "yobodykey": "yobody field"
    })
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: "zengreet.users",
        Key: "BUTIWILLNOTDOTHAT/hella",
        Body: putBody,
      }));
      return res.status(201).json({ message: 'File processed' })
    } catch (error) {
      return res.status(500).json({ error: error })
    }
  }
}

// NEXT Steps
// implement webrtc logic in app