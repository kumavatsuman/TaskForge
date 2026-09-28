"use strict";
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");

  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }
}
/* ============================================================
   TASKFORGE
   renderer.js

   Handles:
   - Authentication
   - Session persistence
   - Dashboard
   - Task CRUD
   - Task filtering
   - Modals
   - Loading states
   - Error handling
   - Toast notifications
   ============================================================ */


/* ============================================================
   1. APPLICATION STATE
   ============================================================ */

const state = {
  currentUser: null,
  currentSession: null,

  tasks: [],

  currentPage: "dashboard",

  currentFilter: "all",

  editingTaskId: null,

  deletingTaskId: null,

  isLoadingTasks: false
};


/* ============================================================
   2. DOM ELEMENTS
   ============================================================ */

const elements = {
  loadingScreen: document.getElementById("loading-screen"),

  authSection: document.getElementById("auth-section"),
  appSection: document.getElementById("app-section"),

  signinView: document.getElementById("signin-view"),
  signupView: document.getElementById("signup-view"),

  signinForm: document.getElementById("signin-form"),
  signupForm: document.getElementById("signup-form"),

  signinButton: document.getElementById("signin-button"),
  signupButton: document.getElementById("signup-button"),

  showSignup: document.getElementById("show-signup"),
  showSignin: document.getElementById("show-signin"),

  dashboardPage: document.getElementById("dashboard-page"),
  tasksPage: document.getElementById("tasks-page"),

  navDashboard: document.getElementById("nav-dashboard"),
  navTasks: document.getElementById("nav-tasks"),

  pageEyebrow: document.getElementById("page-eyebrow"),
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),

  headerAddTask: document.getElementById("header-add-task"),
  quickAddTask: document.getElementById("quick-add-task"),
  emptyAddTask: document.getElementById("empty-add-task"),

  totalTasks: document.getElementById("total-tasks"),
  pendingTasks: document.getElementById("pending-tasks"),
  completedTasks: document.getElementById("completed-tasks"),
  completionRate: document.getElementById("completion-rate"),

  progressPercentage: document.getElementById("progress-percentage"),
  largeProgressBar: document.getElementById("large-progress-bar"),
  progressCompleted: document.getElementById("progress-completed"),
  progressRemaining: document.getElementById("progress-remaining"),

  recentTasksContainer:
    document.getElementById("recent-tasks-container"),

  viewAllTasks:
    document.getElementById("view-all-tasks"),

  taskCountLabel:
    document.getElementById("task-count-label"),

  tasksContainer:
    document.getElementById("tasks-container"),

  filterButtons:
    document.querySelectorAll(".filter-button"),

  sidebarAvatar:
    document.getElementById("sidebar-avatar"),

  sidebarUserName:
    document.getElementById("sidebar-user-name"),

  sidebarUserEmail:
    document.getElementById("sidebar-user-email"),

  logoutButton:
    document.getElementById("logout-button"),

  taskModal:
    document.getElementById("task-modal"),

  taskModalTitle:
    document.getElementById("task-modal-title"),

  taskForm:
    document.getElementById("task-form"),

  taskId:
    document.getElementById("task-id"),

  taskTitle:
    document.getElementById("task-title"),

  taskDescription:
    document.getElementById("task-description"),

  saveTaskButton:
    document.getElementById("save-task-button"),

  closeTaskModal:
    document.getElementById("close-task-modal"),

  cancelTask:
    document.getElementById("cancel-task"),

  deleteModal:
    document.getElementById("delete-modal"),

  cancelDelete:
    document.getElementById("cancel-delete"),

  confirmDelete:
    document.getElementById("confirm-delete"),

  toastContainer:
    document.getElementById("toast-container")
};


