import { Request } from "express";
import { IUser } from "../models/User.model.js";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface AuthRequest extends Request {
  user?: IUser;
}