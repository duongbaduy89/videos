export async function uploadToSupabaseBucket(client, bucket, file) {
  const fileName = `${Date.now()}-${file.name}`;

  const { data, error } = await client.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) throw error;

  const { data: publicUrl } = client.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}