/* ============================================================
   3. APPLICATION STARTUP
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initializeApplication();
});


async function initializeApplication() {
  try {
    /*
     * Check whether the secure API from preload.js exists.
     *
     * This prevents a confusing:
     * "Cannot read properties of undefined"
     * error if preload.js has not loaded correctly.
     */

    if (!window.taskForge) {
      throw new Error(
        "TaskForge API is unavailable. Please restart the application."
      );
    }

    if (!window.taskForge.getSession) {
      throw new Error(
        "TaskForge authentication API is unavailable."
      );
    }

    setupEventListeners();

    /*
     * Ask Supabase whether a user is already authenticated.
     *
     * This provides authentication persistence.
     */

    const session = await window.taskForge.getSession();

    if (session && session.user) {
      await handleAuthenticatedSession(session);
    } else {
      showAuthentication();
    }

    /*
     * Listen for authentication changes.
     */

    window.taskForge.onAuthStateChange(
      async ({ event, session }) => {
        /*
         * Ignore events while the application is still
         * initializing to avoid unnecessary duplicate work.
         */

        if (event === "SIGNED_IN" && session) {
          await handleAuthenticatedSession(session);
        }

        if (event === "SIGNED_OUT") {
          handleSignedOut();
        }
      }
    );

  } catch (error) {
    console.error("Initialization error:", error);

    showAuthentication();

    showToast(
      "error",
      "Application Error",
      getErrorMessage(error)
    );
  } finally {
    hideLoadingScreen();
  }
}


/* ============================================================
   4. EVENT LISTENERS
   ============================================================ */

function setupEventListeners() {

  /* Authentication */

  elements.signinForm.addEventListener(
    "submit",
    handleSignIn
  );

  elements.signupForm.addEventListener(
    "submit",
    handleSignUp
  );

  elements.showSignup.addEventListener(
    "click",
    () => showAuthView("signup")
  );

  elements.showSignin.addEventListener(
    "click",
    () => showAuthView("signin")
  );


  /* Password visibility */

  document
    .querySelectorAll(".password-toggle")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const targetId =
          button.dataset.target;

        const input =
          document.getElementById(targetId);

        if (!input) {
          return;
        }

        if (input.type === "password") {
          input.type = "text";
          button.textContent = "Hide";
        } else {
          input.type = "password";
          button.textContent = "Show";
        }
      });

    });


  /* Navigation */

  elements.navDashboard.addEventListener(
    "click",
    () => switchPage("dashboard")
  );

  elements.navTasks.addEventListener(
    "click",
    () => switchPage("tasks")
  );


  /* Add task */

  elements.headerAddTask.addEventListener(
    "click",
    () => openCreateTaskModal()
  );

  elements.quickAddTask.addEventListener(
    "click",
    () => openCreateTaskModal()
  );

  elements.emptyAddTask.addEventListener(
    "click",
    () => openCreateTaskModal()
  );


  /* View all tasks */

  elements.viewAllTasks.addEventListener(
    "click",
    () => switchPage("tasks")
  );


  /* Task modal */

  elements.closeTaskModal.addEventListener(
    "click",
    closeTaskModal
  );

  elements.cancelTask.addEventListener(
    "click",
    closeTaskModal
  );

  elements.taskForm.addEventListener(
    "submit",
    handleTaskSubmit
  );


  /* Delete modal */

  elements.cancelDelete.addEventListener(
    "click",
    closeDeleteModal
  );

  elements.confirmDelete.addEventListener(
    "click",
    handleConfirmDelete
  );


  /* Filters */

  elements.filterButtons.forEach((button) => {

    button.addEventListener("click", () => {

      const filter =
        button.dataset.filter;

      state.currentFilter = filter;

      elements.filterButtons.forEach(
        (item) => item.classList.remove("active")
      );

      button.classList.add("active");

      renderTasks();
    });

  });


  /* Logout */

  elements.logoutButton.addEventListener(
    "click",
    handleLogout
  );


  /* Close modals when clicking outside */

  elements.taskModal.addEventListener(
    "click",
    (event) => {

      if (
        event.target === elements.taskModal
      ) {
        closeTaskModal();
      }

    }
  );

  elements.deleteModal.addEventListener(
    "click",
    (event) => {

      if (
        event.target === elements.deleteModal
      ) {
        closeDeleteModal();
      }

    }
  );


  /* Escape key closes modal */

  document.addEventListener(
    "keydown",
    (event) => {

      if (event.key !== "Escape") {
        return;
      }

      closeTaskModal();
      closeDeleteModal();

    }
  );
}


