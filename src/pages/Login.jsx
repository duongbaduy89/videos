import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const sendMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      alert(error.message);
    } else {
      alert("Đã gửi Magic Link! Hãy kiểm tra email.");
      window.location.href = "/"; // Redirect sau khi gửi link
    }
  };

  const passwordLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      window.location.href = "/"; // 🔥 Redirect sau khi đăng nhập thành công
    }
  };

  return (
    <div className="login-box" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Đăng nhập</h2>

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
        onClick={passwordLogin}
        style={{
          width: "100%",
          padding: 12,
          background: "#0a84ff",
          color: "white",
          border: "none",
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        Đăng nhập
      </button>

      <button
        className="btn2"
        onClick={sendMagicLink}
        style={{
          width: "100%",
          padding: 12,
          background: "#444",
          color: "white",
          border: "none",
          borderRadius: 8,
        }}
      >
        Gửi Magic Link
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
