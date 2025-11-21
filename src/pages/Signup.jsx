import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Đăng ký thành công!");
      window.location.href = "/"; // 🔥 Redirect sau khi đăng ký xong
    }
  };

  return (
    <div className="login-box" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Tạo tài khoản</h2>

      <input
        className="input"
        placeholder="Nhập email..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 10,
          borderRadius: 8,
        }}
      />

      <input
        className="input"
        placeholder="Mật khẩu"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 20,
          borderRadius: 8,
        }}
      />

      <button
        className="btn"
        onClick={signup}
        style={{
          width: "100%",
          padding: 12,
          background: "#0a84ff",
          color: "white",
          border: "none",
          borderRadius: 8,
        }}
      >
        Đăng ký
      </button>

      <p style={{ marginTop: 20 }}>
        Đã có tài khoản?{" "}
        <a href="/login" style={{ color: "#0a84ff" }}>
          Đăng nhập
        </a>
      </p>
    </div>
  );
}
