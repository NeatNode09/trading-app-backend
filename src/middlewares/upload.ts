import { avatarUpload } from "../config/multer/avatar.multer";
import { chatImageUpload } from "../config/multer/chateImage.multer";
import { chatVideoUpload } from "../config/multer/chateVideo.multer";
import { learningVideoUpload } from "../config/multer/learningVideo.multer";

export const uploadAvatar = avatarUpload.single("avatar");
export const uploadChatImage = chatImageUpload.single("image");
export const uploadChatVideo = chatVideoUpload.single("video");
export const uploadLearningVideo = learningVideoUpload.single("video");