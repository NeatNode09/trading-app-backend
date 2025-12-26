import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { initSocket } from "./socket";

import { pool } from "./config/db";
import { env } from "./config/env";
import forgotPasswordRoute from "./routes/forgotRoutes";
import authRoute from "./routes/authRoutes"
import adminSignalRoute from "./routes/adminSignals";
import signalRoute from "./routes/signalRoutes";
import userRoute from "./routes/userRoutes";
import adminDashboardRoute from "./routes/adminDashboardRoutes";
import announcement from "./routes/announcementsRoutes";
import subscriptionVerifyRoute from "./routes/subscriptionVerificationRoutes";
import adminSubscriptionRoutes from "./routes/subscriptionRoutes";
import resultRoutes from "./routes/ResultRoutes";

dotenv.config();
export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads",express.static("uploads"));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", forgotPasswordRoute)
app.use("/api/auth", authRoute)
app.use("/api/admin", adminSignalRoute);
app.use("/api", signalRoute);
app.use("/api", userRoute);
app.use("/api/admin/dashboard", adminDashboardRoute)
app.use("/api/admin/dashboard", adminSubscriptionRoutes);
app.use("/api/admin/dashboard", resultRoutes);
app.use("/api", announcement);
app.use("/api", subscriptionVerifyRoute);

const server = http.createServer(app);

// initialize socket.io
initSocket(server);

// Basic test route
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ message: "Database connected!", time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
