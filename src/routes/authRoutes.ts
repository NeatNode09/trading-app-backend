import express from "express"
import { registerUser, loginUser, secureToken } from "../controllers/authController"
import { verifyOtp } from "../controllers/verifyController"
import { resendOtp } from "../controllers/resendOtpController"



const router = express.Router()

router.post("/register", registerUser)
router.post("/verify-otp", verifyOtp)
router.post("/login", loginUser)
router.post("/resend-otp", resendOtp)
router.post("/secure-token", secureToken)


export default router;