/* ============================================================
   5. AUTHENTICATION UI
   ============================================================ */

function showAuthentication() {

  elements.authSection.classList.remove("hidden");

  elements.appSection.classList.add("hidden");

  showAuthView("signin");
}


function showAuthView(view) {

  if (view === "signup") {

    elements.signinView.classList.add("hidden");

    elements.signupView.classList.remove("hidden");

    return;
  }

  elements.signupView.classList.add("hidden");

  elements.signinView.classList.remove("hidden");
}


/* ============================================================
   6. SIGN UP
   ============================================================ */

async function handleSignUp(event) {

  event.preventDefault();

  const email =
    document.getElementById("signup-email")
      .value
      .trim();

  const password =
    document.getElementById("signup-password")
      .value;

  const confirmPassword =
    document.getElementById("signup-confirm-password")
      .value;


  /* Basic validation */

  if (!email || !password || !confirmPassword) {

    showToast(
      "error",
      "Missing Information",
      "Please complete all fields."
    );

    return;
  }


  if (password.length < 6) {

    showToast(
      "error",
      "Password Too Short",
      "Your password must contain at least 6 characters."
    );

    return;
  }


  if (password !== confirmPassword) {

    showToast(
      "error",
      "Passwords Do Not Match",
      "Please make sure both passwords are the same."
    );

    return;
  }


  setButtonLoading(
    elements.signupButton,
    true
  );


  try {

    const data =
      await window.taskForge.signUp(
        email,
        password
      );


    /*
     * Supabase may require email confirmation.
     *
     * If a session exists immediately, the user can enter
     * the application.
     *
     * Otherwise, tell the user to confirm their email.
     */

    if (data && data.session) {

      showToast(
        "success",
        "Account Created",
        "Your account has been created successfully."
      );

      elements.signupForm.reset();

      await handleAuthenticatedSession(
        data.session
      );

    } else {

      showToast(
        "success",
        "Check Your Email",
        "Your account was created. Please confirm your email before signing in."
      );

      elements.signupForm.reset();

      showAuthView("signin");
    }

  } catch (error) {

    console.error("Sign up error:", error);

    showToast(
      "error",
      "Sign Up Failed",
      getErrorMessage(error)
    );

  } finally {

    setButtonLoading(
      elements.signupButton,
      false
    );
  }
}


/* ============================================================
   7. SIGN IN
   ============================================================ */

async function handleSignIn(event) {

  event.preventDefault();

  const email =
    document.getElementById("signin-email")
      .value
      .trim();

  const password =
    document.getElementById("signin-password")
      .value;


  if (!email || !password) {

    showToast(
      "error",
      "Missing Information",
      "Please enter your email and password."
    );

    return;
  }


  setButtonLoading(
    elements.signinButton,
    true
  );


  try {

    const data =
      await window.taskForge.signIn(
        email,
        password
      );


    if (!data || !data.session) {

      throw new Error(
        "Unable to create a login session."
      );
    }


    elements.signinForm.reset();

    await handleAuthenticatedSession(
      data.session
    );


    showToast(
      "success",
      "Welcome Back",
      "You have successfully signed in."
    );

  } catch (error) {

    console.error("Sign in error:", error);

    showToast(
      "error",
      "Sign In Failed",
      getErrorMessage(error)
    );

  } finally {

    setButtonLoading(
      elements.signinButton,
      false
    );
  }
}


/* ============================================================
   8. AUTHENTICATED SESSION
   ============================================================ */

async function handleAuthenticatedSession(session) {

  if (!session || !session.user) {
    showAuthentication();
    return;
  }


  state.currentSession = session;

  state.currentUser = session.user;


  /*
   * Show application.
   */

  elements.authSection.classList.add("hidden");

  elements.appSection.classList.remove("hidden");


  /*
   * Update user information.
   */

  updateUserInformation();


  /*
   * Load tasks from Supabase.
   */

  await loadTasks();


  /*
   * Always start on dashboard after login.
   */

  switchPage("dashboard");
}


/* ============================================================
   9. SIGN OUT
   ============================================================ */

