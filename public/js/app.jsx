// React-based UI (rendered via Babel in the browser)

const apiTasksUrl = "/api/tasks";
const apiPracticesUrl = "/api/practices";

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");
  toastEl.setAttribute("data-bs-delay", "2000");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

const { useState, useEffect } = React;

function applySidebarCollapseSetting() {
  const stored = localStorage.getItem("sidebarCollapsed");
  if (stored === "true") {
    document.body.classList.add("sidebar-collapse");
  }
}

function setupSidebarPersistence() {
  document.addEventListener("collapsed.lte.pushmenu", () => {
    localStorage.setItem("sidebarCollapsed", "true");
  });
  document.addEventListener("shown.lte.pushmenu", () => {
    localStorage.setItem("sidebarCollapsed", "false");
  });
}

function App() {
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [practices, setPractices] = useState([]);
  const [taskFilter, setTaskFilter] = useState("");
  const [practiceFilter, setPracticeFilter] = useState("");

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");

  const [taskModalData, setTaskModalData] = useState({ id: null, title: "" });
  const [practiceModalData, setPracticeModalData] = useState({
    id: null,
    practiceName: "",
    practiceNumber: "",
    notes: "",
    contactPerson: "",
    contactNumber: "",
    active: true,
  });
  const [authModalData, setAuthModalData] = useState({ username: "", password: "" });

  useEffect(() => {
    applySidebarCollapseSetting();
    setupSidebarPersistence();

    // Setup bootstrap modal objects for later use
    window.taskModal = new bootstrap.Modal(document.getElementById("taskModal"));
    window.practiceModal = new bootstrap.Modal(document.getElementById("practiceModal"));
    window.authModal = new bootstrap.Modal(document.getElementById("authModal"));

    if (token) {
      fetchMe();
    }

    fetchTasks();
    fetchPractices();
  }, []);

  function authHeaders() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchMe() {
    try {
      const res = await fetch("/api/auth/me", { headers: authHeaders() });
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
    }
  }

  function openAuthModal(mode) {
    setAuthMode(mode);
    setAuthMessage("");
    setAuthModalData({ username: "", password: "" });
    window.authModal.show();
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    showToast("Logged out", "warning");
  }

  async function handleAuth() {
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authModalData),
    });

    const data = await res.json();
    if (!res.ok) {
      setAuthMessage(data.error || "Authentication failed");
      return;
    }

    setToken(data.token);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    setAuthMessage("");
    window.authModal.hide();
    showToast(`Logged in as ${data.user.username}`);
    fetchTasks();
    fetchPractices();
  }

  async function fetchTasks() {
    const res = await fetch(apiTasksUrl, { headers: authHeaders() });
    const data = await res.json();
    setTasks(data);
  }

  async function fetchPractices() {
    const res = await fetch(apiPracticesUrl, { headers: authHeaders() });
    const data = await res.json();
    setPractices(data);
  }

  function filteredTasks() {
    return tasks.filter((task) => task.title.toLowerCase().includes(taskFilter.toLowerCase()));
  }

  function filteredPractices() {
    const query = practiceFilter.toLowerCase();
    return practices.filter((p) =>
      [p.practiceName, p.practiceNumber, p.notes, p.contactPerson, p.contactNumber]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  async function createTask(title) {
    await fetch(apiTasksUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ title }),
    });
    showToast("Task created");
    fetchTasks();
  }

  async function updateTask(task) {
    await fetch(`${apiTasksUrl}/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(task),
    });
    showToast("Task updated");
    fetchTasks();
  }

  async function deleteTask(id) {
    await fetch(`${apiTasksUrl}/${id}`, { method: "DELETE", headers: authHeaders() });
    showToast("Task deleted", "warning");
    fetchTasks();
  }

  function openTaskModal(task) {
    if (task) {
      setTaskModalData({ id: task.id, title: task.title });
    } else {
      setTaskModalData({ id: null, title: "" });
    }
    window.taskModal.show();
  }

  function saveTaskModal() {
    const title = taskModalData.title.trim();
    if (!title) return;

    if (taskModalData.id) {
      updateTask({ id: taskModalData.id, title, completed: false });
    } else {
      createTask(title);
    }

    window.taskModal.hide();
  }

  async function createPractice(practice) {
    await fetch(apiPracticesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(practice),
    });
    showToast("Practice created");
    fetchPractices();
  }

  async function updatePractice(practice) {
    await fetch(`${apiPracticesUrl}/${practice.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(practice),
    });
    showToast("Practice updated");
    fetchPractices();
  }

  async function deletePractice(id) {
    await fetch(`${apiPracticesUrl}/${id}`, { method: "DELETE", headers: authHeaders() });
    showToast("Practice deleted", "warning");
    fetchPractices();
  }

  function openPracticeModal(practice) {
    if (practice) {
      setPracticeModalData({
        id: practice.id,
        practiceName: practice.practiceName,
        practiceNumber: practice.practiceNumber,
        notes: practice.notes,
        contactPerson: practice.contactPerson,
        contactNumber: practice.contactNumber,
        active: practice.active ?? true,
      });
    } else {
      setPracticeModalData({
        id: null,
        practiceName: "",
        practiceNumber: "",
        notes: "",
        contactPerson: "",
        contactNumber: "",
        active: true,
      });
    }

    window.practiceModal.show();
  }

  function savePracticeModal() {
    const payload = {
      practiceName: practiceModalData.practiceName.trim(),
      practiceNumber: practiceModalData.practiceNumber.trim(),
      notes: practiceModalData.notes.trim(),
      contactPerson: practiceModalData.contactPerson.trim(),
      contactNumber: practiceModalData.contactNumber.trim(),
      active: !!practiceModalData.active,
    };

    if (!payload.practiceName) return;

    if (practiceModalData.id) {
      updatePractice({ id: practiceModalData.id, ...payload });
    } else {
      createPractice(payload);
    }

    window.practiceModal.hide();
  }

  return (
    <div className="content">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header p-2 d-flex justify-content-between align-items-center">
                <ul className="nav nav-pills">
                  <li className="nav-item">
                    <a
                      className={`nav-link ${activeTab === "tasks" ? "active" : ""}`}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("tasks");
                      }}
                    >
                      <i className="fas fa-list me-1"></i>
                      Tasks
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className={`nav-link ${activeTab === "practices" ? "active" : ""}`}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("practices");
                      }}
                    >
                      <i className="fas fa-briefcase me-1"></i>
                      Practices
                    </a>
                  </li>
                </ul>

                <div>
                  {user ? (
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success">{user.username}</span>
                      <button className="btn btn-sm btn-outline-light" onClick={logout}>
                        Logout
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-sm btn-primary" onClick={() => openAuthModal("login")}>Login</button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {activeTab === "tasks" ? (
                  <TasksTab
                    tasks={filteredTasks()}
                    onFilter={setTaskFilter}
                    onCreate={createTask}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onRefresh={fetchTasks}
                    openModal={openTaskModal}
                    openEdit={openTaskModal}
                  />
                ) : (
                  <PracticesTab
                    practices={filteredPractices()}
                    onFilter={setPracticeFilter}
                    onCreate={createPractice}
                    onUpdate={updatePractice}
                    onDelete={deletePractice}
                    onRefresh={fetchPractices}
                    openModal={openPracticeModal}
                    openEdit={openPracticeModal}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaskModal
        data={taskModalData}
        setData={setTaskModalData}
        onSave={saveTaskModal}
      />
      <PracticeModal
        data={practiceModalData}
        setData={setPracticeModalData}
        onSave={savePracticeModal}
      />
      <AuthModal
        mode={authMode}
        data={authModalData}
        setData={setAuthModalData}
        message={authMessage}
        onSubmit={handleAuth}
        onSwitchMode={() => setAuthMode(authMode === "login" ? "register" : "login")}
      />
    </div>
  );
}

