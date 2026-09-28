const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taskForge", {
  // Authentication
  getSession: () => ipcRenderer.invoke("auth:get-session"),

  onAuthStateChange: (callback) => {
    const listener = (_event, session) => {
      callback(session);
    };

    ipcRenderer.on("auth:state-changed", listener);

    return () => {
      ipcRenderer.removeListener("auth:state-changed", listener);
    };
  },

  signUp: (email, password) =>
    ipcRenderer.invoke("auth:sign-up", { email, password }),

  signIn: (email, password) =>
    ipcRenderer.invoke("auth:sign-in", { email, password }),

  signOut: () =>
    ipcRenderer.invoke("auth:sign-out"),

  // Tasks
  getTasks: () =>
    ipcRenderer.invoke("tasks:get-all"),

  createTask: (title, description) =>
    ipcRenderer.invoke("tasks:create", {
      title,
      description
    }),

  updateTask: (taskId, title, description) =>
    ipcRenderer.invoke("tasks:update", {
      taskId,
      title,
      description
    }),

  toggleTask: (taskId, isDone) =>
    ipcRenderer.invoke("tasks:toggle", {
      taskId,
      isDone
    }),

  deleteTask: (taskId) =>
    ipcRenderer.invoke("tasks:delete", {
      taskId
    })
});