function handleSignedOut() {

  state.currentUser = null;

  state.currentSession = null;

  state.tasks = [];

  state.editingTaskId = null;

  state.deletingTaskId = null;


  elements.appSection.classList.add("hidden");

  elements.authSection.classList.remove("hidden");


  elements.signinForm.reset();

  elements.signupForm.reset();


  showAuthView("signin");
}


async function handleLogout() {

  try {

    elements.logoutButton.disabled = true;

    await window.taskForge.signOut();

    handleSignedOut();

    showToast(
      "success",
      "Logged Out",
      "You have been safely signed out."
    );

  } catch (error) {

    console.error("Logout error:", error);

    showToast(
      "error",
      "Logout Failed",
      getErrorMessage(error)
    );

  } finally {

    elements.logoutButton.disabled = false;
  }
}


/* ============================================================
   10. USER INFORMATION
   ============================================================ */

function updateUserInformation() {

  if (!state.currentUser) {
    return;
  }


  const email =
    state.currentUser.email || "User";


  /*
   * Use the email as the displayed name.
   * Remove everything after @ for a cleaner appearance.
   */

  const displayName =
    email.includes("@")
      ? email.split("@")[0]
      : email;


  elements.sidebarUserName.textContent =
    capitalizeFirstLetter(displayName);


  elements.sidebarUserEmail.textContent =
    email;


  /*
   * Create avatar initials.
   */

  const firstLetter =
    displayName.charAt(0).toUpperCase() || "U";


  elements.sidebarAvatar.textContent =
    firstLetter;
}


/* ============================================================
   11. LOAD TASKS
   ============================================================ */

async function loadTasks() {

  if (state.isLoadingTasks) {
    return;
  }


  state.isLoadingTasks = true;


  try {

    /*
     * Show a simple loading message while fetching.
     */

    renderTaskLoadingState();


    const tasks =
      await window.taskForge.getTasks();


    state.tasks =
      Array.isArray(tasks)
        ? tasks
        : [];


    renderDashboard();

    renderTasks();

  } catch (error) {

    console.error("Load tasks error:", error);

    state.tasks = [];

    renderTaskErrorState();

    showToast(
      "error",
      "Could Not Load Tasks",
      getErrorMessage(error)
    );

  } finally {

    state.isLoadingTasks = false;
  }
}


/* ============================================================
   12. DASHBOARD RENDERING
   ============================================================ */

function renderDashboard() {

  const total =
    state.tasks.length;


  const completed =
    state.tasks.filter(
      (task) => task.is_done
    ).length;


  const pending =
    total - completed;


  const percentage =
    total === 0
      ? 0
      : Math.round(
          (completed / total) * 100
        );


  elements.totalTasks.textContent =
    total;


  elements.pendingTasks.textContent =
    pending;


  elements.completedTasks.textContent =
    completed;


  elements.completionRate.textContent =
    `${percentage}%`;


  elements.progressPercentage.textContent =
    `${percentage}%`;


  elements.largeProgressBar.style.width =
    `${percentage}%`;


  elements.progressCompleted.textContent =
    completed;


  elements.progressRemaining.textContent =
    pending;


  renderRecentTasks();
}


/* ============================================================
   13. RECENT TASKS
   ============================================================ */

function renderRecentTasks() {

  if (state.tasks.length === 0) {

    elements.recentTasksContainer.innerHTML = `
      <div class="empty-state small-empty">

        <div class="empty-icon">
          ✓
        </div>

        <h4>
          No tasks yet
        </h4>

        <p>
          Create your first task to get started.
        </p>

      </div>
    `;

    return;
  }


  const recentTasks =
    [...state.tasks]
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      )
      .slice(0, 5);


  elements.recentTasksContainer.innerHTML =
    recentTasks
      .map(
        (task) => `
          <div class="recent-task">

            <div class="recent-task-info">

              <div class="recent-task-title">
                ${escapeHtml(task.title)}
              </div>

              <div class="recent-task-date">
                ${formatDate(task.created_at)}
              </div>

            </div>

            <span
              class="recent-task-status ${
                task.is_done
                  ? "status-done"
                  : "status-pending"
              }"
            >
              ${
                task.is_done
                  ? "Completed"
                  : "Pending"
              }
            </span>

          </div>
        `
      )
      .join("");
}


