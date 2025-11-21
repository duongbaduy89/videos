import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const signup = async () => {
    if (!username.trim()) {
      alert("Vui lòng nhập username");
      return;
    }

    // 1) Đăng ký Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    // 2) Lấy userID sau đăng ký
    const userId = data?.user?.id;
    if (!userId) {
      alert("Không lấy được user ID");
      return;
    }

    // 3) Update bảng profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", userId);

    if (profileErr) {
      alert("Lỗi update profile: " + profileErr.message);
      return;
    }

    alert("Đăng ký thành công! Hãy đăng nhập.");
    window.location.href = "/login";
  };

  return (
    <div className="login-box" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Tạo tài khoản</h2>

      <input
        placeholder="Username..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 10,
          borderRadius: 8,
        }}
      />

      <input
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
