export async function uploadToR2(file) {
  const r2Url = import.meta.env.VITE_R2_BUCKET_URL;
  const accessKey = import.meta.env.VITE_R2_ACCESS_KEY_ID;
  const secretKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;

  const uploadUrl = `${r2Url}/${file.name}`;

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Authorization": "AWS " + btoa(`${accessKey}:${secretKey}`),
    },
    body: file,
  });

  if (!res.ok) throw new Error("Upload lên Cloudflare R2 thất bại");

  return uploadUrl;
}