/* ============================================================
   14. TASK LIST RENDERING
   ============================================================ */

function renderTasks() {

  const filteredTasks =
    getFilteredTasks();


  const count =
    filteredTasks.length;


  elements.taskCountLabel.textContent =
    `${count} ${
      count === 1
        ? "task"
        : "tasks"
    }`;


  if (filteredTasks.length === 0) {

    renderEmptyTasks();

    return;
  }


  elements.tasksContainer.innerHTML =
    filteredTasks
      .map(
        (task) =>
          createTaskCard(task)
      )
      .join("");


  /*
   * Add event listeners to dynamically generated task buttons.
   */

  document
    .querySelectorAll(".task-check")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const taskId =
            button.dataset.taskId;

          const task =
            findTask(taskId);

          if (task) {
            handleToggleTask(task);
          }

        }
      );

    });


  document
    .querySelectorAll(".edit-task-button")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const taskId =
            button.dataset.taskId;

          const task =
            findTask(taskId);

          if (task) {
            openEditTaskModal(task);
          }

        }
      );

    });


  document
    .querySelectorAll(".delete-task-button")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const taskId =
            button.dataset.taskId;

          openDeleteModal(taskId);

        }
      );

    });
}


/* ============================================================
   15. FILTER TASKS
   ============================================================ */

function getFilteredTasks() {

  if (state.currentFilter === "pending") {

    return state.tasks.filter(
      (task) => !task.is_done
    );
  }


  if (state.currentFilter === "completed") {

    return state.tasks.filter(
      (task) => task.is_done
    );
  }


  return state.tasks;
}


/* ============================================================
   16. CREATE TASK CARD
   ============================================================ */

function createTaskCard(task) {

  const completedClass =
    task.is_done
      ? "completed"
      : "";


  const statusClass =
    task.is_done
      ? "status-done"
      : "status-pending";


  const statusText =
    task.is_done
      ? "Completed"
      : "Pending";


  const description =
    task.description &&
    task.description.trim()
      ? escapeHtml(task.description)
      : "No description provided.";


  return `
    <article
      class="task-card ${completedClass}"
    >

      <button
        type="button"
        class="task-check"
        data-task-id="${escapeAttribute(task.id)}"
        title="${
          task.is_done
            ? "Mark as pending"
            : "Mark as completed"
        }"
        aria-label="${
          task.is_done
            ? "Mark as pending"
            : "Mark as completed"
        }"
      >
        ${
          task.is_done
            ? "✓"
            : ""
        }
      </button>


      <div class="task-content">

        <div class="task-title-row">

          <h3 class="task-title">
            ${escapeHtml(task.title)}
          </h3>

          <span
            class="task-status ${statusClass}"
          >
            ${statusText}
          </span>

        </div>


        <p class="task-description">
          ${description}
        </p>


        <div class="task-meta">

          <span>
            Created ${formatDate(task.created_at)}
          </span>

          ${
            task.updated_at &&
            task.updated_at !== task.created_at
              ? `
                <span>•</span>
                <span>
                  Updated ${formatDate(task.updated_at)}
                </span>
              `
              : ""
          }

        </div>

      </div>


      <div class="task-actions">

        <button
          type="button"
          class="task-action-button edit-task-button"
          data-task-id="${escapeAttribute(task.id)}"
          title="Edit task"
          aria-label="Edit task"
        >
          ✎
        </button>


        <button
          type="button"
          class="task-action-button delete delete-task-button"
          data-task-id="${escapeAttribute(task.id)}"
          title="Delete task"
          aria-label="Delete task"
        >
          ×
        </button>

      </div>

    </article>
  `;
}


/* ============================================================
   17. EMPTY TASK STATE
   ============================================================ */