function TaskModal({ data, setData, onSave }) {
  return (
    <div className="modal fade" id="taskModal" tabIndex="-1" aria-labelledby="taskModalLabel" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="taskModalLabel">
              {data.id ? "Edit Task" : "New Task"}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Title</label>
              <input
                className="form-control"
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PracticeModal({ data, setData, onSave }) {
  return (
    <div className="modal fade" id="practiceModal" tabIndex="-1" aria-labelledby="practiceModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="practiceModalLabel">
              {data.id ? "Edit Practice" : "New Practice"}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Practice name</label>
                <input
                  className="form-control"
                  value={data.practiceName}
                  onChange={(e) => setData({ ...data, practiceName: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Practice number</label>
                <input
                  className="form-control"
                  value={data.practiceNumber}
                  onChange={(e) => setData({ ...data, practiceNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-md-6">
                <label className="form-label">Contact person</label>
                <input
                  className="form-control"
                  value={data.contactPerson}
                  onChange={(e) => setData({ ...data, contactPerson: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Contact number</label>
                <input
                  className="form-control"
                  value={data.contactNumber}
                  onChange={(e) => setData({ ...data, contactNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="form-check form-switch mt-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="practiceActiveSwitch"
                checked={data.active}
                onChange={(e) => setData({ ...data, active: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="practiceActiveSwitch">
                Active
              </label>
            </div>

            <div className="mt-2">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ mode, data, setData, message, onSubmit, onSwitchMode }) {
  const title = mode === "register" ? "Register" : "Login";
  const submitLabel = mode === "register" ? "Create account" : "Sign in";

  return (
    <div className="modal fade" id="authModal" tabIndex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="authModalLabel">
              {title}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {message ? <div className="alert alert-danger">{message}</div> : null}
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                className="form-control"
                value={data.username}
                onChange={(e) => setData({ ...data, username: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
              />
            </div>
            <div className="text-end">
              <button className="btn btn-link" onClick={onSwitchMode} type="button">
                {mode === "register" ? "Already have an account? Login" : "Need an account? Register"}
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onSubmit}>
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksTab({ tasks, onFilter, onCreate, onUpdate, onDelete, onRefresh, openModal, openEdit }) {
  const [newTitle, setNewTitle] = useState("");

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="input-group flex-grow-1">
          <span className="input-group-text">
            <i className="fas fa-plus"></i>
          </span>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="form-control"
            placeholder="New task title"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!newTitle.trim()) return;
              onCreate(newTitle.trim());
              setNewTitle("");
            }}
          >
            Add
          </button>
        </div>
        <button className="btn btn-secondary" onClick={() => openModal(null)}>
          <i className="fas fa-plus me-1"></i>New task
        </button>
        <button className="btn btn-secondary" onClick={onRefresh}>
          <i className="fas fa-sync-alt me-1"></i>Refresh
        </button>
      </div>

      <div className="mb-3">
        <input
          className="form-control"
          placeholder="Search tasks"
          onChange={(e) => onFilter(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              <th>Title</th>
              <th className="text-center">Completed</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <span style={{ textDecoration: task.completed ? "line-through" : "none" }}>
                    {task.title}
                  </span>
                </td>
                <td className="text-center">
                  {task.completed ? <i className="fas fa-check text-success"></i> : <i className="fas fa-times text-muted"></i>}
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-success me-1"
                    title="Toggle complete"
                    onClick={() => onUpdate({ ...task, completed: !task.completed })}
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-info me-1"
                    title="Edit"
                    onClick={() => openEdit(task)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    title="Delete"
                    onClick={() => {
                      if (window.confirm("Delete this task?")) onDelete(task.id);
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PracticesTab({ practices, onFilter, onUpdate, onDelete, onRefresh, openModal, openEdit }) {
  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="flex-grow-1"></div>
        <button className="btn btn-secondary" onClick={() => openModal(null)}>
          <i className="fas fa-plus me-1"></i>
          New practice
        </button>
        <button className="btn btn-secondary" onClick={onRefresh}>
          <i className="fas fa-sync-alt me-1"></i>
          Refresh
        </button>
      </div>

      <div className="mb-3">
        <input
          className="form-control"
          placeholder="Search practices"
          onChange={(e) => onFilter(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          <i className="fas fa-sync-alt me-1"></i>
          Refresh
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              <th>Practice</th>
              <th>Practice #</th>
              <th>Contact person</th>
              <th>Contact number</th>
              <th className="text-center">Active</th>
              <th>Notes</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {practices.map((practice) => (
              <tr key={practice.id}>
                <td>
                  <strong>{practice.practiceName}</strong>
                </td>
                <td>
                  <small className="text-muted">{practice.practiceNumber || "—"}</small>
                </td>
                <td>{practice.contactPerson || "—"}</td>
                <td>
                  <small className="text-muted">{practice.contactNumber || "—"}</small>
                </td>
                <td className="text-center">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={practice.active}
                      onChange={() => onUpdate({ ...practice, active: !practice.active })}
                    />
                  </div>
                </td>
                <td>{practice.notes || "—"}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-info me-1"
                    title="Edit"
                    onClick={() => openEdit(practice)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    title="Delete"
                    onClick={() => {
                      if (window.confirm("Delete this practice?")) onDelete(practice.id);
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
