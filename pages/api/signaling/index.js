import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, ListObjectsCommand } from "@aws-sdk/client-s3";

const objectBucket = process.env.ZENGREET_USERS_BUCKET;
const bucketRegion = process.env.ZENGREET_USERS_BUCKET_REGION;
const s3Client = new S3Client({
  region: "us-west-1",
  credentials: {
    accessKeyId: process.env.ZENGREET_AWS_ACCESS,
    secretAccessKey: process.env.ZENGREET_AWS_SECRET,
  }
});

export default async function handler(req, res) {
  const msg = req.body

  console.log("this is message target ", msg)

  if (req.method === 'POST') {
    let objectKey;
    switch (msg.type) {
      case "video-offer":
        objectKey = `${msg.target}/currentPartner`;
        break;
      case "video-answer":
        objectKey = `${msg.target}/currentPartner`;
        break;
      case "new-ice-candidate":
        objectKey = `${msg.target}/currentPartner/new-ice-candidate`;

    }

    const s3Body = JSON.stringify(msg)



    try {
      const user = await s3Client.send(new PutObjectCommand({
        Bucket: "zengreet.users",
        Key: objectKey,
        Body: s3Body
      }));
      console.log(" user ", user)
      return res.status(201).json(user)
    } catch (error) {
      return res.status(500).json({ error: error })
    }
  }


  if (req.method === 'GET') {

    const data = await s3Client.send(new GetObjectCommand({
      Bucket: objectBucket,
      Key: req.query.key
    }));

    console.log("req.query.key ", req.query.key)


    const dataBody = new Response(data.Body);
    const resBf = await dataBody.buffer();
    const resStr = resBf.toString();
    console.log("data from get s3 ", resStr)

    return res.status(200).json(resStr)

  }

  if (req.method === "DELETE") {

    try {
      const bucketParams = { Bucket: "zengreet.users" };

      const data = await s3Client.send(new ListObjectsCommand(bucketParams));
      const deletingParams = {
        Bucket: "zengreet.users",
        Delete: {
          Objects: data.Contents.map(object => {
            return {
              Bucket: "zengreet.users",
              Key: object.Key,
              VersionId: 'null',
            }
          })
        }
      }
      const deleting = await s3Client.send(new DeleteObjectsCommand(deletingParams));

      console.log("Delete result", deleting);

      return res.status(201).json({ message: 'All dem tings deleted' })
    } catch (error) {
      return res.status(500).json({ error: error })
    }
  }

}

