// src/components/VideoFeed.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { useAuth } from "../context/AuthContext";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import SearchPopup from "./SearchPopup";
import { supabase } from "../supabaseClient";
import "../styles/VideoFeed.css";

export default function VideoFeed({ videos = [] }) {
  const { user } = useAuth();

  const [tab, setTab] = useState("foryou");
  const [list, setList] = useState(videos || []);
  const [index, setIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchQueryRef = useRef("");

  const [showComments, setShowComments] = useState(false);

  // ----------------- Initialize -----------------
  useEffect(() => {
    if (videos?.length && list.length === 0) {
      setList(videos);
      setIndex(0);
    }
  }, [videos]);

  useEffect(() => {
    setCurrentVideo(list[index]);
  }, [index, list]);

  useEffect(() => {
    if (currentVideo?.id) loadStats();
  }, [currentVideo, user]);

  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("openSearchPopup", handler);
    return () => window.removeEventListener("openSearchPopup", handler);
  }, []);

  // ----------------- Swipe handlers -----------------
  const handlers = useSwipeable({
    onSwipedUp: () => {
      if (list.length > 1) {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * list.length);
        } while (nextIndex === index);
        setIndex(nextIndex);
      }
    },
    onSwipedDown: () => {
      if (list.length > 1) {
        let prevIndex;
        do {
          prevIndex = Math.floor(Math.random() * list.length);
        } while (prevIndex === index);
        setIndex(prevIndex);
      }
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // ----------------- Fetch helpers -----------------
  const updateList = (newList) => {
    if (!newList?.length) {
      setList([]);
      setIndex(0);
      return;
    }
    // Nếu list khác list cũ, reset index
    if (newList !== list) {
      setList(newList);
      setIndex(0);
    }
  };

  const fetchForYou = async () => {
    if (videos?.length) { updateList(videos); return; }
    const { data, error } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .order("created_at", { ascending: false });
    if (!error) updateList(data);
  };

  const fetchFollowing = async () => {
    if (!user) { updateList([]); return; }
    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const ids = (follows || []).map(x => x.following_id);
    if (!ids.length) { updateList([]); return; }
    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    updateList(data);
  };

  const fetchLiked = async () => {
    if (!user) { updateList([]); return; }
    const { data: likes } = await supabase.from("likes").select("video_id").eq("user_id", user.id);
    const ids = (likes || []).map(x => x.video_id);
    if (!ids.length) { updateList([]); return; }
    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .in("id", ids)
      .order("created_at", { ascending: false });
    updateList(data);
  };

  // ----------------- Tab effect -----------------
  useEffect(() => {
    if (tab === "foryou") fetchForYou();
    if (tab === "following") fetchFollowing();
    if (tab === "liked") fetchLiked();
  }, [tab, user]);

  // ----------------- Stats -----------------
  const loadStats = async () => {
    if (!currentVideo?.id) return;
    const vid = currentVideo.id;
    const { data: lk } = await supabase.from("likes").select("*").eq("video_id", vid);
    setLikesCount(lk?.length || 0);
    const { data: cm } = await supabase.from("comments").select("*").eq("video_id", vid);
    setCommentsCount(cm?.length || 0);

    if (user) {
      const { data: my } = await supabase.from("likes").select("*").eq("video_id", vid).eq("user_id", user.id).maybeSingle();
      setIsLiked(!!my);
      const { data: f } = await supabase.from("follows").select("*").eq("follower_id", user.id).eq("following_id", currentVideo.user_id).maybeSingle();
      setIsFollowing(!!f);
    } else {
      setIsLiked(false);
      setIsFollowing(false);
    }
  };

  const toggleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập để like");
    if (!isLiked) {
      await supabase.from("likes").insert({ video_id: currentVideo.id, user_id: user.id });
      setLikesCount(x => x + 1); setIsLiked(true);
    } else {
      await supabase.from("likes").delete().eq("video_id", currentVideo.id).eq("user_id", user.id);
      setLikesCount(x => Math.max(0, x - 1)); setIsLiked(false);
    }
  };

  const toggleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow");
    if (!isFollowing) {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: currentVideo.user_id });
      setIsFollowing(true);
    } else {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", currentVideo.user_id);
      setIsFollowing(false);
    }
  };

  // ----------------- Render -----------------
  return (
    <div className="videofeed-root" {...handlers}>

      {/* Tabs overlay */}
      <div className="overlay-tabs">
        <div className={`otab ${tab==="following"?"active":""}`} onClick={()=>setTab("following")}>Following</div>
        <div className={`otab ${tab==="foryou"?"active":""}`} onClick={()=>setTab("foryou")}>For You</div>
        <div className={`otab ${tab==="liked"?"active":""}`} onClick={()=>setTab("liked")}>Liked</div>
      </div>

      {/* Video viewport */}
      <div className="videofeed-viewport">
        {currentVideo ? (
          <>
            <TwitterVideoPlayer
              key={currentVideo.id}
              video={currentVideo}
              videoUrl={currentVideo.url}
              autoPlayEnabled={true}
              liked={isLiked}
              onLike={toggleLike}
              onOpenComments={()=>setShowComments(true)}
            />

            <div className="info-overlay">
              <div className="author-row">
                <a href={`/profile/${currentVideo.user_id}`} className="author-link">
                  <img src={currentVideo.profiles?.avatar_url || "/default-avatar.png"} className="author-avatar"/>
                  <div className="author-meta">
                    <div className="author-name">@{currentVideo.profiles?.username}</div>
                    <div className="video-cat">{currentVideo.category}</div>
                  </div>
                </a>
                <button className={`follow-action ${isFollowing?"following":""}`} onClick={toggleFollow}>
                  {isFollowing?"Đang Follow":"Follow"}
                </button>
              </div>

              <div className="title-desc">
                <div className="video-title">{currentVideo.title}</div>
                <div className="video-desc">{currentVideo.description}</div>
              </div>

              <div className="bottom-stats">
                <span className={`like-count ${isLiked?"liked":""}`} onClick={toggleLike}>❤️ {likesCount}</span>
                <span className="comment-count" onClick={()=>setShowComments(true)}>💬 {commentsCount}</span>
              </div>
            </div>
          </>
        ) : <div className="empty-state">Không có video để hiển thị</div>}
      </div>

      {showComments && currentVideo && <CommentPanel video={currentVideo} onClose={()=>setShowComments(false)} />}

      <SearchPopup
        visible={searchOpen}
        onClose={()=>setSearchOpen(false)}
        onSearch={query => {
          searchQueryRef.current = query;
          if (!query.trim()) return;
          const pattern = `%${query}%`;
          supabase.from("videos").select("*, profiles:profiles(id,username,avatar_url)")
            .or(`title.ilike.${pattern},category.ilike.${pattern}`)
            .order("created_at",{ascending:false})
            .then(({data}) => { updateList(data); setTab("foryou"); });
        }}
        initial={searchQueryRef.current}
      />
    </div>
  );
}
