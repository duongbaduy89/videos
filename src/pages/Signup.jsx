import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "./Auth.css";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async () => {
    setError("");

    if (!username.trim()) {
      return setError("Bạn phải nhập username!");
    }
    if (password !== confirm) {
      return setError("Mật khẩu không khớp!");
    }

    // Đăng ký tài khoản Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const user = data.user;
    if (user) {
      // Lưu username vào bảng profiles
      await supabase.from("profiles").upsert({
        id: user.id,
        username: username,
      });
    }

    alert("Đăng ký thành công! Hãy kiểm tra email để xác nhận.");
    navigate("/login");
  };

  return (
    <div className="page-container auth-center">
      <div className="auth-box">
        <h2>Đăng ký</h2>

        {error && <p className="auth-error">{error}</p>}

        <input
          className="auth-input"
          type="text"
          placeholder="Username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="auth-input"
          type="email"
          placeholder="Email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Mật khẩu..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Nhập lại mật khẩu..."
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button className="auth-btn" onClick={handleSignup}>
          Đăng ký
        </button>
      </div>
    </div>
  );
}
