
import { Response } from 'express';


export const setRefreshCookie = (res: Response, token: string, maxAgeMs: number): void => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('refreshToken', token, {
        httpOnly: true, // 🛑 CRITICAL: Prevents JavaScript access (XSS defense)
        secure: isProduction, // 🛑 CRITICAL: Only send over HTTPS in production
        sameSite: 'strict',   // CSRF defense
        maxAge: maxAgeMs,     // Cookie expiration time
        // The cookie should ONLY be sent to the refresh endpoint by the browser
        path: '/api/auth/refresh',
    });
};