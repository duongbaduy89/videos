import { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return alert(error.message);

    alert("Đăng nhập thành công!");
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Đăng nhập</h1>

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

      <button onClick={login} className="bg-blue-600 px-4 py-2 rounded">
        Đăng nhập
      </button>
    </div>
  );
}
