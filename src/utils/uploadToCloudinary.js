export async function uploadToCloudinary(file) {
  const CLOUD_NAME = "dy2nxrviw";
  const UPLOAD_PRESET = "unsigned_upload"; // đổi theo preset của bạn

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "photos");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  return data.secure_url; // url ảnh trả về
}
