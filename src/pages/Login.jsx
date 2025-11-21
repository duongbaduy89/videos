import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const passwordLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      window.location.href = "/"; // 🔥 redirect về trang chủ
    }
  };

  return (
    <div className="login-box" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Đăng nhập</h2>

      <input
        placeholder="Email..."
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
        placeholder="Mật khẩu..."
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
        onClick={passwordLogin}
        style={{
          width: "100%",
          padding: 12,
          background: "#0a84ff",
          color: "white",
          border: "none",
          borderRadius: 8,
        }}
      >
        Đăng nhập
      </button>

      <p style={{ marginTop: 20 }}>
        Chưa có tài khoản?{" "}
        <a href="/signup" style={{ color: "#0a84ff" }}>
          Đăng ký
        </a>
      </p>
    </div>
  );
}
