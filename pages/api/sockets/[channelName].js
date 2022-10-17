import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand } from "@aws-sdk/client-s3";

const bucket = "zengreet.users";
const s3Client = new S3Client({
    region: "us-west-1",
    credentials: {
        accessKeyId: process.env.ZENGREET_AWS_ACCESS,
        secretAccessKey: process.env.ZENGREET_AWS_SECRET,
    }
});

export default async function handler(req, res) {
    const { channelName } = req.query;

    if (req.method === "POST") {
        const s3Body = JSON.stringify(req.body)

        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: `${channelName}/message-${req.body.timestamp}.json`,
                Body: s3Body
            }));

            return res.status(201).send()
        } catch (error) {
            return res.status(500).json({ error: error })
        }
    }

    if (req.method === 'GET') {
        const data = await s3Client.send(new ListObjectsCommand({
            Bucket: bucket,
            Prefix: channelName,
        }));

        if (data.Contents) {
            const newMessages = data.Contents
                .filter((object) => {
                    const timestamp = parseInt(object.Key
                        .replace(`${channelName}/`, '')
                        .replace('.json', '')
                        .replace('message-', ''))

                    const lastSeen = parseInt(req.headers['x-last-seen']);

                    return lastSeen < timestamp;
                });

            const messageArray = [];
            console.log(newMessages)
            for (const message of newMessages) {
                const objectData = await s3Client.send(new GetObjectCommand({
                    Bucket: bucket,
                    Key: message.Key,
                }));
                const dataBody = new Response(objectData.Body);
                const resBf = await dataBody.buffer();
                const resStr = resBf.toString();

                messageArray.push(JSON.parse(resStr));
            }

            return res.status(200).json(messageArray)
        } else {
            return res.status(200).json([])
        }

    }
}