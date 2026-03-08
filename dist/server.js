"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.WEB_PORT) || 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve the frontend static files
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
// Simple SQLite DB (file-based)
const db = new better_sqlite3_1.default(path_1.default.join(__dirname, "../data.db"));
// Initialize schema
db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  )`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS practices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practiceName TEXT NOT NULL,
    practiceNumber TEXT,
    notes TEXT,
    contactPerson TEXT,
    contactNumber TEXT,
    active INTEGER NOT NULL DEFAULT 1
  )`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL
  )`).run();
// Ensure `active` column exists for older databases
try {
    db.prepare("ALTER TABLE practices ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
}
catch (e) {
    // SQLite throws if column already exists; ignore
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
function createToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: "7d",
    });
}
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}
app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY id DESC").all();
    res.json(tasks.map((t) => ({
        id: t.id,
        title: t.title,
        completed: Boolean(t.completed),
    })));
});
app.get("/api/practices", (req, res) => {
    const practices = db.prepare("SELECT * FROM practices ORDER BY id DESC").all();
    res.json(practices.map((p) => ({
        id: p.id,
        practiceName: p.practiceName,
        practiceNumber: p.practiceNumber,
        notes: p.notes,
        contactPerson: p.contactPerson,
        contactNumber: p.contactNumber,
        active: Boolean(p.active),
    })));
});
app.post("/api/practices", (req, res) => {
    const { practiceName, practiceNumber, notes, contactPerson, contactNumber, active, } = req.body;
    if (!practiceName || typeof practiceName !== "string") {
        return res.status(400).json({ error: "Practice name is required" });
    }
    const normalizedName = practiceName.trim().toUpperCase();
    const info = db
        .prepare("INSERT INTO practices (practiceName, practiceNumber, notes, contactPerson, contactNumber, active) VALUES (?, ?, ?, ?, ?, ?)")
        .run(normalizedName, practiceNumber?.trim() || "", notes?.trim() || "", contactPerson?.trim() || "", contactNumber?.trim() || "", active === false ? 0 : 1);
    res.status(201).json({
        id: info.lastInsertRowid,
        practiceName: normalizedName,
        practiceNumber: practiceNumber?.trim() || "",
        notes: notes?.trim() || "",
        contactPerson: contactPerson?.trim() || "",
        contactNumber: contactNumber?.trim() || "",
        active: active !== false,
    });
});
app.put("/api/practices/:id", (req, res) => {
    const id = Number(req.params.id);
    const { practiceName, practiceNumber, notes, contactPerson, contactNumber, active, } = req.body;
    if (!id || !practiceName) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    const normalizedName = practiceName.trim().toUpperCase();
    db.prepare("UPDATE practices SET practiceName = ?, practiceNumber = ?, notes = ?, contactPerson = ?, contactNumber = ?, active = ? WHERE id = ?").run(normalizedName, practiceNumber?.trim() || "", notes?.trim() || "", contactPerson?.trim() || "", contactNumber?.trim() || "", active === false ? 0 : 1, id);
    res.json({
        id,
        practiceName: normalizedName,
        practiceNumber: practiceNumber?.trim() || "",
        notes: notes?.trim() || "",
        contactPerson: contactPerson?.trim() || "",
        contactNumber: contactNumber?.trim() || "",
        active: active !== false,
    });
});
app.delete("/api/practices/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!id) {
        return res.status(400).json({ error: "Invalid id" });
    }
    db.prepare("DELETE FROM practices WHERE id = ?").run(id);
    res.json({ success: true });
});
app.post("/api/tasks", (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
    }
    const info = db
        .prepare("INSERT INTO tasks (title, completed) VALUES (?, 0)")
        .run(title.trim());
    res.status(201).json({ id: info.lastInsertRowid, title: title.trim(), completed: false });
});
app.put("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const { title, completed } = req.body;
    if (!id || (!title && typeof completed !== "boolean")) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    db.prepare("UPDATE tasks SET title = ?, completed = ? WHERE id = ?").run(title ?? "", completed ? 1 : 0, id);
    res.json({ id, title, completed });
});
app.delete("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!id) {
        return res.status(400).json({ error: "Invalid id" });
    }
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ success: true });
});
app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "username and password are required" });
    }
    const normalizedUsername = username.trim().toLowerCase();
    const existing = db
        .prepare("SELECT id FROM users WHERE username = ?")
        .get(normalizedUsername);
    if (existing) {
        return res.status(400).json({ error: "User already exists" });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const info = db
        .prepare("INSERT INTO users (username, passwordHash) VALUES (?, ?)")
        .run(normalizedUsername, passwordHash);
    const user = { id: Number(info.lastInsertRowid), username: normalizedUsername };
    return res.status(201).json({ user, token: createToken(user) });
});
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "username and password are required" });
    }
    const normalizedUsername = username.trim().toLowerCase();
    const userRow = db
        .prepare("SELECT id, passwordHash FROM users WHERE username = ?")
        .get(normalizedUsername);
    if (!userRow) {
        return res.status(400).json({ error: "Invalid credentials" });
    }
    const match = await bcryptjs_1.default.compare(password, userRow.passwordHash);
    if (!match) {
        return res.status(400).json({ error: "Invalid credentials" });
    }
    const user = { id: userRow.id, username: normalizedUsername };
    return res.json({ user, token: createToken(user) });
});
app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = req.user;
    res.json({ user });
});
app.get("/ping", (req, res) => {
    res.send("pong");
});
app.listen(port, () => {
    console.log(`⚡️[adminlte-ts-crud]: Server is running at http://localhost:${port}`);
});
