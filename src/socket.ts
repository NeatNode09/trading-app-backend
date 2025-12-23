// src/socket.ts - MODIFIED CODE

import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { JwtUser } from "./types/types"; // Assuming this is updated

export let io: IOServer | null = null;
const PREMIUM_CHAT_ROOM = "premium_chat"; // Define a consistent room name

export function initSocket(server: any) {
  io = new IOServer(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));

      const user = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser;


      if (user.subscription_plan !== 'monthly' && user.subscription_plan !== 'yearly' && user.subscription_plan !== 'premium') {
        // Refuse the connection with a specific error message
        return next(new Error("Subscription required: Only Premium users can access the chat."));
      }
      
      (socket as any).user = user;
      return next();
      
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as JwtUser;
    console.log(`User connected: ${user.email} (${user.subscription_plan})`);

    // ********************************************************
    // *** STEP 2: IMMEDIATELY JOIN THEM TO THE CHAT ROOM ***
    // ********************************************************
    socket.join(PREMIUM_CHAT_ROOM);
    console.log(`User ${user.email} joined the ${PREMIUM_CHAT_ROOM} room.`);


    // --- Other Chat Logic ---
    
    // 1. Handle incoming chat messages
    socket.on('send_chat_message', (messagePayload: { text: string }) => {
        
        const message = {
            senderId: user.user_id,
            senderEmail: user.email,
            text: messagePayload.text,
            timestamp: new Date().toISOString()
        };
        
        // Broadcast the message to EVERYONE ELSE in the PREMIUM_CHAT_ROOM
        socket.to(PREMIUM_CHAT_ROOM).emit('new_chat_message', message);
        
        // Optional: Send the message back to the sender for confirmation
        // socket.emit('message_sent_success', message); 
    });


    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.email}`);
      // No need to explicitly leave the room, Socket.IO does this automatically
    });
  });

  return io;
}