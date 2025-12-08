// src/components/PhotoPost.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import "../styles/PhotoPost.css";

export default function PhotoPost({ item }) {
  const images = Array.isArray(item.url) ? item.url : [];

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // Vuốt trái/phải mượt
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (index < images.length - 1) setIndex(index + 1);
    },
    onSwipedRight: () => {
      if (index > 0) setIndex(index - 1);
    },
    trackTouch: true,
    trackMouse: false
  });

  // Eff kéo xuống đóng
  const [dragY, setDragY] = useState(0);

  const handleDrag = (_, info) => {
    setDragY(info.point.y);
  };

  const handleDragEnd = () => {
    if (dragY > 160) setOpen(false); // Vuốt mạnh xuống để đóng
    setDragY(0);
  };

  return (
    <div className="photo-container">

      {/* GRID ẢNH */}
      <div className={`photo-grid ${images.length >= 2 ? "multi" : "single"}`}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            className="photo-thumb"
            onClick=