function renderEmptyTasks() {

  let message =
    "Create a task to start organizing your work.";


  let title =
    "No tasks found";


  if (state.currentFilter === "pending") {

    title = "No pending tasks";

    message =
      "Great! You don't have any pending tasks.";
  }


  if (state.currentFilter === "completed") {

    title = "No completed tasks";

    message =
      "Complete a task and it will appear here.";
  }


  elements.tasksContainer.innerHTML = `
    <div class="empty-state">

      <div class="empty-icon">
        ✓
      </div>

      <h3>
        ${title}
      </h3>

      <p>
        ${message}
      </p>

      ${
        state.currentFilter === "all"
          ? `
            <button
              type="button"
              class="primary-button"
              id="dynamic-empty-add"
            >
              <span>+</span>
              Add Your First Task
            </button>
          `
          : ""
      }

    </div>
  `;


  const addButton =
    document.getElementById(
      "dynamic-empty-add"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      () => openCreateTaskModal()
    );
  }
}


/* ============================================================
   18. CREATE TASK
   ============================================================ */

function openCreateTaskModal() {

  state.editingTaskId = null;


  elements.taskModalTitle.textContent =
    "Create a new task";


  elements.taskId.value = "";

  elements.taskTitle.value = "";

  elements.taskDescription.value = "";


  setSaveButtonText(
    "Create Task"
  );


  elements.taskModal.classList.remove(
    "hidden"
  );


  setTimeout(() => {
    elements.taskTitle.focus();
  }, 50);
}


/* ============================================================
   19. EDIT TASK
   ============================================================ */

function openEditTaskModal(task) {

  state.editingTaskId =
    task.id;


  elements.taskModalTitle.textContent =
    "Edit task";


  elements.taskId.value =
    task.id;


  elements.taskTitle.value =
    task.title || "";


  elements.taskDescription.value =
    task.description || "";


  setSaveButtonText(
    "Save Changes"
  );


  elements.taskModal.classList.remove(
    "hidden"
  );


  setTimeout(() => {
    elements.taskTitle.focus();
  }, 50);
}


/* ============================================================
   20. CLOSE TASK MODAL
   ============================================================ */

function closeTaskModal() {

  elements.taskModal.classList.add(
    "hidden"
  );


  state.editingTaskId = null;


  elements.taskForm.reset();

  elements.taskId.value = "";

  setSaveButtonText(
    "Create Task"
  );
}


/* ============================================================
   21. SUBMIT TASK FORM
   ============================================================ */

async function handleTaskSubmit(event) {

  event.preventDefault();


  const title =
    elements.taskTitle.value.trim();


  const description =
    elements.taskDescription.value.trim();


  if (!title) {

    showToast(
      "error",
      "Title Required",
      "Please enter a title for your task."
    );

    elements.taskTitle.focus();

    return;
  }


  if (title.length > 120) {

    showToast(
      "error",
      "Title Too Long",
      "Task titles must be 120 characters or less."
    );

    return;
  }


  if (description.length > 1000) {

    showToast(
      "error",
      "Description Too Long",
      "Descriptions must be 1000 characters or less."
    );

    return;
  }


  setButtonLoading(
    elements.saveTaskButton,
    true
  );


  try {

    if (state.editingTaskId) {

      /*
       * UPDATE
       */

      await window.taskForge.updateTask(
        state.editingTaskId,
        title,
        description
      );


      showToast(
        "success",
        "Task Updated",
        "Your task has been updated successfully."
      );

    } else {

      /*
       * CREATE
       */

      await window.taskForge.createTask(
        title,
        description
      );


      showToast(
        "success",
        "Task Created",
        "Your new task has been added."
      );
    }


    closeTaskModal();

    await loadTasks();

  } catch (error) {

    console.error(
      "Save task error:",
      error
    );

    showToast(
      "error",
      state.editingTaskId
        ? "Could Not Update Task"
        : "Could Not Create Task",
      getErrorMessage(error)
    );

  } finally {

    setButtonLoading(
      elements.saveTaskButton,
      false
    );
  }
}


/* ============================================================
   22. TOGGLE TASK
   ============================================================ */

