import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthService } from "./auth.service";

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    this.created(res, result);
  };

  verifyOtp = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken, message } = await this.authService.verifyOtp(req.body);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { message, user, accessToken });
  };

  resendOtp = async (req: Request, res: Response) => {
    const result = await this.authService.resendOtp(req.body);
    this.ok(res, result);
  };

  login = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await this.authService.login(req.body);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { user, accessToken });
  };

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.authService.forgotPassword(req.body);
    this.ok(res, result);
  };

  resetPassword = async (req: Request, res: Response) => {
    const result = await this.authService.resetPassword(req.body);
    this.ok(res, result);
  };

  refresh = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (!token) {
      res.status(401).json({
        status: "error",
        message: "No refresh token provided",
      });
      return;
    }

    const { user, accessToken, refreshToken } = await this.authService.refresh(token);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { user, accessToken });
  };

  logout = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    this.ok(res, { message: "Logged out successfully" });
  };

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
