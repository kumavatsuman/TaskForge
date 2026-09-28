const {
  app,
  BrowserWindow,
  ipcMain
} = require("electron");

const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sessionFile = path.join(
  app.getPath("userData"),
  "taskforge-session.json"
);

function loadStoredSession() {
  try {
    if (!fs.existsSync(sessionFile)) {
      return null;
    }

    const saved = fs.readFileSync(sessionFile, "utf8");

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("Could not load stored session:", error);
    return null;
  }
}

function saveStoredSession(session) {
  try {
    fs.mkdirSync(path.dirname(sessionFile), {
      recursive: true
    });

    fs.writeFileSync(
      sessionFile,
      JSON.stringify(session),
      "utf8"
    );
  } catch (error) {
    console.error("Could not save session:", error);
  }
}

function clearStoredSession() {
  try {
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
  } catch (error) {
    console.error("Could not clear stored session:", error);
  }
}

// ============================================================
// SUPABASE CONFIG
// ============================================================

const SUPABASE_URL= "https://xcsxayibyaexqxepejkq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ilVQG3VVjKTp1-Uji00W1Q_NOElNpf_";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

// Keep track of the currently signed-in user
let currentUser = null;

// ============================================================
// CREATE WINDOW
// ============================================================

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");

  return win;
}

let mainWindow;

// ============================================================
// ELECTRON READY
// ============================================================

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

// Close app when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ============================================================
// AUTHENTICATION
// ============================================================

// Get current session
ipcMain.handle("auth:get-session", async () => {
  const storedSession = loadStoredSession();

  if (storedSession) {
    const { data, error } = await supabase.auth.setSession({
      access_token: storedSession.access_token,
      refresh_token: storedSession.refresh_token
    });

    if (!error && data.session) {
      currentUser = data.session.user;
      saveStoredSession(data.session);
      return data.session;
    }

    clearStoredSession();
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  currentUser = data.session?.user || null;

  if (data.session) {
    saveStoredSession(data.session);
  }

  return data.session;
});

// Sign up
ipcMain.handle("auth:sign-up", async (_event, { email, password }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
  currentUser = data.user;
}

if (data.session) {
  saveStoredSession(data.session);
}

  return {
    user: data.user,
    session: data.session
  };
});

// Sign in
ipcMain.handle("auth:sign-in", async (_event, { email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(error.message);
  }

  currentUser = data.user;

  if (data.session) {
    saveStoredSession(data.session);
  }

  return {
    user: data.user,
    session: data.session
  };
});

// Sign out
ipcMain.handle("auth:sign-out", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  currentUser = null;
  clearStoredSession();

  return true;
});

// Listen for Supabase auth changes
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "auth:state-changed",
      {
        event,
        session
      }
    );
  }
});
// ============================================================
// TASK HELPERS
// ============================================================

function requireUser() {
  if (!currentUser) {
    throw new Error("You must be signed in.");
  }

  return currentUser;
}

// ============================================================
// GET TASKS
// ============================================================

ipcMain.handle("tasks:get-all", async () => {
  const user = requireUser();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

// ============================================================
// CREATE TASK
// ============================================================

ipcMain.handle(
  "tasks:create",
  async (_event, { title, description }) => {
    const user = requireUser();

    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();

    if (!cleanTitle) {
      throw new Error("Task title is required.");
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: cleanTitle,
        description: cleanDescription,
        is_done: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
);

// ============================================================
// UPDATE TASK
// ============================================================

ipcMain.handle(
  "tasks:update",
  async (_event, { taskId, title, description }) => {
    const user = requireUser();

    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();

    if (!cleanTitle) {
      throw new Error("Task title is required.");
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: cleanTitle,
        description: cleanDescription
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
);

// ============================================================
// TOGGLE TASK
// ============================================================

ipcMain.handle(
  "tasks:toggle",
  async (_event, { taskId, isDone }) => {
    const user = requireUser();

    const { data, error } = await supabase
      .from("tasks")
      .update({
        is_done: Boolean(isDone)
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
);

// ============================================================
// DELETE TASK
// ============================================================

ipcMain.handle(
  "tasks:delete",
  async (_event, { taskId }) => {
    const user = requireUser();

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }
);