// useFeedData.js
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function useFeedData() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // MAIN STATES
  const [tab, setTab] = useState("foryou");
  const [list, setList] = useState([]);
  const [index, setIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchQueryRef = useRef("");

  // Jump target
  const [jumpTarget, setJumpTarget] = useState({
    id: null,
    openComments: false,
  });

  // --------------------------------------
  // Helpers
  // --------------------------------------
  const normalizePhotoRow = (p) => {
    let urlVal = p.url;
    try {
      if (typeof urlVal === "string" && urlVal.trim().startsWith("[")) {
        const arr = JSON.parse(urlVal);
        if (Array.isArray(arr)) urlVal = arr;
      }
    } catch {}
    return { ...p, type: "photo", url: urlVal };
  };

  const updateList = (newList) => {
    if (!newList?.length) {
      setList([]);
      setIndex(0);
      return;
    }
    setList(newList);
    setIndex(0);
  };

  // --------------------------------------
  // Load feed items
  // --------------------------------------
  const fetchFeedItems = async ({ mode }) => {
    try {
      let vidQuery = supabase
        .from("videos")
        .select("*, profiles:profiles(id,username,avatar_url)");

      let photoQuery = supabase
        .from("photos")
        .select("*, profiles:profiles(id,username,avatar_url)");

      if (mode === "following") {
        if (!user) return updateList([]);

        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const ids = follows?.map((x) => x.following_id) || [];
        if (!ids.length) return updateList([]);

        vidQuery = vidQuery.in("user_id", ids);
        photoQuery = photoQuery.in("user_id", ids);
      }

      if (mode === "liked") {
        if (!user) return updateList([]);

        const { data: likes } = await supabase
          .from("likes")
          .select("video_id, photo_id")
          .eq("user_id", user.id);

        const videoIds = likes.map((x) => x.video_id).filter(Boolean);
        const photoIds = likes.map((x) => x.photo_id).filter(Boolean);

        const [vRes, pRes] = await Promise.all([
          videoIds.length
            ? supabase
                .from("videos")
                .select("*, profiles:profiles(id,username,avatar_url)")
                .in("id", videoIds)
            : { data: [] },
          photoIds.length
            ? supabase
                .from("photos")
                .select("*, profiles:profiles(id,username,avatar_url)")
                .in("id", photoIds)
            : { data: [] },
        ]);

        const videoItems = vRes.data.map((v) => ({ ...v, type: "video" }));
        const photoItems = pRes.data.map((p) => normalizePhotoRow(p));

        const merged = [...videoItems, ...photoItems].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        return updateList(merged);
      }

      const [vRes, pRes] = await Promise.all([
        vidQuery.order("created_at", { ascending: false }),
        photoQuery.order("created_at", { ascending: false }),
      ]);

      const videoItems = vRes.data.map((v) => ({ ...v, type: "video" }));
      const photoItems = pRes.data.map((p) => normalizePhotoRow(p));

      const merged = [...videoItems, ...photoItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      updateList(merged);
    } catch (err) {
      console.error("fetchFeedItems err:", err);
      updateList([]);
    }
  };

  // ----------------------------
  // TAB CHANGE
  // ----------------------------
  useEffect(() => {
    fetchFeedItems({ mode: tab });
  }, [tab, user]);

  // ----------------------------
  // set current video when index changes
  // ----------------------------
  useEffect(() => {
    setCurrentVideo(list[index]);
  }, [list, index]);

  // ----------------------------
  // openSearchPopup event
  // ----------------------------
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("openSearchPopup", handler);
    return () => window.removeEventListener("openSearchPopup", handler);
  }, []);

  // ----------------------------
  // Parse query params
  // ----------------------------
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vid = params.get("video");
    const openComments = params.get("openComments") === "true";

    if (vid) setJumpTarget({ id: vid, openComments });
    else setJumpTarget({ id: null, openComments: false });
  }, [location.search]);

  // ----------------------------
  // Jump to item if needed
  // ----------------------------
  useEffect(() => {
    const targetId = jumpTarget.id;
    if (!targetId || !list.length) return;

    const foundIndex = list.findIndex((v) => v.id === targetId);

    // FOUND IN LIST
    if (foundIndex !== -1) {
      setIndex(foundIndex);
      if (jumpTarget.openComments) setTimeout(() => {}, 180);
      navigate(location.pathname, { replace: true });
      return setJumpTarget({ id: null, openComments: false });
    }

    // FETCH SINGLE ITEM
    (async () => {
      try {
        let { data: vdata } = await supabase
          .from("videos")
          .select("*, profiles:profiles(id,username,avatar_url)")
          .eq("id", targetId)
          .maybeSingle();

        if (vdata) {
          setList((prev) => [
            { ...vdata, type: "video" },
            ...prev.filter((p) => p.id !== vdata.id),
          ]);
          setTimeout(() => setIndex(0), 160);
          return;
        }

        let { data: pdata } = await supabase
          .from("photos")
          .select("*, profiles:profiles(id,username,avatar_url)")
          .eq("id", targetId)
          .maybeSingle();

        if (pdata) {
          const item = normalizePhotoRow(pdata);
          setList((prev) => [item, ...prev]);
          setTimeout(() => setIndex(0), 160);
          return;
        }
      } catch (e) {}

      navigate(location.pathname, { replace: true });
      setJumpTarget({ id: null, openComments: false });
    })();
  }, [jumpTarget, list]);

  // ----------------------------
  // Load stats (likes/comments/follow)
  // ----------------------------
  const loadStats = async () => {
    if (!currentVideo?.id) return;

    const id = currentVideo.id;
    const idField = currentVideo.type === "video" ? "video_id" : "photo_id";

    try {
      const { data: lk } = await supabase
        .from("likes")
        .select("*")
        .eq(idField, id);

      setLikesCount(lk.length);

      const { data: cm } = await supabase
        .from("comments")
        .select("*")
        .eq(idField, id);

      setCommentsCount(cm.length);

      if (user) {
        const { data: my } = await supabase
          .from("likes")
          .select("*")
          .eq(idField, id)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsLiked(!!my);

        const { data: f } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("following_id", currentVideo.user_id)
          .maybeSingle();

        setIsFollowing(!!f);
      }
    } catch (err) {
      console.error("loadStats err", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [currentVideo, user]);

  // ----------------------------
  // NOTIFICATION
  // ----------------------------
  const createNotification = async (type) => {
    if (!currentVideo || !user) return;
    if (currentVideo.user_id === user.id) return;

    try {
      await supabase.from("notifications").insert([
        {
          user_id: currentVideo.user_id,
          from_user_id: user.id,
          video_id: currentVideo.type === "video" ? currentVideo.id : null,
          comment_id: null,
          type,
          is_read: false,
        },
      ]);
    } catch {}
  };

  // ----------------------------
  // LIKE TOGGLE
  // ----------------------------
  const toggleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập để like");

    const id = currentVideo.id;
    const idField = currentVideo.type === "video" ? "video_id" : "photo_id";

    try {
      if (!isLiked) {
        const obj = { user_id: user.id };
        obj[idField] = id;

        await supabase.from("likes").insert(obj);
        await createNotification("like");

        setLikesCount((x) => x + 1);
        setIsLiked(true);
      } else {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq(idField, id);

        setLikesCount((x) => Math.max(0, x - 1));
        setIsLiked(false);
      }
    } catch (err) {
      console.error("toggleLike err:", err);
    }
  };

  // ----------------------------
  // FOLLOW TOGGLE
  // ----------------------------
  const toggleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow");

    try {
      if (!isFollowing) {
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: currentVideo.user_id,
        });
        setIsFollowing(true);
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", currentVideo.user_id);
        setIsFollowing(false);
      }
    } catch (err) {
      console.error("toggleFollow err:", err);
    }
  };

  return {
    tab,
    setTab,
    list,
    index,
    setIndex,
    currentVideo,
    likesCount,
    commentsCount,
    isLiked,
    isFollowing,
    toggleLike,
    toggleFollow,
    searchOpen,
    setSearchOpen,
    searchQueryRef,
    updateList,
  };
}
