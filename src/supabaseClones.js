// src/supabaseClones.js
import { createClient } from "@supabase/supabase-js";

// Clone 1
export const supabaseClone1 = createClient(
  "https://sppxjyflrqyogzvxhcni.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcHhqeWZscnF5b2d6dnhoY25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTY3OTksImV4cCI6MjA3ODc5Mjc5OX0.x_U9Cjj0nCM3Lp0_y_n-XiyQ76oxmE_7KBGKHQyWhvQ"
);

// Clone 2
export const supabaseClone2 = createClient(
  "https://wgiimcfvuhmephjhnjjt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdndyZWNxa3NvemdpbW9vdHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Mzg0MjUsImV4cCI6MjA3OTAxNDQyNX0.5oo4f_KJNzvoPmHsZojKbBPGPcynLoOFL57rJ_9d1uc"
);

// Tên bucket giống nhau
export const CLONE_BUCKET = "videoss";
