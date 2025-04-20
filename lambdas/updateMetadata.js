import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client();

export const handler = async (event) => {
    try {
        // Get the bucket name from the event
        const bucketName = event.Records[0].s3.bucket.name;
        
        // List all MP3 files in the bucket root
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName
        });
        
        const listData = await s3Client.send(listCommand);
        const mp3Files = listData.Contents.filter(item => item.Key.endsWith('.mp3'));
        
        // Create metadata array
        const metadata = mp3Files.map(file => ({
            file: file.Key,
            name: file.Key.replace('.mp3', ''),
            lastModified: file.LastModified,
            size: file.Size
        }));

        // Sort by last modified date
        metadata.sort((a, b) => b.lastModified - a.lastModified);

        // Upload metadata file
        const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'music_metadata.json',
            Body: JSON.stringify(metadata),
            ContentType: 'application/json'
        });
        
        await s3Client.send(putCommand);

        return {
            statusCode: 200,
            body: JSON.stringify('Metadata file updated successfully')
        };
    } catch (error) {
        console.error('Error updating metadata:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Error updating metadata file')
        };
    }
}; 