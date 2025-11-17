import { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return alert(error.message);

    // Create profile
    await supabase.from("profiles").insert({
      id: data.user.id,
      username: email.split("@")[0],
    });

    alert("Đăng ký thành công!");
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Đăng ký</h1>

      <input
        className="block bg-gray-700 p-2 mb-2"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="block bg-gray-700 p-2 mb-2"
        type="password"
        placeholder="Mật khẩu"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={signup} className="bg-green-600 px-4 py-2 rounded">
        Đăng ký
      </button>
    </div>
  );
}
