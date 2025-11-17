import { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1️⃣ ĐĂNG KÝ USER
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    // ⭐ 2️⃣ THÊM DÒNG LOG NÀY NGAY TẠI ĐÂY ⭐
    console.log("Signup result → ", data, error);

    // 3️⃣ NẾU SIGNUP LỖI → DỪNG TẠI ĐÂY
    if (error) {
      alert("Signup error: " + error.message);
      setLoading(false);
      return;
    }

    // 4️⃣ NẾU SIGNUP KHÔNG TRẢ VỀ user → lỗi supabase config
    if (!data.user) {
      alert("Signup failed — data.user is null");
      setLoading(false);
      return;
    }

    // 5️⃣ CHÈN PROFILE VÀO BẢNG profiles
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      username: email,
      role: "user",
    });

    if (profileError) {
      alert("Insert profile error: " + profileError.message);
    } else {
      alert("Signup successful!");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSignup}>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button disabled={loading}>
        {loading ? "Loading..." : "Sign up"}
      </button>
    </form>
  );
}