async function handleToggleTask(task) {

  try {

    const newStatus =
      !task.is_done;


    /*
     * Optimistic UI update.
     *
     * We update the local task first so the interface
     * feels immediate.
     */

    task.is_done =
      newStatus;


    renderDashboard();

    renderTasks();


    await window.taskForge.toggleTask(
      task.id,
      newStatus
    );


    showToast(
      "success",
      newStatus
        ? "Task Completed"
        : "Task Reopened",
      newStatus
        ? "Nice work! The task is now completed."
        : "The task has been moved back to pending."
    );

  } catch (error) {

    console.error(
      "Toggle task error:",
      error
    );


    /*
     * Revert optimistic change if Supabase failed.
     */

    task.is_done =
      !task.is_done;


    renderDashboard();

    renderTasks();


    showToast(
      "error",
      "Could Not Update Task",
      getErrorMessage(error)
    );
  }
}


/* ============================================================
   23. DELETE TASK
   ============================================================ */

function openDeleteModal(taskId) {

  state.deletingTaskId =
    taskId;


  elements.deleteModal.classList.remove(
    "hidden"
  );
}


function closeDeleteModal() {

  elements.deleteModal.classList.add(
    "hidden"
  );


  state.deletingTaskId = null;
}


async function handleConfirmDelete() {

  if (!state.deletingTaskId) {
    return;
  }


  const taskId =
    state.deletingTaskId;


  try {

    elements.confirmDelete.disabled =
      true;


    await window.taskForge.deleteTask(
      taskId
    );


    state.tasks =
      state.tasks.filter(
        (task) =>
          task.id !== taskId
      );


    closeDeleteModal();

    renderDashboard();

    renderTasks();


    showToast(
      "success",
      "Task Deleted",
      "The task has been permanently removed."
    );

  } catch (error) {

    console.error(
      "Delete task error:",
      error
    );


    showToast(
      "error",
      "Could Not Delete Task",
      getErrorMessage(error)
    );

  } finally {

    elements.confirmDelete.disabled =
      false;
  }
}


/* ============================================================
   24. PAGE NAVIGATION
   ============================================================ */

function switchPage(page) {

  state.currentPage =
    page;


  if (page === "dashboard") {

    elements.dashboardPage.classList.remove(
      "hidden"
    );

    elements.tasksPage.classList.add(
      "hidden"
    );


    elements.navDashboard.classList.add(
      "active"
    );

    elements.navTasks.classList.remove(
      "active"
    );


    elements.pageEyebrow.textContent =
      "OVERVIEW";


    elements.pageTitle.textContent =
      "Dashboard";


    elements.pageSubtitle.textContent =
      "Here's what's happening with your tasks.";


    return;
  }


  if (page === "tasks") {

    elements.dashboardPage.classList.add(
      "hidden"
    );

    elements.tasksPage.classList.remove(
      "hidden"
    );


    elements.navDashboard.classList.remove(
      "active"
    );

    elements.navTasks.classList.add(
      "active"
    );


    elements.pageEyebrow.textContent =
      "WORKSPACE";


    elements.pageTitle.textContent =
      "My Tasks";


    elements.pageSubtitle.textContent =
      "Create, organize, and complete your tasks.";


    renderTasks();
  }
}


/* ============================================================
   25. LOADING STATE
   ============================================================ */

function renderTaskLoadingState() {

  elements.tasksContainer.innerHTML = `
    <div class="empty-state">

      <div class="spinner"></div>

      <h3 style="margin-top: 18px;">
        Loading your tasks...
      </h3>

      <p>
        Connecting to your TaskForge workspace.
      </p>

    </div>
  `;
}


/* ============================================================
   26. ERROR STATE
   ============================================================ */

function renderTaskErrorState() {

  elements.tasksContainer.innerHTML = `
    <div class="empty-state">

      <div class="empty-icon">
        !
      </div>

      <h3>
        Could not load tasks
      </h3>

      <p>
        There was a problem connecting to your task database.
      </p>

      <button
        type="button"
        class="primary-button"
        id="retry-load-tasks"
      >
        Try Again
      </button>

    </div>
  `;


  const retryButton =
    document.getElementById(
      "retry-load-tasks"
    );


  if (retryButton) {

    retryButton.addEventListener(
      "click",
      () => loadTasks()
    );
  }
}


/* ============================================================
   27. BUTTON LOADING STATES
   ============================================================ */

function setButtonLoading(
  button,
  loading
) {

  if (!button) {
    return;
  }


  const text =
    button.querySelector(
      ".button-text"
    );


  const loader =
    button.querySelector(
      ".button-loader"
    );


  if (!text || !loader) {
    return;
  }


  if (loading) {

    button.disabled = true;

    text.classList.add(
      "hidden"
    );

    loader.classList.remove(
      "hidden"
    );

  } else {

    button.disabled = false;

    text.classList.remove(
      "hidden"
    );

    loader.classList.add(
      "hidden"
    );
  }
}


function setSaveButtonText(text) {

  const buttonText =
    elements.saveTaskButton.querySelector(
      ".button-text"
    );


  if (buttonText) {
    buttonText.textContent =
      text;
  }
}


/* ============================================================
   28. TOAST NOTIFICATIONS
   ============================================================ */

function showToast(
  type,
  title,
  message
) {

  const toast =
    document.createElement("div");


  toast.className =
    `toast ${type}`;


  const icon =
    type === "success"
      ? "✓"
      : type === "error"
        ? "!"
        : "i";


  toast.innerHTML = `
    <div class="toast-icon">
      ${icon}
    </div>

    <div class="toast-content">

      <div class="toast-title">
        ${escapeHtml(title)}
      </div>

      <div class="toast-message">
        ${escapeHtml(message)}
      </div>

    </div>

    <button
      type="button"
      class="toast-close"
      aria-label="Close notification"
    >
      ×
    </button>
  `;


  elements.toastContainer.appendChild(
    toast
  );


  const closeButton =
    toast.querySelector(
      ".toast-close"
    );


  closeButton.addEventListener(
    "click",
    () => removeToast(toast)
  );


  const timeout =
    setTimeout(
      () => removeToast(toast),
      5000
    );


  toast.dataset.timeout =
    timeout;
}


function removeToast(toast) {

  if (!toast) {
    return;
  }


  if (toast.dataset.timeout) {

    clearTimeout(
      Number(toast.dataset.timeout)
    );
  }


  toast.classList.add(
    "removing"
  );


  setTimeout(() => {

    if (toast.parentNode) {
      toast.parentNode.removeChild(
        toast
      );
    }

  }, 250);
}


/* ============================================================
   29. FIND TASK
   ============================================================ */

function findTask(taskId) {

  return state.tasks.find(
    (task) =>
      String(task.id) ===
      String(taskId)
  );
}


/* ============================================================
   30. DATE FORMATTING
   ============================================================ */

function formatDate(dateString) {

  if (!dateString) {
    return "Unknown date";
  }


  const date =
    new Date(dateString);


  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }


  const now =
    new Date();


  const difference =
    now.getTime() -
    date.getTime();


  const minute =
    60 * 1000;


  const hour =
    60 * minute;


  const day =
    24 * hour;


  if (difference < minute) {
    return "just now";
  }


  if (difference < hour) {

    const minutes =
      Math.floor(
        difference / minute
      );

    return `${minutes} ${
      minutes === 1
        ? "minute"
        : "minutes"
    } ago`;
  }


  if (difference < day) {

    const hours =
      Math.floor(
        difference / hour
      );

    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    } ago`;
  }


  if (difference < 7 * day) {

    const days =
      Math.floor(
        difference / day
      );

    return `${days} ${
      days === 1
        ? "day"
        : "days"
    } ago`;
  }


  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}


/* ============================================================
   31. HTML SECURITY HELPERS
   ============================================================ */

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }


  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

  return escapeHtml(value);
}


/* ============================================================
   32. ERROR HANDLING
   ============================================================ */

function getErrorMessage(error) {

  if (!error) {
    return "An unknown error occurred.";
  }


  if (typeof error === "string") {
    return error;
  }


  if (error.message) {
    return error.message;
  }


  return "Something went wrong. Please try again.";
}


/* ============================================================
   33. TEXT HELPERS
   ============================================================ */

function capitalizeFirstLetter(value) {

  if (!value) {
    return "";
  }


  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}